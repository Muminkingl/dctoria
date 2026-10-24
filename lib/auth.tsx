import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { supabase } from '@/lib/supabase';
import { queryClient } from '@/lib/query-client';

WebBrowser.maybeCompleteAuthSession();
const RETURN_KEY = 'dctoria:auth-return';
const AuthContext = createContext<{
  session: Session | null;
  loading: boolean;
  signIn: (provider: 'google' | 'apple', returnTo: string) => Promise<string | null>;
  signOut: () => Promise<void>;
} | null>(null);

export function safeReturnPath(path?: string | null) {
  return path === '/profile' || /^\/providers\/[0-9a-f-]{36}(\?rate=1)?$/i.test(path ?? '') ? path! : '/profile';
}

export async function consumeAuthReturn() {
  const path = await AsyncStorage.getItem(RETURN_KEY);
  await AsyncStorage.removeItem(RETURN_KEY);
  return safeReturnPath(path);
}

// A callback can be observed by both the native auth browser and the router.
// Exchange each one-use PKCE code once, even across those two observers.
const exchanges = new Map<string, Promise<string>>();
export function exchangeAuthCode(code: string) {
  if (!exchanges.has(code)) {
    const promise = supabase.auth.exchangeCodeForSession(code).then(async ({ error }) => { if (error) throw error; return consumeAuthReturn(); });
    exchanges.set(code, promise);
    void promise.finally(() => { setTimeout(() => exchanges.delete(code), 60_000); }).catch(() => {});
  }
  return exchanges.get(code)!;
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, next) => {
      if (alive) { setSession(next); setLoading(false); }
    });
    void supabase.auth.getSession().then(({ data }) => {
      if (alive) { setSession(data.session); setLoading(false); }
    }).catch(() => { if (alive) setLoading(false); });
    const app = AppState.addEventListener('change', state => {
      if (Platform.OS !== 'web') {
        if (state === 'active') supabase.auth.startAutoRefresh();
        else supabase.auth.stopAutoRefresh();
      }
    });
    if (Platform.OS !== 'web' && AppState.currentState === 'active') supabase.auth.startAutoRefresh();
    return () => { alive = false; subscription.unsubscribe(); app.remove(); if (Platform.OS !== 'web') supabase.auth.stopAutoRefresh(); };
  }, []);

  const signIn = useCallback(async (provider: 'google' | 'apple', returnTo: string) => {
    const settings = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY! }, signal: AbortSignal.timeout(10_000),
    });
    if (!settings.ok || !(await settings.json()).external?.[provider]) throw new Error('Sign-in is currently unavailable.');
    await AsyncStorage.setItem(RETURN_KEY, safeReturnPath(returnTo));
    if (provider === 'apple' && Platform.OS === 'ios' && await AppleAuthentication.isAvailableAsync()) {
      const nonce = Crypto.randomUUID();
      const hashed = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, nonce);
      let credential;
      try {
        credential = await AppleAuthentication.signInAsync({ requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL], nonce: hashed });
      } catch (error) {
        if ((error as { code?: string }).code === 'ERR_REQUEST_CANCELED') return null;
        throw error;
      }
      if (!credential.identityToken) throw new Error('Apple sign-in was not completed.');
      const result = await supabase.auth.signInWithIdToken({ provider: 'apple', token: credential.identityToken, nonce });
      if (result.error) throw result.error;
      if (credential.fullName) {
        const fullName = AppleAuthentication.formatFullName(credential.fullName);
        if (fullName.trim()) await supabase.auth.updateUser({ data: { full_name: fullName } });
      }
      return consumeAuthReturn();
    }
    const redirectTo = makeRedirectUri({ scheme: 'dctoria', path: 'auth/callback' });
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider, options: { redirectTo, skipBrowserRedirect: true, ...(provider === 'google' ? { queryParams: { prompt: 'select_account' } } : {}) },
    });
    if (error || !data.url) throw error ?? new Error('Sign-in is unavailable.');
    if (Platform.OS === 'web') { window.location.assign(data.url); return null; }
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type !== 'success') return null;
    const callback = new URL(result.url);
    const code = callback.searchParams.get('code');
    if (!code || callback.searchParams.has('error')) throw new Error('Sign-in was not completed.');
    return exchangeAuthCode(code);
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) throw error;
    queryClient.removeQueries({ queryKey: ['my-rating'] });
  }, []);
  const value = useMemo(() => ({ session, loading, signIn, signOut }), [session, loading, signIn, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth requires AuthProvider');
  return value;
}

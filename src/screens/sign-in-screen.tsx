import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { HeartPulse, LockKeyhole, Sparkles } from 'lucide-react-native';
import { PageShell } from '@/components/account/page-shell';
import { AppleMark, GoogleMark } from '@/components/account/brand-icons';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { safeReturnPath, useAuth } from '@/lib/auth';
import { isProviderId } from '@/lib/use-directory';

export default function SignInScreen() {
  const { reason, providerId } = useLocalSearchParams<{ reason?: string; providerId?: string }>();
  const { session, signIn } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState<'google' | 'apple' | null>(null);
  const [error, setError] = useState('');
  const returnTo = providerId && isProviderId(providerId) ? `/providers/${providerId}?rate=1` : '/profile';
  useEffect(() => { if (session) router.dismissTo(safeReturnPath(returnTo) as '/profile'); }, [session, router, returnTo]);
  if (session) return null;
  async function start(provider: 'google' | 'apple') {
    setError(''); setBusy(provider);
    try {
      const target = await signIn(provider, returnTo);
      if (target) router.dismissTo(target as '/profile');
    } catch { setError('خزمەتگوزاریی چوونەژوورەوە لە ئێستادا بەردەست نییە. تکایە دووبارە هەوڵ بدەوە.'); }
    finally { setBusy(null); }
  }
  return <PageShell title="چوونەژوورەوە">
    <View className="items-center pb-8 pt-5">
      <LinearGradient colors={['#28b7d5', '#1387ae']} style={{ width: 105, height: 105, borderRadius: 34, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-7deg' }], boxShadow: '0 14px 35px rgba(21,154,196,.20)' }}><HeartPulse size={57} strokeWidth={1.35} color="white" /></LinearGradient>
      <View className="mt-8 flex-row-reverse items-center gap-2"><Sparkles size={16} color="#33a8c5" /><Text className="font-app-medium text-[12px] text-[#3999b1]">بەخێربێیت بۆ دکتۆریا</Text></View>
      <Text className="mt-3 text-center font-app-bold text-[27px] leading-[44px] text-[#2d5266]">{reason === 'rating' ? 'بۆ هەڵسەنگاندن،\nبچۆ ژوورەوە' : 'هەنگاوێک نزیکتر،\nبۆ تەندروستیی باشتر'}</Text>
      <Text className="mt-3 text-center font-app text-[12px] leading-7 text-[#8ca2af]">{reason === 'rating' ? 'هێشتا نەچوویتەتە ژوورەوە. بە هەژمارەکەت بەردەوام بە بۆ تۆمارکردنی هەڵسەنگاندنەکەت.' : 'بە هەژماری Google یان Apple بەردەوام بە.\nگەڕان لە دکتۆریا هەمیشە ئازادە.'}</Text>
    </View>
    <View className="gap-3 rounded-[29px] border border-[#e6eef2] bg-white p-5">
      <Button variant="outline" disabled={busy !== null} onPress={() => void start('google')} className="h-14 flex-row items-center justify-center gap-3 rounded-2xl border-[#e2e9ed] bg-white">
        {busy === 'google' ? <ActivityIndicator color="#168bac" /> : <GoogleMark />}<Text className="font-app-medium text-[13px] text-[#416273]">بەردەوامبوون بە Google</Text>
      </Button>
      {Platform.OS === 'ios' ? <View pointerEvents={busy ? 'none' : 'auto'}>
        <AppleAuthentication.AppleAuthenticationButton buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE} buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK} cornerRadius={16} style={{ width: '100%', height: 56 }} onPress={() => { if (!busy) void start('apple'); }} />
        {busy === 'apple' && <View pointerEvents="none" className="absolute inset-0 items-center justify-center rounded-2xl bg-black"><ActivityIndicator color="white" /></View>}
      </View> : <Button disabled={busy !== null} onPress={() => void start('apple')} className="h-14 flex-row items-center justify-center gap-3 rounded-2xl bg-[#1e2c33]">
        {busy === 'apple' ? <ActivityIndicator color="white" /> : <AppleMark />}<Text className="font-app-medium text-[13px] text-white">بەردەوامبوون بە Apple</Text>
      </Button>}
      {!!error && <Text role="alert" className="mt-1 text-center font-app text-[11px] leading-6 text-destructive">{error}</Text>}
    </View>
    <View className="mt-6 flex-row-reverse items-center justify-center gap-1.5"><LockKeyhole size={12} color="#9eb2bd" /><Text className="font-app text-[10px] text-[#a0b2bc]">بە پارێزراوی و بەبێ وشەی نهێنی</Text></View>
  </PageShell>;
}

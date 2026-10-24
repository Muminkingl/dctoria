import '../../global.css';

import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PortalHost } from '@rn-primitives/portal';
import { useFonts } from 'expo-font';
import { Vazirmatn_400Regular } from '@expo-google-fonts/vazirmatn/400Regular';
import { Vazirmatn_500Medium } from '@expo-google-fonts/vazirmatn/500Medium';
import { Vazirmatn_600SemiBold } from '@expo-google-fonts/vazirmatn/600SemiBold';
import { Vazirmatn_700Bold } from '@expo-google-fonts/vazirmatn/700Bold';
import { NAV_THEME } from '@/lib/theme';
import { FavoritesProvider } from '@/lib/use-favorites';
import { AuthProvider } from '@/lib/auth';
import { focusManager, QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/query-client';

void SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [loaded, error] = useFonts({ Vazirmatn_400Regular, Vazirmatn_500Medium, Vazirmatn_600SemiBold, Vazirmatn_700Bold });

  useEffect(() => {
    if (loaded || error) void SplashScreen.hideAsync();
  }, [loaded, error]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const app = AppState.addEventListener('change', state => focusManager.setFocused(state === 'active'));
    return () => app.remove();
  }, []);

  if (!loaded && !error) return null;

  return (
    <ThemeProvider value={NAV_THEME.light}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}><AuthProvider><FavoritesProvider>
          <StatusBar style="light" />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#f7fafb' } }} />
          <PortalHost />
        </FavoritesProvider></AuthProvider></QueryClientProvider>
      </SafeAreaProvider>
    </ThemeProvider>
  );
}

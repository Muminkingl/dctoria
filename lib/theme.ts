import { DefaultTheme } from 'expo-router';

// Brand colors shared with global.css. NativeWind resolves the semantic
// CSS variables on Android, iOS, and web; these values serve non-CSS APIs.
export const THEME = {
  light: {
    background: '#f7fafb',
    foreground: '#1e3543',
    card: '#ffffff',
    primary: '#159ac4',
    primaryForeground: '#ffffff',
    popover: '#ffffff',
    popoverForeground: '#1e3543',
    secondary: '#eaf7fb',
    secondaryForeground: '#1281a0',
    muted: '#eff3f5',
    border: '#e5edf2',
    mutedForeground: '#7c8b9a',
    accent: '#eaf7fb',
    accentForeground: '#1281a0',
    destructive: '#dc2626',
    destructiveForeground: '#ffffff',
    input: '#e5edf2',
    ring: '#159ac4',
    radius: 16,
  },
} as const;

export const NAV_THEME = {
  light: {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: THEME.light.background,
      card: THEME.light.card,
      primary: THEME.light.primary,
      text: THEME.light.foreground,
      border: THEME.light.border,
      notification: THEME.light.destructive,
    },
  },
};

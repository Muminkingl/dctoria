import type { PropsWithChildren } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { Text } from '@/components/ui/text';

export function PageShell({ title, children }: PropsWithChildren<{ title: string }>) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return <View style={styles.page}>
    <StatusBar style="dark" />
    <View style={styles.phone}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="گەڕانەوە" onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={styles.back}><ArrowLeft size={20} color="#426776" /></Pressable>
        <Text className="font-app-semibold text-[14px] text-[#365666]">{title}</Text>
        <View style={{ width: 42 }} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: Math.max(insets.bottom, 24) }}>{children}</ScrollView>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#e8f0f3', alignItems: 'center', ...Platform.select({ native: { direction: 'ltr' as const } }) },
  phone: { flex: 1, width: '100%', maxWidth: 480, backgroundColor: '#f7fafb' },
  header: { paddingHorizontal: 22, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { height: 42, width: 42, borderRadius: 15, backgroundColor: 'white', borderWidth: 1, borderColor: '#e5edf1', alignItems: 'center', justifyContent: 'center' },
});

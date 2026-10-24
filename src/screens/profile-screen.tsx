import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import { ChevronLeft, HeartPulse, LogOut, ShieldCheck, UserRound } from 'lucide-react-native';
import { PageShell } from '@/components/account/page-shell';
import { WhatsAppMark } from '@/components/account/brand-icons';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { useAuth } from '@/lib/auth';

export default function ProfileScreen() {
  const { session, loading, signOut } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [failedAvatar, setFailedAvatar] = useState<string | null>(null);
  const user = session?.user;
  const name = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'بەکارهێنەر';
  const avatar = user?.user_metadata?.avatar_url || user?.user_metadata?.picture;
  return <PageShell title="پرۆفایل">
    <LinearGradient colors={['#e2f3f9', '#f4fafc']} style={{ padding: 28, borderRadius: 30, alignItems: 'center', overflow: 'hidden' }}>
      <View className="absolute -right-12 -top-14 h-48 w-48 rounded-full border-[25px] border-white/40" />
      <View className="mb-5 h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-[#d5edf5]">
        {loading ? <ActivityIndicator color="#159ac4" /> : user && typeof avatar === 'string' && avatar.startsWith('https://') && failedAvatar !== avatar
          ? <Image source={{ uri: avatar }} accessibilityLabel="وێنەی پرۆفایل" onError={() => setFailedAvatar(avatar)} style={{ width: '100%', height: '100%' }} />
          : <UserRound size={42} color="#6dabc0" strokeWidth={1.3} />}
      </View>
      <Text className="text-center font-app-bold text-[23px] leading-9 text-[#2e5366]">{user ? String(name) : 'بەخێربێیت بۆ دکتۆریا'}</Text>
      <View className="mt-2 flex-row-reverse items-center gap-1.5">{user && <ShieldCheck size={14} color="#29a582" />}<Text className="font-app text-[11px] text-[#7b9aa8]">{user ? 'هەژمارەکەت بەستراوەتەوە' : 'هاوڕێی تەندروستیت، هەر کات و هەر شوێنێک'}</Text></View>
    </LinearGradient>

    {!user && !loading && <Card className="mt-6 gap-3 rounded-[25px] border-[#e6eef1] bg-white p-5 shadow-none">
      <View className="flex-row-reverse items-center gap-2"><HeartPulse size={20} color="#159ac4" /><Text className="font-app-bold text-[15px] text-[#36596b]">هەژمارێکی بچووک، کاریگەرییەکی گەورە</Text></View>
      <Text className="text-right font-app text-[12px] leading-7 text-[#839aa7]">بە ئازادی بگەڕێ. بۆ هەڵسەنگاندن و بەشداریکردن لە ئەزموونەکەت، بچۆ ژوورەوە.</Text>
      <Button onPress={() => router.push('/sign-in')} className="mt-1 h-12 rounded-2xl"><Text className="font-app-semibold text-[13px]">چوونەژوورەوە</Text></Button>
    </Card>}

    <Text className="mb-3 mt-8 text-right font-app-bold text-[15px] text-[#36596b]">لە پەیوەندیدا بین</Text>
    <Pressable accessibilityRole="link" accessibilityLabel="پەیوەندیمان پێوە بکە لە واتساپ" onPress={() => { setError(''); void Linking.openURL('https://wa.me/9647510201840?text=' + encodeURIComponent('سڵاو، دەمەوێت زانیاریی خزمەتگوزارییەکەم لە دکتۆریا زیاد بکەم.')).catch(() => setError('نەتوانرا واتساپ بکرێتەوە؛ دووبارە هەوڵ بدەوە.')); }} className="flex-row-reverse items-center gap-3 rounded-[23px] border border-[#e4eee9] bg-white p-4">
      <View className="h-12 w-12 items-center justify-center rounded-2xl bg-[#eaf8f1]"><WhatsAppMark /></View>
      <View className="flex-1 items-end"><Text className="font-app-semibold text-[13px] text-[#375e51]">پەیوەندیمان پێوە بکە</Text><Text className="mt-1 font-app text-[10px] text-[#95aaa1]">بۆ زیادکردنی شوێن و خزمەتگوزارییەکانت</Text></View><ChevronLeft size={18} color="#a2b8af" />
    </Pressable>
    {user && <Button variant="ghost" disabled={busy} className="mt-5 h-12 flex-row-reverse gap-2 rounded-2xl" onPress={() => { setBusy(true); setError(''); void signOut().catch(() => setError('نەتوانرا بچیتە دەرەوە؛ دووبارە هەوڵ بدەوە.')).finally(() => setBusy(false)); }}><LogOut size={17} color="#bf7e7e" /><Text className="font-app text-[12px] text-[#bf7e7e]">چوونەدەرەوە</Text></Button>}
    {!!error && <Text role="alert" className="mt-4 text-center font-app text-xs text-destructive">{error}</Text>}
    <Text className="mt-9 text-center font-app text-[10px] text-[#b0bdc4]">دکتۆریا • هاوڕێی تەندروستیت</Text>
  </PageShell>;
}

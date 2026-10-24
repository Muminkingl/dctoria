import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { exchangeAuthCode } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';

export default function AuthCallback() {
  const { code, error } = useLocalSearchParams<{ code?: string; error?: string }>();
  const router = useRouter();
  const started = useRef(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    async function finish() {
      try {
        if (!code || error) throw new Error('Invalid callback');
        const target = await exchangeAuthCode(code);
        router.dismissTo(target as '/profile');
      } catch { setFailed(true); }
    }
    void finish();
  }, [code, error, router]);
  return <View className="flex-1 items-center justify-center gap-5 bg-[#f7fafb] px-8">{failed ? <><Text className="text-center font-app text-sm">داخڵبوون تەواو نەبوو. تکایە دووبارە هەوڵ بدەوە.</Text><Button onPress={() => router.replace('/sign-in')} className="rounded-2xl"><Text className="font-app">گەڕانەوە</Text></Button></> : <><ActivityIndicator color="#159ac4" /><Text className="font-app text-sm text-muted-foreground">هەژمارەکەت دەبەسترێتەوە…</Text></>}</View>;
}

import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Star } from 'lucide-react-native';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { queryClient } from '@/lib/query-client';

export function RatingCard({ providerId }: { providerId: string }) {
  const { session, loading } = useAuth();
  const router = useRouter();
  const [chosen, setChosen] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);
  const current = useQuery({
    queryKey: ['my-rating', session?.user.id, providerId], enabled: !!session,
    queryFn: async ({ signal }) => {
      const { data, error } = await supabase.from('ratings').select('score').eq('provider_id', providerId).eq('user_id', session!.user.id).abortSignal(signal).maybeSingle();
      if (error) throw error;
      return (data?.score as number | undefined) ?? 0;
    },
  });
  const mutation = useMutation({
    mutationFn: async (score: number) => {
      const { error } = await supabase.rpc('rate_provider', { p_provider_id: providerId, p_score: score });
      if (error) throw error;
    },
    onSuccess: async () => {
      setSaved(true);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['my-rating', session?.user.id, providerId] }),
        queryClient.invalidateQueries({ queryKey: ['provider', providerId] }),
        queryClient.invalidateQueries({ queryKey: ['directory'] }),
      ]);
    },
  });
  const score = chosen ?? current.data ?? 0;
  const signIn = () => router.push({ pathname: '/sign-in', params: { reason: 'rating', providerId } });
  return <Card className="mt-7 gap-3 rounded-[24px] border-[#e4edf1] bg-white p-5 shadow-none">
    <Text className="text-right font-app-bold text-[15px] text-[#35596c]">ئەزموونەکەت چۆن بوو؟</Text>
    <Text className="text-right font-app text-[11px] leading-6 text-[#8ba0ab]">هەڵسەنگاندنەکەت یارمەتیی کەسانی تر دەدات.</Text>
    <View className="flex-row items-center justify-center gap-3 py-2">{[1, 2, 3, 4, 5].map(star => <Pressable key={star} accessibilityRole="button" accessibilityLabel={`${star} ئەستێرە`} accessibilityState={{ selected: score === star, disabled: mutation.isPending || loading }} disabled={mutation.isPending || loading} onPress={() => { if (!session) { signIn(); return; } setChosen(star); setSaved(false); }} hitSlop={5} className="p-1"><Star size={30} color={star <= score ? '#e9b45c' : '#dbe5ea'} fill={star <= score ? '#f4ca7c' : 'transparent'} strokeWidth={1.5} /></Pressable>)}</View>
    <Button disabled={loading || mutation.isPending || (!!session && (!score || current.isPending || current.isError))} variant={session ? 'default' : 'secondary'} className="h-11 rounded-2xl" onPress={() => session ? mutation.mutate(score) : signIn()}><Text className="font-app-semibold text-[12px]">{mutation.isPending ? 'تۆمار دەکرێت…' : session ? saved ? 'سوپاس، هەڵسەنگاندنەکەت تۆمار کرا' : current.data ? 'نوێکردنەوەی هەڵسەنگاندن' : 'تۆمارکردنی هەڵسەنگاندن' : 'بچۆ ژوورەوە بۆ هەڵسەنگاندن'}</Text></Button>
    {(mutation.isError || current.isError) && <Text role="alert" className="text-center font-app text-[10px] text-destructive">نەتوانرا هەڵسەنگاندنەکە تۆمار بکرێت. دووبارە هەوڵ بدەوە.</Text>}
  </Card>;
}

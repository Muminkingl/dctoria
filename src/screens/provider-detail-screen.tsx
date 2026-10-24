import { useCallback, useEffect, useRef, type ComponentRef } from 'react';
import { ActivityIndicator, FlatList, Image, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Check, Heart, Hospital, MapPin, Sparkles, Star, Stethoscope } from 'lucide-react-native';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { ProviderAvatar } from '@/components/home/provider-card';
import { ViewOnMap } from '@/components/watermelon/view-on-map';
import { useFavorites } from '@/lib/use-favorites';
import { isProviderId, useProvider } from '@/lib/use-directory';
import { RatingCard } from '@/components/directory/rating-card';
import { useAuth } from '@/lib/auth';

export default function ProviderDetailScreen() {
  const { id, rate } = useLocalSearchParams<{ id: string | string[]; rate?: string }>();
  const providerId = (Array.isArray(id) ? id[0] : id) ?? '';
  const detail = useProvider(providerId);
  const provider = detail.data;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const mapY = useRef(0);
  const ratingY = useRef<number | null>(null);
  const { session } = useAuth();
  const { favorites, toggleFavorite } = useFavorites();
  const revealMap = useCallback(() => {
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: Math.max(0, mapY.current - 18), animated: true }));
  }, []);
  const revealRating = useCallback(() => {
    if (rate !== '1' || !session || ratingY.current === null) return;
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: Math.max(0, ratingY.current! - 20), animated: true }));
    router.setParams({ rate: undefined });
  }, [rate, session, router]);
  useEffect(revealRating, [revealRating, detail.data]);

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }

  if (detail.isPending && isProviderId(providerId)) {
    return <View style={[styles.page, { justifyContent: 'center' }]}><ActivityIndicator color="#159ac4" /></View>;
  }
  if (detail.isError) {
    return <View style={[styles.page, { justifyContent: 'center', padding: 24, gap: 16 }]}><Text className="text-center font-app text-sm">نەتوانرا زانیارییەکان بار بکرێن.</Text><Button onPress={() => void detail.refetch()}><Text className="font-app">دووبارە هەوڵ بدەوە</Text></Button><Button variant="ghost" onPress={goBack}><Text className="font-app">گەڕانەوە</Text></Button></View>;
  }
  if (!provider) {
    return <View style={[styles.page, { justifyContent: 'center', padding: 24 }]}><Text className="mb-5 text-center font-app-semibold text-lg">زانیارییەکان نەدۆزرانەوە</Text><Button onPress={goBack}><Text className="font-app">گەڕانەوە</Text></Button></View>;
  }

  const hospital = provider.category === 'hospitals';
  const doctor = provider.category === 'doctors';
  const favorite = favorites.includes(provider.id);
  const accent = hospital ? '#17a38c' : provider.color;
  const title = hospital ? 'زانیاریی نەخۆشخانە' : doctor ? 'پرۆفایلی پزیشک' : 'زانیاریی خزمەتگوزاری';
  const serviceLabels = provider.services;
  const mapQuery = provider.latitude !== null && provider.longitude !== null
    ? `${provider.latitude},${provider.longitude}` : `${provider.address}, ${provider.city}, Iraq`;

  return (
    <View style={styles.page}>
      <StatusBar style="dark" />
      <View style={styles.phone}>
        <View style={[styles.toolbar, { paddingTop: insets.top + 12 }]}>
          <Pressable accessibilityRole="button" accessibilityLabel="گەڕانەوە" onPress={goBack} style={styles.toolbarButton}><ArrowLeft size={20} color="#426776" /></Pressable>
          <Text className="font-app-semibold text-[14px] text-[#365666]">{title}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={favorite ? 'لابردن لە پاشەکەوتکراوەکان' : 'پاشەکەوتکردن'} aria-pressed={favorite} onPress={() => toggleFavorite(provider.id)} style={styles.toolbarButton}><Heart size={19} color={favorite ? '#e48087' : '#8ca4ae'} fill={favorite ? '#e48087' : 'transparent'} /></Pressable>
        </View>

        <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 10, paddingBottom: 26 }}>
          <LinearGradient colors={hospital ? ['#e9f7f0', '#f5fbf8'] : ['#e7f4fb', '#f2f9fc']} style={styles.hero}>
            <View style={styles.heroDecoration} />
            <View className="mb-4 rounded-[30px] border border-white bg-white/80 p-1.5">
              {hospital && !provider.photoUrl ? <View style={[styles.hospitalAvatar, { backgroundColor: provider.background }]}><Hospital size={44} strokeWidth={1.4} color={accent} /></View> : <ProviderAvatar provider={provider} large />}
            </View>
            <Text className="text-center font-app-bold text-[22px] leading-9 text-[#25485b]">{provider.name}</Text>
            <Text className="mt-1 text-center font-app text-[12px] leading-6 text-[#7893a2]">{provider.specialty}</Text>
            <View className="mt-3 flex-row-reverse items-center gap-1.5 rounded-full border border-white bg-white/80 px-3 py-1.5"><View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: provider.available ? '#25ac83' : '#a0adb4' }} /><Text className="font-app text-[10px] text-[#5c897d]">{provider.available ? 'بەردەستە بۆ ڕاوێژ' : 'لە ئێستادا بەردەست نییە'}</Text></View>
          </LinearGradient>

          {provider.photos.length > 1 && <FlatList horizontal data={provider.photos} keyExtractor={photo => photo.id} initialNumToRender={3} maxToRenderPerBatch={3} windowSize={3} showsHorizontalScrollIndicator={false} style={{ height: 139, flexGrow: 0 }} contentContainerStyle={{ paddingTop: 14 }} ItemSeparatorComponent={() => <View style={{ width: 10 }} />} getItemLayout={(_, index) => ({ length: 190, offset: 190 * index, index })} renderItem={({ item: photo }) => <Image source={{ uri: photo.url }} accessibilityLabel={photo.caption || provider.name} style={{ width: 180, height: 125, borderRadius: 18, backgroundColor: '#e5eef2' }} />} />}

          <Card className="mb-6 mt-4 flex-row-reverse items-center justify-between gap-0 rounded-[22px] border-[#e7eef1] bg-white px-3 py-4 shadow-none">
            <View className="flex-1 items-center"><View className="flex-row items-center gap-1"><Star size={13} fill="#eab95f" color="#eab95f" /><Text className="font-app-bold text-[20px] text-[#365b6c]">{provider.rating}</Text></View><Text className="mt-1 font-app text-[9px] text-[#8ba0ac]">هەڵسەنگاندن</Text></View>
            <View className="h-8 w-px bg-[#eef2f4]" />
            <View className="flex-1 items-center"><Text className="font-app-bold text-[20px] text-[#365b6c]">{provider.reviews}</Text><Text className="mt-1 font-app text-[9px] text-[#8ba0ac]">بۆچوون</Text></View>
            <View className="h-8 w-px bg-[#eef2f4]" />
            <View className="flex-1 items-center"><MapPin size={19} color={accent} strokeWidth={1.6} /><Text className="mt-1 font-app-medium text-[11px] text-[#708d9b]">{provider.city}</Text></View>
          </Card>

          {!!provider.description && <><View className="mb-3 flex-row-reverse items-center gap-2"><Sparkles size={17} color={accent} /><Text className="font-app-bold text-[16px] text-[#325365]">دەربارەی {hospital ? 'نەخۆشخانە' : doctor ? 'پزیشک' : 'خزمەتگوزاری'}</Text></View>
          <Text className="mb-6 text-right font-app text-[12px] leading-[25px] text-[#7b929e]">{provider.description}</Text></>}

          {serviceLabels.length > 0 && <View className="mb-3 flex-row-reverse items-center gap-2">{hospital ? <Hospital size={17} color={accent} /> : <Stethoscope size={17} color={accent} />}<Text className="font-app-bold text-[16px] text-[#325365]">خزمەتگوزارییەکان</Text></View>}
          <View className="mb-6 flex-row-reverse flex-wrap gap-2">{serviceLabels.map((label) => <View key={label} className="flex-row-reverse items-center gap-1.5 rounded-full border border-[#e4edf1] bg-white px-3 py-2"><Check size={11} color={accent} /><Text className="font-app text-[10px] text-[#6f8a97]">{label}</Text></View>)}</View>

          <View onLayout={(event) => { mapY.current = event.nativeEvent.layout.y; }}>
            <View className="mb-3 flex-row-reverse items-center gap-2"><MapPin size={17} color={accent} /><Text className="font-app-bold text-[16px] text-[#325365]">ناونیشان و شوێن</Text></View>
            <Card className="mb-4 gap-1 rounded-[20px] border-[#e7eef1] bg-white p-4 shadow-none"><Text className="text-right font-app-semibold text-[12px] text-[#446877]">{provider.city}</Text><Text className="text-right font-app text-[12px] leading-6 text-[#8a9faa]">{provider.address}</Text></Card>
            <ViewOnMap query={mapQuery} locationName={provider.city} onExpanded={revealMap} />
          </View>
          <View onLayout={event => { ratingY.current = event.nativeEvent.layout.y; revealRating(); }}><RatingCard key={`${provider.id}:${session?.user.id ?? 'guest'}`} providerId={provider.id} /></View>
        </ScrollView>

        <View style={[styles.actions, { paddingBottom: Math.max(insets.bottom, 14) }]}>
          <Button variant={favorite ? 'secondary' : 'default'} onPress={() => toggleFavorite(provider.id)} className="h-12 flex-row-reverse gap-2 rounded-2xl"><Heart size={18} color={favorite ? '#178cab' : '#ffffff'} fill={favorite ? '#178cab' : 'transparent'} /><Text className="font-app-semibold text-[12px]">{favorite ? 'پاشەکەوت کراوە' : hospital ? 'پاشەکەوتکردنی نەخۆشخانە' : doctor ? 'پاشەکەوتکردنی پزیشک' : 'پاشەکەوتکردن'}</Text></Button>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#e8f0f3', alignItems: 'center', ...Platform.select({ native: { direction: 'ltr' as const } }) },
  phone: { flex: 1, width: '100%', maxWidth: 480, backgroundColor: '#f7fafb', overflow: 'hidden' },
  toolbar: { paddingHorizontal: 22, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toolbarButton: { height: 42, width: 42, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e5edf1', borderRadius: 15 },
  hero: { borderRadius: 27, padding: 23, alignItems: 'center', overflow: 'hidden' },
  heroDecoration: { position: 'absolute', width: 230, height: 230, top: -110, right: -90, borderRadius: 120, borderWidth: 35, borderColor: '#ffffff50' },
  hospitalAvatar: { width: 84, height: 84, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  actions: { paddingHorizontal: 22, paddingTop: 12, backgroundColor: '#ffffff', borderTopWidth: 1, borderColor: '#e8eff2' },
});

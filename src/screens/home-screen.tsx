import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { ActivityIndicator, Keyboard, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useIsFocused, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Bell, Check, ChevronDown, Heart, HeartPulse, MapPin, Search, ShieldCheck, SlidersHorizontal, X } from 'lucide-react-native';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Text } from '@/components/ui/text';
import { BottomBar, type TabId } from '@/components/home/bottom-bar';
import { MedicalBanner } from '@/components/home/medical-banner';
import { ProviderCard } from '@/components/home/provider-card';
import { SectionHeading } from '@/components/home/section-heading';
import { ServiceCard } from '@/components/home/service-card';
import { SpecialtyCards } from '@/components/home/specialty-cards';
import { cities, services, type CategoryId, type City } from '@/lib/directory';
import { useFavorites } from '@/lib/use-favorites';
import { toProvider, useDirectory } from '@/lib/use-directory';

type DialogKind = 'city' | 'filters' | 'notifications' | 'conditions' | null;
const specialtyOptions = [
  { id: 'heart', label: 'دڵ و دەمارەکان' },
  { id: 'dental', label: 'ددان و جوانکاری' },
  { id: 'children', label: 'تەندروستیی منداڵان' },
  { id: 'general', label: 'پزیشکی گشتی' },
];

function tapFeedback() {
  if (Platform.OS !== 'web') void Haptics.selectionAsync().catch(() => {});
}

export default function HomeScreen() {
  const router = useRouter();
  const focused = useIsFocused();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const { favorites, toggleFavorite } = useFavorites();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CategoryId | null>(null);
  const [city, setCity] = useState<City | null>(null);
  const [specialty, setSpecialty] = useState<string | null>(null);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [tab, setTab] = useState<TabId>('home');
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [draftCity, setDraftCity] = useState<City | null>(null);
  const [draftSpecialty, setDraftSpecialty] = useState<string | null>(null);
  const [notificationsRead, setNotificationsRead] = useState(false);

  const browsing = Boolean(query.trim() || category || city || specialty || favoritesOnly);
  const resultCategory = category ?? (query.trim() || favoritesOnly ? null : 'doctors');
  const directory = useDirectory({ query, category: resultCategory, city, specialty, favorites: favoritesOnly ? favorites : undefined });
  const results = directory.data?.pages.flatMap(page => page.map(toProvider)) ?? [];
  const resultTitle = favoritesOnly ? 'پاشەکەوتکراوەکانت' : query.trim() ? 'ئەنجامەکانی گەڕان' : services.find((item) => item.id === category)?.label ?? (specialty ? 'پزیشکە پسپۆڕەکان' : 'پزیشکە پێشنیارکراوەکان');

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, [category, city, specialty, favoritesOnly]);

  function resetHome() {
    setQuery(''); setCategory(null); setSpecialty(null); setCity(null); setFavoritesOnly(false); setTab('home');
    Keyboard.dismiss();
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }

  function selectCategory(id: CategoryId | 'conditions') {
    tapFeedback();
    if (id === 'conditions') { setDialog('conditions'); return; }
    setQuery(''); setCategory(id); setSpecialty(null); setFavoritesOnly(false);
    setTab(id === 'doctors' ? 'doctors' : id === 'centers' || id === 'hospitals' ? 'centers' : 'home');
  }

  function selectSpecialty(id: string) {
    setSpecialty(id); setCategory('doctors'); setQuery(''); setFavoritesOnly(false); setTab('doctors'); setDialog(null); tapFeedback();
  }

  function selectTab(id: TabId) {
    tapFeedback();
    if (id === 'home') resetHome();
    else if (id === 'profile') router.push('/profile');
    else if (id === 'conditions') setDialog(id);
    else selectCategory(id);
  }

  function openFavorites() {
    setCategory(null); setSpecialty(null); setCity(null); setQuery(''); setFavoritesOnly(true); tapFeedback();
  }

  function openFilters() {
    setDraftCity(city); setDraftSpecialty(specialty); setDialog('filters');
  }

  const filterCount = Number(Boolean(city)) + Number(Boolean(specialty));

  return (
    <View style={styles.page}>
      <View style={styles.phone}>
        <LinearGradient colors={['#159dc5', '#137fa8']} start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }} style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <View className="flex-row-reverse items-center justify-between">
            <Pressable onPress={resetHome} accessibilityRole="button" accessibilityLabel="دکتۆریا، سەرەکی" className="flex-row-reverse items-center gap-2.5">
              <View className="h-10 w-10 items-center justify-center rounded-[14px] border border-white/25 bg-white/15">
                <HeartPulse color="white" size={25} strokeWidth={1.9} />
              </View>
              <View className="items-end">
                <Text className="font-app-bold text-[24px] leading-[35px] text-white">دکتۆریا</Text>
                <Text className="font-app text-[8px] text-[#c4eaf6]">هاوڕێی تەندروستیت</Text>
              </View>
            </Pressable>
            <View className="flex-row items-center gap-2.5">
              <Pressable accessibilityRole="button" accessibilityLabel="ئاگادارکردنەوەکان" onPress={() => { setDialog('notifications'); setNotificationsRead(true); }} style={styles.headerAction}>
                <Bell size={19} color="white" strokeWidth={1.8} />
                {!notificationsRead && <View className="absolute right-2.5 top-2 h-1.5 w-1.5 rounded-full border border-[#209bc0] bg-[#ffd68f]" />}
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="پاشەکەوتکراوەکان" onPress={openFavorites} style={styles.headerAction}>
                <Heart size={19} color="white" strokeWidth={1.8} fill={favoritesOnly ? 'white' : 'transparent'} />
                {favorites.length > 0 && <View className="absolute -right-0.5 -top-0.5 h-4 min-w-4 items-center justify-center rounded-full bg-white"><Text className="font-app text-[8px] text-primary">{favorites.length}</Text></View>}
              </Pressable>
            </View>
          </View>
        </LinearGradient>

        <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" refreshControl={<RefreshControl refreshing={directory.isRefetching && !directory.isFetchingNextPage} onRefresh={() => void directory.refetch()} tintColor="#159ac4" colors={['#159ac4']} />} contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 16, paddingBottom: 116 + insets.bottom }}>
          <View className="mb-3 flex-row-reverse items-center justify-between">
            <View className="items-end">
              <Text className="font-app-semibold text-[15px] text-[#26485b]">سڵاو، بەخێربێیت <Text className="text-[15px]">☀️</Text></Text>
              <Text className="mt-0.5 font-app text-[10px] text-muted-foreground">ئەمڕۆ چۆن دەتوانین یارمەتیت بدەین؟</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="هەڵبژاردنی شار" onPress={() => setDialog('city')} className="flex-row-reverse items-center gap-1 rounded-full border border-[#e2edf1] bg-white px-2.5 py-2">
              <MapPin size={12} color="#1995b9" />
              <Text className="font-app-medium text-[9px] text-[#627e8b]">{city ?? 'هەموو شارەکان'}</Text>
              <ChevronDown size={11} color="#8dabb7" />
            </Pressable>
          </View>

          <View style={styles.search}>
            <Search size={20} color="#94a7b4" strokeWidth={1.8} />
            <Input accessibilityLabel="گەڕان بەدوای پزیشک و نەخۆشخانە" placeholder="گەڕان بۆ پزیشک، نەخۆشخانە..." placeholderTextColor="#a6b2bc" value={query} onChangeText={setQuery} onSubmitEditing={() => Keyboard.dismiss()} returnKeyType="search" className="h-12 min-w-0 flex-1 border-0 bg-transparent px-0 text-right font-app text-[12px] shadow-none web:focus-visible:ring-0" style={{ writingDirection: 'rtl' }} />
            {query ? <Pressable onPress={() => setQuery('')} accessibilityRole="button" accessibilityLabel="پاککردنەوەی گەڕان" hitSlop={8}><X size={16} color="#9aaab4" /></Pressable> : null}
            <View className="mx-1 h-5 w-px bg-[#e8eef1]" />
            <Pressable onPress={openFilters} accessibilityRole="button" accessibilityLabel="فلتەری گەڕان" className="h-8 w-8 items-center justify-center rounded-[10px] bg-[#eaf6fa]">
              <SlidersHorizontal size={17} color="#238eae" strokeWidth={1.7} />
              {filterCount > 0 && <View className="absolute -right-1 -top-1 h-3.5 w-3.5 items-center justify-center rounded-full bg-primary"><Text className="text-[8px] text-white">{filterCount}</Text></View>}
            </Pressable>
          </View>

          {!browsing ? (
            <>
              <View className="mb-4 mt-4"><MedicalBanner paused={dialog !== null || !focused} onExplore={(slide) => selectCategory(slide === 2 ? 'hospitals' : 'doctors')} /></View>
              <SectionHeading title="دەستگەیشتنی خێرا" action="گەڕانی وردتر" onPress={openFilters} />
              <View className="mb-4 flex-row-reverse flex-wrap justify-between gap-y-3">
                {services.map((service) => <ServiceCard key={service.id} service={service} selected={category === service.id} onPress={() => selectCategory(service.id)} />)}
              </View>
              <SectionHeading title="خزمەتگوزاریی پزیشکی" action="هەمووی ببینە" onPress={() => setDialog('conditions')} />
              <View className="mb-7"><SpecialtyCards onSelect={selectSpecialty} /></View>
            </>
          ) : (
            <View className="mb-5 mt-4 flex-row-reverse flex-wrap items-center gap-2">
              <Button size="sm" variant="secondary" onPress={resetHome} className="h-8 rounded-full px-3"><X size={12} color="#238eae" /><Text className="font-app text-[10px]">پاککردنەوە</Text></Button>
              {category && <Badge variant="outline" className="rounded-full border-[#d7e8ee] bg-white"><Text className="font-app text-[10px]">{services.find((item) => item.id === category)?.label}</Text></Badge>}
              {city && <Badge variant="outline" className="rounded-full border-[#d7e8ee] bg-white"><Text className="font-app text-[10px]">{city}</Text></Badge>}
              {specialty && <Badge variant="outline" className="rounded-full border-[#d7e8ee] bg-white"><Text className="font-app text-[10px]">{specialtyOptions.find((item) => item.id === specialty)?.label}</Text></Badge>}
            </View>
          )}

          <SectionHeading title={resultTitle} action={browsing ? `${results.length} ئەنجام` : 'هەمووی ببینە'} onPress={browsing ? undefined : () => selectCategory('doctors')} />
          {results.map((provider) => (
            <ProviderCard key={provider.id} provider={provider} favorite={favorites.includes(provider.id)} onFavorite={() => { toggleFavorite(provider.id); tapFeedback(); }} onPress={() => { Keyboard.dismiss(); router.push({ pathname: '/providers/[id]', params: { id: provider.id } }); }} />
          ))}
          {directory.isPending && <View className="items-center py-10"><ActivityIndicator color="#159ac4" /><Text className="mt-3 font-app text-xs text-muted-foreground">زانیارییەکان بار دەکرێن…</Text></View>}
          {directory.isError && <View className="items-center gap-4 rounded-3xl bg-white p-6"><Text className="text-center font-app text-xs text-muted-foreground">نەتوانرا زانیارییەکان بار بکرێن. پەیوەندیی ئینتەرنێتەکەت بپشکنە.</Text><Button variant="secondary" onPress={() => void directory.refetch()} className="rounded-full"><Text className="font-app text-xs">دووبارە هەوڵ بدەوە</Text></Button></View>}
          {directory.hasNextPage && <Button disabled={directory.isFetchingNextPage} variant="secondary" onPress={() => void directory.fetchNextPage()} className="mb-3 rounded-full"><Text className="font-app text-xs">{directory.isFetchingNextPage ? 'بار دەکرێت…' : 'پیشاندانی زیاتر'}</Text></Button>}
          {!directory.isPending && !directory.isError && results.length === 0 && (
            <View className="items-center rounded-3xl border border-dashed border-[#d5e4ea] bg-white px-6 py-10">
              {favoritesOnly ? <Heart size={35} color="#b6cbd5" strokeWidth={1.3} /> : <Search size={35} color="#b6cbd5" strokeWidth={1.3} />}
              <Text className="mt-4 font-app-semibold text-[15px]">{favoritesOnly ? 'هێشتا هیچت پاشەکەوت نەکردووە' : browsing ? 'هیچ ئەنجامێک نەدۆزرایەوە' : 'هێشتا هیچ شوێنێک تۆمار نەکراوە'}</Text>
              <Text className="mb-5 mt-2 text-center font-app text-[11px] leading-6 text-muted-foreground">{favoritesOnly ? 'نیشانەی دڵ لەسەر پزیشکێک هەڵبژێرە بۆ پاشەکەوتکردن.' : browsing ? 'وشەیەکی تر تاقی بکەرەوە یان فلتەرەکان پاک بکەرەوە.' : 'بۆ زیادکردنی پزیشک یان شوێنی خزمەتگوزارییەکەت، پەیوەندیمان پێوە بکە.'}</Text>
              <Button variant="secondary" className="rounded-full" onPress={browsing ? resetHome : () => router.push('/profile')}><Text className="font-app text-xs">{browsing ? 'گەڕانەوە بۆ سەرەکی' : 'پەیوەندیمان پێوە بکە'}</Text></Button>
            </View>
          )}
          <View className="mb-2 mt-5 flex-row-reverse items-center justify-center gap-1.5">
            <ShieldCheck size={12} color="#9bb0bb" />
            <Text className="font-app text-[9px] text-[#9babb5]">دکتۆریا • چاودێرییەک پڕ لە دڵنیایی</Text>
          </View>
          <Text className="text-center font-app text-[8px] text-[#a9b5bd]">تەندروستیت، لە پێش هەموو شتێک</Text>
        </ScrollView>

        <BottomBar active={dialog === 'conditions' ? 'conditions' : tab} onSelect={selectTab} />
      </View>

      <Dialog open={dialog !== null} onOpenChange={(open) => { if (!open) setDialog(null); }}>
        <DialogContent className="w-[90%] max-w-[420px] gap-5 rounded-[28px] border-[#e5eef2] bg-white p-6 pt-10">
          <DialogHeader>
            <DialogTitle className="text-center font-app-bold text-[19px] leading-8">{dialog === 'city' ? 'شارەکەت هەڵبژێرە' : dialog === 'filters' ? 'گەڕانێکی وردتر' : dialog === 'notifications' ? 'ئاگادارکردنەوەکان' : 'پسپۆڕییە پزیشکییەکان'}</DialogTitle>
            <DialogDescription className="text-center font-app text-[11px] leading-6">{dialog === 'city' ? 'خزمەتگوزارییەکانی نزیک خۆت بدۆزەوە' : dialog === 'filters' ? 'شار و پسپۆڕییەکی گونجاو هەڵبژێرە' : dialog === 'notifications' ? 'تازەترین هەواڵ و ئاگادارکردنەوەکانت' : 'پسپۆڕێک هەڵبژێرە بۆ دۆزینەوەی پزیشک'}</DialogDescription>
          </DialogHeader>

          {dialog === 'city' && <View className="gap-2">{[null, ...cities].map((item) => <Choice key={item ?? 'all'} label={item ?? 'هەموو شارەکان'} selected={city === item} onPress={() => { setCity(item); setDialog(null); }} />)}</View>}

          {dialog === 'filters' && (
            <View className="gap-4">
              <Text className="text-right font-app-semibold text-xs">شار</Text>
              <View className="flex-row-reverse flex-wrap gap-2">{[null, ...cities].map((item) => <FilterPill key={item ?? 'all'} label={item ?? 'هەموو'} selected={draftCity === item} onPress={() => setDraftCity(item)} />)}</View>
              <Separator />
              <Text className="text-right font-app-semibold text-xs">پسپۆڕی</Text>
              <View className="flex-row-reverse flex-wrap gap-2"><FilterPill label="هەموو" selected={draftSpecialty === null} onPress={() => setDraftSpecialty(null)} />{specialtyOptions.map((item) => <FilterPill key={item.id} label={item.label} selected={draftSpecialty === item.id} onPress={() => setDraftSpecialty(item.id)} />)}</View>
              <Button className="mt-2 rounded-2xl" onPress={() => { setCity(draftCity); setSpecialty(draftSpecialty); if (draftSpecialty) setCategory('doctors'); setDialog(null); Keyboard.dismiss(); }}><Text className="font-app-semibold text-sm">پیشاندانی ئەنجامەکان</Text></Button>
            </View>
          )}

          {dialog === 'conditions' && <View className="gap-2">{specialtyOptions.map((item) => <Choice key={item.id} label={item.label} selected={specialty === item.id} onPress={() => selectSpecialty(item.id)} />)}</View>}

          {dialog === 'notifications' && (
            <View className="items-center rounded-2xl bg-[#f0f8fb] p-6">
              <Bell size={33} color="#279bc0" strokeWidth={1.4} />
              <Text className="mt-4 font-app-semibold text-sm">هەموو شتێک نوێیە!</Text>
              <Text className="mt-2 text-center font-app text-[11px] leading-6 text-muted-foreground">هیچ ئاگادارکردنەوەیەکی نوێت نییە. هەر کات هەواڵێک هەبوو لێرە دەیبینیت.</Text>
            </View>
          )}

        </DialogContent>
      </Dialog>

    </View>
  );
}

function Choice({ label, selected, onPress }: { label: string; selected?: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} className={`flex-row-reverse items-center justify-between rounded-2xl border px-4 py-3 ${selected ? 'border-[#b5e1ef] bg-[#eff9fc]' : 'border-[#e8eff3] bg-[#fafcfd]'}`}><Text className="font-app-medium text-xs">{label}</Text>{selected ? <Check size={16} color="#1499c1" /> : <View className="h-4 w-4 rounded-full border border-[#d2e1e8]" />}</Pressable>;
}

function FilterPill({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return <Button variant={selected ? 'default' : 'outline'} size="sm" onPress={onPress} className="rounded-full"><Text className="font-app text-[10px]">{label}</Text></Button>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#e8f0f3', alignItems: 'center', ...Platform.select({ native: { direction: 'ltr' as const } }) },
  phone: { flex: 1, width: '100%', maxWidth: 480, backgroundColor: '#f7fafb', overflow: 'hidden' },
  header: { paddingHorizontal: 23, paddingBottom: 16, borderBottomLeftRadius: 27, borderBottomRightRadius: 27 },
  headerAction: { height: 37, width: 37, borderRadius: 14, backgroundColor: '#ffffff1c', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#ffffff12' },
  search: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, height: 54, paddingHorizontal: 14, borderRadius: 17, borderWidth: 1, borderColor: '#e7eef2', backgroundColor: '#ffffff', boxShadow: '0 4px 15px rgba(41, 75, 94, 0.04)' },
});

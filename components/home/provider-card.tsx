import { Heart, MapPin, Star } from 'lucide-react-native';
import { useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import type { Provider } from '@/lib/directory';

export function ProviderAvatar({ provider, large = false }: { provider: Provider; large?: boolean }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  return (
    <View style={{ width: large ? 84 : 67, height: large ? 84 : 72, borderRadius: large ? 25 : 19, backgroundColor: provider.background, alignItems: 'center', justifyContent: 'center' }}>
      {provider.photoUrl && failedUrl !== provider.photoUrl ? <Image source={{ uri: provider.photoUrl }} accessibilityLabel={provider.name} onError={() => setFailedUrl(provider.photoUrl)} style={{ width: '100%', height: '100%', borderRadius: large ? 25 : 19 }} /> : <Text className="font-app-bold" style={{ fontSize: large ? 30 : 23, color: provider.color }}>{provider.initials}</Text>}
      <View style={{ position: 'absolute', bottom: 5, right: 5, height: 10, width: 10, borderRadius: 5, backgroundColor: provider.available ? '#2bbc91' : '#adb8c1', borderWidth: 2, borderColor: '#ffffff' }} />
    </View>
  );
}

export function ProviderCard({ provider, favorite, onFavorite, onPress }: { provider: Provider; favorite: boolean; onFavorite: () => void; onPress: () => void }) {
  return (
    <Card className="mb-3 flex-row-reverse items-center gap-3 rounded-[20px] border-[#e9eff2] bg-white p-3.5 shadow-none">
      <Pressable accessibilityRole="button" accessibilityLabel={`زانیاریی ${provider.name}`} onPress={onPress} className="flex-1 flex-row-reverse items-center gap-3">
        <ProviderAvatar provider={provider} />
        <View className="flex-1 items-end">
          <Text className="font-app-semibold text-[14px] text-foreground">{provider.name}</Text>
          <Text className="mt-1 font-app text-[10px] text-muted-foreground">{provider.specialty}</Text>
          <View className="mt-2 flex-row-reverse items-center gap-1">
            <MapPin size={10} color="#9aa8b4" />
            <Text className="font-app text-[9px] text-muted-foreground">{provider.city}</Text>
            <View className="mx-1 h-0.5 w-0.5 rounded-full bg-[#c5d1d8]" />
            <Star size={10} color="#e6b458" fill="#e6b458" />
            <Text className="font-app-medium text-[10px] text-[#536674]">{provider.rating}</Text>
            <Text className="font-app text-[8px] text-[#a4b0ba]">({provider.reviews})</Text>
          </View>
        </View>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={`${favorite ? 'لابردنی' : 'پاشەکەوتکردنی'} ${provider.name}`} accessibilityState={{ selected: favorite }} onPress={onFavorite} hitSlop={8} className="self-start rounded-full bg-[#f5f8fa] p-2">
        <Heart size={15} strokeWidth={1.7} color={favorite ? '#e48087' : '#a9b7c1'} fill={favorite ? '#e48087' : 'transparent'} />
      </Pressable>
    </Card>
  );
}

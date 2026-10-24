import { ArrowUpLeft, Baby, HeartPulse, Smile } from 'lucide-react-native';
import { useRef, type ComponentRef } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@/components/ui/text';

const specialties = [
  { id: 'heart', title: 'دڵ و دەمارەکان', caption: 'بۆ دڵێکی تەندروست', count: 'پسپۆڕەکانی دڵ', icon: HeartPulse, colors: ['#173c51', '#275b6c'] as const, tint: '#88d7dc' },
  { id: 'dental', title: 'ددان و جوانکاری', caption: 'پێکەنینێکی جوانتر', count: 'پسپۆڕەکانی ددان', icon: Smile, colors: ['#e0f2f5', '#d0e9f1'] as const, tint: '#278da5' },
  { id: 'children', title: 'تەندروستیی منداڵان', caption: 'چاودێرییەکی پڕ لە خۆشەویستی', count: 'پسپۆڕەکانی منداڵان', icon: Baby, colors: ['#f1e9fb', '#e5dcf5'] as const, tint: '#9370bd' },
];

export function SpecialtyCards({ onSelect }: { onSelect: (id: string) => void }) {
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  return (
    <ScrollView ref={scrollRef} horizontal showsHorizontalScrollIndicator={false} onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })} contentContainerStyle={{ gap: 12, paddingHorizontal: 22, flexDirection: 'row-reverse' }} style={{ marginHorizontal: -22 }}>
      {specialties.map(({ icon: Icon, ...item }, index) => (
        <Pressable key={item.id} onPress={() => onSelect(item.id)} accessibilityRole="button" accessibilityLabel={item.title}>
          <LinearGradient colors={item.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
            <View style={[styles.circle, { borderColor: item.tint + '25' }]} />
            <Icon size={83} strokeWidth={1} color={item.tint} style={{ position: 'absolute', left: -9, bottom: 7, opacity: 0.45, transform: [{ rotate: '-15deg' }] }} />
            <View className="items-end">
              <Text className="font-app text-[9px]" style={{ color: index === 0 ? '#9fc9d0' : item.tint }}>{item.caption}</Text>
              <Text className="mt-1 font-app-bold text-[17px]" style={{ color: index === 0 ? '#ffffff' : '#22495c' }}>{item.title}</Text>
              <View className="mt-4 flex-row-reverse items-center gap-2">
                <Text className="font-app text-[9px]" style={{ color: index === 0 ? '#c8e4e7' : '#548496' }}>{item.count}</Text>
                <ArrowUpLeft size={13} color={item.tint} />
              </View>
            </View>
          </LinearGradient>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: { width: 237, height: 143, borderRadius: 20, padding: 20, overflow: 'hidden', justifyContent: 'center' },
  circle: { width: 150, height: 150, borderRadius: 80, borderWidth: 1, position: 'absolute', left: -54, bottom: -55 },
});

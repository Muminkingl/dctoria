import { Pressable, StyleSheet, View } from 'react-native';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import type { Service } from '@/lib/directory';

export function ServiceCard({ service, selected, onPress }: { service: Service; selected: boolean; onPress: () => void }) {
  const Icon = service.icon;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={service.label} accessibilityState={{ selected }} onPress={onPress} style={({ pressed }) => [styles.pressable, { opacity: pressed ? 0.72 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] }]}>
      <Card className="items-center justify-center gap-0.5 rounded-[20px] p-2 shadow-none" style={[styles.card, { backgroundColor: service.background, borderColor: selected ? service.color : '#ffffff', borderWidth: selected ? 1.5 : 1 }]}>
        <View style={[styles.icon, { backgroundColor: service.iconBackground }]}>
          <Icon size={29} strokeWidth={1.6} color={service.color} />
          <View style={[styles.sparkle, { backgroundColor: service.color }]} />
        </View>
        <Text className="font-app-semibold text-[13px]" style={{ color: service.color }}>{service.label}</Text>
        <Text className="mt-0.5 font-app text-[8px] text-muted-foreground" numberOfLines={1}>{service.caption}</Text>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: { width: '31.4%' },
  card: { height: 100, boxShadow: '0 4px 12px rgba(37, 66, 87, 0.045)' },
  icon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  sparkle: { position: 'absolute', width: 5, height: 5, borderRadius: 2, top: 2, right: 1, opacity: 0.5, transform: [{ rotate: '35deg' }] },
});

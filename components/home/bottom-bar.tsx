import { Building2, HeartPulse, House, Stethoscope, UserRound, type LucideIcon } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FluidTabs } from '@/components/watermelon/fluid-tabs';

export type TabId = 'home' | 'doctors' | 'centers' | 'conditions' | 'profile';
const tabs: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: 'profile', label: 'پرۆفایل', icon: UserRound },
  { id: 'centers', label: 'سەنتەرەکان', icon: Building2 },
  { id: 'home', label: 'سەرەکی', icon: House },
  { id: 'doctors', label: 'پزیشکەکان', icon: Stethoscope },
  { id: 'conditions', label: 'تەندروستی', icon: HeartPulse },
];

export function BottomBar({ active, onSelect }: { active: TabId; onSelect: (id: TabId) => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="box-none" style={[styles.bar, { bottom: Math.max(insets.bottom, 12) }]}>
      <FluidTabs value={active} onChange={(id) => {
        const selectedTab = tabs.find((item) => item.id === id);
        if (selectedTab) onSelect(selectedTab.id);
      }} tabs={tabs.map(({ id, label, icon: Icon }) => ({
        id,
        label,
        icon: (selected) => <Icon size={21} color={selected ? '#178cab' : '#87939b'} strokeWidth={selected ? 1.9 : 1.65} />,
      }))} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { position: 'absolute', left: 14, right: 14 },
});

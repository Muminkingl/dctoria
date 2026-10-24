/**
 * Native adaptation of Watermelon UI's Fluid Tabs:
 * https://registry.watermelon.sh/r/fluid-tabs.json
 *
 * One animation clock keeps the moving pill, icon, and label in sync.
 * Stacked labels fit the app's five-item mobile navigation.
 */
import { useCallback, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View, type LayoutChangeEvent, type ViewStyle } from 'react-native';
import Animated, { Easing, interpolateColor, ReduceMotion, useAnimatedStyle, useDerivedValue, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

export interface FluidTabItem {
  id: string;
  label: string;
  icon: (selected: boolean) => ReactNode;
}

interface FluidTabsProps {
  tabs: readonly FluidTabItem[];
  value: string;
  onChange: (id: string) => void;
}

const TAB_TRANSITION = { duration: 120, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System };

export function FluidTabs({ tabs, value, onChange }: FluidTabsProps) {
  const [width, setWidth] = useState(0);
  const [preview, setPreview] = useState<string | null>(null);
  const highlighted = preview ?? value;
  const index = Math.max(0, tabs.findIndex((tab) => tab.id === highlighted));
  const slotWidth = tabs.length ? width / tabs.length : 0;
  const position = useSharedValue(index);
  const target = useRef(index);

  const moveTo = useCallback((next: number) => {
    if (target.current === next) return;
    target.current = next;
    position.set(withTiming(next, TAB_TRANSITION));
  }, [position]);

  // Handle programmatic changes before paint; presses start the clock directly.
  useLayoutEffect(() => moveTo(index), [index, moveTo]);

  const pillStyle = useAnimatedStyle<ViewStyle>(() => ({
    transform: [{ translateX: position.value * slotWidth }],
  }));

  function measure(event: LayoutChangeEvent) {
    setWidth(event.nativeEvent.layout.width);
  }

  return (
    <View style={styles.track}>
      <View accessibilityRole="tablist" accessibilityLabel="ڕێنیشاندەری سەرەکی" onLayout={measure} style={styles.row}>
        {slotWidth > 0 && <Animated.View testID="fluid-tabs-indicator" pointerEvents="none" style={[styles.pill, { width: slotWidth - 4 }, pillStyle]}>
          <LinearGradient colors={['#ffffff', '#f8fbfc']} style={styles.pillGradient} />
        </Animated.View>}
        {tabs.map((tab, tabIndex) => (
          <FluidTabButton key={tab.id} tab={tab} index={tabIndex} position={position} selected={highlighted === tab.id} onPreview={() => { moveTo(tabIndex); setPreview(tab.id); }} onCancel={() => setPreview((current) => current === tab.id ? null : current)} onPress={() => { moveTo(tabIndex); onChange(tab.id); setPreview(null); }} />
        ))}
      </View>
    </View>
  );
}

function FluidTabButton({ tab, index, position, selected, onPreview, onCancel, onPress }: {
  tab: FluidTabItem;
  index: number;
  position: SharedValue<number>;
  selected: boolean;
  onPreview: () => void;
  onCancel: () => void;
  onPress: () => void;
}) {
  const committed = useRef(false);
  const active = useDerivedValue(() => Math.max(0, 1 - Math.abs(position.value - index)));
  const inactiveIconStyle = useAnimatedStyle<ViewStyle>(() => ({ opacity: 1 - active.value }));
  const activeIconStyle = useAnimatedStyle<ViewStyle>(() => ({ opacity: active.value, transform: [{ scale: 1 + active.value * 0.03 }] }));
  const labelStyle = useAnimatedStyle(() => ({ color: interpolateColor(active.value, [0, 1], ['#87939b', '#178cab']) }));

  return (
    <Pressable accessibilityRole="tab" accessibilityLabel={tab.label} accessibilityState={{ selected }} aria-selected={selected}
      onPressIn={() => { committed.current = false; onPreview(); }}
      onPressOut={() => { requestAnimationFrame(() => { if (!committed.current) onCancel(); }); }}
      onPress={() => { committed.current = true; onPress(); }}
      style={styles.tab}>
      <View style={styles.icon} aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Animated.View style={[styles.iconLayer, inactiveIconStyle]}>{tab.icon(false)}</Animated.View>
        <Animated.View style={[styles.iconLayer, activeIconStyle]}>{tab.icon(true)}</Animated.View>
      </View>
      <Animated.Text numberOfLines={1} style={[styles.label, { fontFamily: selected ? 'Vazirmatn_600SemiBold' : 'Vazirmatn_400Regular' }, labelStyle]}>
        {tab.label}
      </Animated.Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: { borderRadius: 999, borderWidth: 1, borderColor: '#e5edef', backgroundColor: '#eef2f3', padding: 4, boxShadow: '0 5px 22px rgba(32, 68, 83, 0.12)' },
  row: { flexDirection: 'row', height: 56 },
  pill: { position: 'absolute', left: 2, top: 1, bottom: 1, borderRadius: 999, borderWidth: 1, borderColor: '#ffffff', backgroundColor: '#ffffff', boxShadow: '0 2px 5px rgba(31, 66, 82, 0.08)' },
  pillGradient: { flex: 1, borderRadius: 999 },
  tab: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center', gap: 3, borderRadius: 999 },
  icon: { width: 25, height: 23 },
  iconLayer: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center' },
  label: { textAlign: 'center', fontSize: 9, lineHeight: 17 },
});


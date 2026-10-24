/** Native adaptation: https://registry.watermelon.sh/r/carousel-navigator.json */
import { useCallback, useEffect, useRef } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation, Easing, ReduceMotion, useAnimatedStyle, useSharedValue,
  withSpring, withTiming, type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

interface CarouselNavigatorProps {
  totalSlides: number;
  currentIndex: number;
  onIndexChange: (index: number) => void;
  autoDelay?: number;
  isPlaying: boolean;
}

export function CarouselNavigator({
  totalSlides, currentIndex, onIndexChange, autoDelay = 6000,
  isPlaying,
}: CarouselNavigatorProps) {
  const progress = useSharedValue(0);
  const progressIndex = useSharedValue(currentIndex);
  const previousIndex = useRef(currentIndex);
  const generation = useRef(0);

  const completeCycle = useCallback((cycle: number, index: number) => {
    // Ignore completion already queued before a pause, manual tap, or unmount.
    if (generation.current === cycle) onIndexChange((index + 1) % totalSlides);
  }, [onIndexChange, totalSlides]);

  useEffect(() => {
    const cycle = ++generation.current;
    cancelAnimation(progress);
    if (previousIndex.current !== currentIndex) {
      progress.value = 0;
      previousIndex.current = currentIndex;
    }
    progressIndex.value = currentIndex;

    if (isPlaying && totalSlides > 1) {
      const remaining = Math.max(0, 1 - progress.get());
      // This single clock drives both the fill and the slide advance.
      progress.value = withTiming(1, {
        duration: autoDelay * remaining,
        easing: Easing.linear,
        // Autoplay is disabled by the parent for reduced motion. Skipping the
        // clock itself would otherwise advance slides in an immediate loop.
        reduceMotion: ReduceMotion.Never,
      }, (finished) => {
        if (finished) scheduleOnRN(completeCycle, cycle, currentIndex);
      });
    }

    return () => {
      generation.current += 1;
      cancelAnimation(progress);
    };
  }, [autoDelay, completeCycle, currentIndex, isPlaying, progress, progressIndex, totalSlides]);

  return (
    <View style={styles.container}>
      <View style={styles.indicators}>
        {Array.from({ length: totalSlides }, (_, index) => (
          <Indicator key={index} index={index} active={index === currentIndex} progress={progress} progressIndex={progressIndex} onPress={() => onIndexChange(index)} />
        ))}
      </View>
    </View>
  );
}

function Indicator({ index, active, progress, progressIndex, onPress }: {
  index: number;
  active: boolean;
  progress: SharedValue<number>;
  progressIndex: SharedValue<number>;
  onPress: () => void;
}) {
  const width = useSharedValue(active ? 34 : 7);
  const color = useSharedValue(active ? '#159dbc' : '#d7e3e8');

  useEffect(() => {
    width.value = withSpring(active ? 34 : 7, { stiffness: 300, damping: 30, reduceMotion: ReduceMotion.System });
    color.value = withTiming(active ? '#159dbc' : '#d7e3e8', { duration: 250, reduceMotion: ReduceMotion.System });
  }, [active, color, width]);

  const indicatorStyle = useAnimatedStyle<ViewStyle>(() => ({ width: width.value, backgroundColor: color.value }));
  const fillStyle = useAnimatedStyle<ViewStyle>(() => ({
    width: width.value * (progressIndex.value === index ? progress.value : 0),
    opacity: progressIndex.value === index ? 1 : 0,
  }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`بانەری ${index + 1}`}
      accessibilityState={{ selected: active }}
      aria-pressed={active}
      onPress={onPress}
      hitSlop={4}
      style={styles.target}>
      <Animated.View testID={`carousel-indicator-${index}`} style={[styles.indicator, indicatorStyle]}>
        {active && <Animated.View testID={`carousel-progress-${index}`} pointerEvents="none" style={[styles.fill, fillStyle]} />}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 4, height: 26, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center' },
  indicators: { flexDirection: 'row-reverse', alignItems: 'center' },
  target: { height: 26, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' },
  indicator: { height: 7, borderRadius: 20, overflow: 'hidden' },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.85)' },
});

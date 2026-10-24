import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowUpLeft, ShieldCheck } from 'lucide-react-native';
import { AppState, Image, Pressable, StyleSheet, View, useWindowDimensions, type ViewStyle } from 'react-native';
import Animated, { Easing, ReduceMotion, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { Text } from '@/components/ui/text';
import { CarouselNavigator } from '@/components/watermelon/carousel-navigator';

const slides = [
  { image: require('../../assets/medical-hero.png'), eyebrow: 'تەندروستیت، پێش هەموو شتێک', title: 'چاودێریی باشتر،\nژیانێکی تەندروستتر', description: 'باشترین پزیشک و سەنتەرەکان بدۆزەوە', button: 'پزیشکێک بدۆزەوە' },
  { image: require('../../assets/banner-specialist.png'), eyebrow: 'هەنگاوێک بەرەو دڵنیایی', title: 'پزیشکی گونجاو،\nلە نزیک تۆ', description: 'بە ئاسانی پسپۆڕی پێویستت هەڵبژێرە', button: 'پسپۆڕەکان ببینە' },
  { image: require('../../assets/banner-hospital.png'), eyebrow: 'هەمیشە لەگەڵتین', title: 'هەموو خزمەتگوزارییەک،\nلە یەک شوێن', description: 'نەخۆشخانە، سەنتەر و تاقیگەکان', button: 'خزمەتگوزارییەکان ببینە' },
];

export function MedicalBanner({ onExplore, paused = false }: { onExplore: (slide: number) => void; paused?: boolean }) {
  const [active, setActive] = useState(0);
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  const [bannerWidth, setBannerWidth] = useState(350);
  const reducedMotion = useReducedMotion();
  const position = useSharedValue(0);
  const targetPage = useRef(0);
  const activeIndex = useRef(0);
  const changeSlide = useCallback((index: number) => {
    const forward = (index - activeIndex.current + slides.length) % slides.length;
    const step = forward > slides.length / 2 ? forward - slides.length : forward;
    targetPage.current += step;
    activeIndex.current = index;
    position.set(withTiming(targetPage.current, { duration: 620, easing: Easing.inOut(Easing.cubic), reduceMotion: ReduceMotion.System }));
    setActive(index);
  }, [position]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => setForeground(state === 'active'));
    return () => subscription?.remove();
  }, []);

  return (
    <View>
      <View style={styles.shadow}>
        <View style={styles.banner} onLayout={event => setBannerWidth(event.nativeEvent.layout.width)}>
          {slides.map((slide, index) => <BannerSlide key={index} slide={slide} index={index} position={position} width={bannerWidth} selected={index === active} onExplore={() => onExplore(index)} />)}
        </View>
      </View>
      <CarouselNavigator totalSlides={slides.length} currentIndex={active} onIndexChange={changeSlide} autoDelay={6000} isPlaying={foreground && !paused && !reducedMotion} />
    </View>
  );
}

function BannerSlide({ slide, index, position, width: bannerWidth, selected, onExplore }: { slide: typeof slides[number]; index: number; position: import('react-native-reanimated').SharedValue<number>; width: number; selected: boolean; onExplore: () => void }) {
  const { width } = useWindowDimensions();
  const compact = width < 360;

  const animatedStyle = useAnimatedStyle<ViewStyle>(() => {
    // Wrap relative positions so the final slide glides into the first one.
    const total = slides.length;
    const offset = ((index - position.value + total * 1.5) % total + total) % total - total / 2;
    return { transform: [{ translateX: offset * bannerWidth }] };
  });

  return (
    <Animated.View pointerEvents={selected ? 'auto' : 'none'} aria-hidden={!selected} accessibilityElementsHidden={!selected} importantForAccessibility={selected ? 'auto' : 'no-hide-descendants'} style={[styles.slide, animatedStyle]}>
      <Image source={slide.image} resizeMode="cover" style={{ position: 'absolute', width: '100%', height: '100%', top: 0, left: 0 }} accessibilityLabel={index === 2 ? 'نەخۆشخانە و خزمەتگوزاریی تەندروستی' : 'پزیشک و چاودێریی تەندروستی'} />
      <View className="w-[59%] items-end py-4 pl-1 pr-5">
        <View className="mb-2 flex-row-reverse items-center gap-1">
          <ShieldCheck size={12} color="#b7eeed" />
          <Text className="font-app text-[8px] text-[#c6f2f1]">{slide.eyebrow}</Text>
        </View>
        <Text className={`text-right font-app-bold text-white ${compact ? 'text-[17px] leading-[27px]' : 'text-[20px] leading-[31px]'}`}>{slide.title}</Text>
        <Text className="mb-3 mt-1 text-right font-app text-[8px] text-[#d2f2f3]">{slide.description}</Text>
        <Pressable accessibilityRole="button" onPress={onExplore} className="flex-row-reverse items-center gap-2 rounded-full bg-white/95 px-3 py-2">
          <Text className="font-app-semibold text-[9px] text-[#127b89]">{slide.button}</Text>
          <ArrowUpLeft size={13} color="#127b89" />
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  shadow: { borderRadius: 22, boxShadow: '0 8px 18px rgba(17, 120, 138, 0.16)', backgroundColor: '#138f9a' },
  banner: { height: 180, alignItems: 'flex-end', overflow: 'hidden', borderRadius: 22 },
  slide: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'flex-end', justifyContent: 'center' },
});

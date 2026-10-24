/** Native adaptation: https://registry.watermelon.sh/r/view-on-map.json */
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { ExternalLink, Map, MapPin, RotateCw, X } from 'lucide-react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import Animated, { Extrapolation, interpolate, ReduceMotion, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import * as Linking from 'expo-linking';
import { MapSurface } from '@/components/maps/map-surface';
import { Text } from '@/components/ui/text';

interface ViewOnMapProps {
  query: string;
  locationName: string;
  onOpenChange?: (open: boolean) => void;
  onExpanded?: () => void;
}

export function ViewOnMap({ query, locationName, onOpenChange, onExpanded }: ViewOnMapProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [width, setWidth] = useState(300);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const [linkFailed, setLinkFailed] = useState(false);
  const expansion = useSharedValue(0);
  const mapHeight = Math.min(width, 320);
  const expandedHeight = mapHeight + 54;
  const encoded = encodeURIComponent(query);
  const embedUrl = `https://maps.google.com/maps?q=${encoded}&z=13&output=embed`;
  const publicUrl = `https://www.google.com/maps/search/?api=1&query=${encoded}`;
  const notifyExpanded = useCallback(() => onExpanded?.(), [onExpanded]);

  useEffect(() => {
    expansion.value = withSpring(open ? 1 : 0, { stiffness: 400, damping: 30, mass: 0.8, reduceMotion: ReduceMotion.System }, (finished) => {
      if (finished && open) scheduleOnRN(notifyExpanded);
    });
  }, [expansion, notifyExpanded, open]);

  const containerStyle = useAnimatedStyle<ViewStyle>(() => ({
    width: 180 + (width - 180) * expansion.value,
    height: 52 + (expandedHeight - 52) * expansion.value,
    borderRadius: 26 + 6 * expansion.value,
  }));
  const buttonStyle = useAnimatedStyle<ViewStyle>(() => ({
    opacity: interpolate(expansion.value, [0, 0.2], [1, 0], Extrapolation.CLAMP),
  }));
  const mapStyle = useAnimatedStyle<ViewStyle>(() => ({
    opacity: interpolate(expansion.value, [0.15, 0.7], [0, 1], Extrapolation.CLAMP),
  }));

  function toggle(next: boolean) {
    if (next) setMounted(true);
    setOpen(next);
    onOpenChange?.(next);
  }

  function retryMap() {
    setLoaded(false); setFailed(false); setRetry((current) => current + 1);
  }

  return (
    <View style={styles.wrapper} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      <Animated.View testID="view-on-map-container" style={[styles.container, containerStyle]}>
        <Animated.View pointerEvents={open ? 'none' : 'auto'} aria-hidden={open} accessibilityElementsHidden={open} importantForAccessibility={open ? 'no-hide-descendants' : 'auto'} style={[styles.collapsed, buttonStyle]}>
          <MapTexture />
          {!open && <Pressable accessibilityRole="button" accessibilityLabel="پیشاندان لەسەر نەخشە" onPress={() => toggle(true)} style={styles.openButton}>
            <Map size={19} color="#438598" strokeWidth={1.7} />
            <Text className="font-app-semibold text-[12px] text-[#356779]">لەسەر نەخشە ببینە</Text>
          </Pressable>}
        </Animated.View>

        {mounted && (
          <Animated.View pointerEvents={open ? 'auto' : 'none'} aria-hidden={!open} accessibilityElementsHidden={!open} importantForAccessibility={open ? 'auto' : 'no-hide-descendants'} style={[styles.mapContent, { width, height: expandedHeight }, mapStyle]}>
            <View style={{ width, height: mapHeight, backgroundColor: '#eef2f3' }}>
              <MapSurface key={retry} title={`نەخشەی ${locationName}`} url={embedUrl} onLoad={() => setLoaded(true)} onError={() => setFailed(true)} />
              {(!loaded || failed) && (
                <View style={styles.loading}>
                  {failed ? <>
                    <MapPin size={30} color="#78a4b3" />
                    <Text className="mt-3 font-app text-[12px] text-[#6f8994]">نەخشەکە بار نەکرا</Text>
                    <Pressable accessibilityRole="button" onPress={retryMap} className="mt-4 flex-row-reverse items-center gap-2 rounded-full bg-white px-4 py-2.5"><RotateCw size={14} color="#168eaf" /><Text className="font-app text-[11px] text-[#168eaf]">دووبارە هەوڵ بدەوە</Text></Pressable>
                  </> : <><ActivityIndicator color="#159ac4" /><Text className="mt-3 font-app text-[11px] text-[#7893a0]">نەخشەکە بار دەکرێت…</Text></>}
                </View>
              )}
            </View>
            <View style={styles.footer}>
              <View className="flex-row-reverse items-center gap-1.5"><MapPin size={13} color="#2095b3" /><Text className="font-app-medium text-[11px] text-[#456674]">{locationName}</Text></View>
              <Pressable accessibilityRole="link" accessibilityLabel="کردنەوە لە Google Maps" onPress={() => { void Linking.openURL(publicUrl).catch(() => setLinkFailed(true)); }} className="flex-row-reverse items-center gap-1.5 rounded-full bg-[#eef7fa] px-3 py-2"><Text className="font-app text-[9px] text-[#218aa7]">Google Maps</Text><ExternalLink size={12} color="#218aa7" /></Pressable>
            </View>
            {open && <Pressable accessibilityRole="button" accessibilityLabel="داخستنی نەخشە" onPress={() => toggle(false)} style={styles.close}><X size={18} color="#6e8792" strokeWidth={2} /></Pressable>}
          </Animated.View>
        )}
      </Animated.View>
      {linkFailed && <Text className="mt-2 text-center font-app text-[10px] text-muted-foreground">نەتوانرا نەخشەکە بکرێتەوە؛ دووبارە هەوڵ بدەوە.</Text>}
    </View>
  );
}

function MapTexture() {
  return <View pointerEvents="none" style={styles.texture}><Svg width="100%" height="100%" viewBox="0 0 360 104" preserveAspectRatio="xMidYMid slice"><Rect width="360" height="104" fill="#edf4f4" /><Path d="M0 15L115 18L180 104H270L255 0M0 75L130 45L360 58" stroke="#dce9e9" strokeWidth={13} fill="none" /><Path d="M0 15L115 18L180 104H270L255 0M0 75L130 45L360 58" stroke="white" strokeWidth={5} fill="none" /><Rect x={282} y={6} width={52} height={35} rx={9} fill="#d9ebe3" /></Svg></View>;
}

const styles = StyleSheet.create({
  wrapper: { width: '100%', alignItems: 'center' },
  container: { overflow: 'hidden', backgroundColor: '#edf4f4', borderWidth: 1, borderColor: '#e0eaed', boxShadow: '0 4px 14px rgba(42, 74, 88, 0.07)' },
  collapsed: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 },
  texture: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, opacity: 0.65 },
  openButton: { flex: 1, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 9 },
  mapContent: { position: 'absolute', top: 0, left: 0 },
  loading: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: '#eef3f5' },
  footer: { height: 54, paddingHorizontal: 15, backgroundColor: '#ffffff', flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  close: { position: 'absolute', top: 14, right: 14, width: 37, height: 37, borderRadius: 19, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(20, 46, 59, 0.15)' },
});

import { ChevronLeft } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import { Text } from '@/components/ui/text';

export function SectionHeading({ title, action, onPress }: { title: string; action?: string; onPress?: () => void }) {
  return (
    <View className="mb-3 flex-row-reverse items-center justify-between">
      <View className="flex-row-reverse items-center gap-2.5">
        <View className="h-5 w-1 rounded-full bg-primary" />
        <Text className="font-app-bold text-[18px] text-foreground">{title}</Text>
      </View>
      {action && onPress ? (
        <Pressable accessibilityRole="button" onPress={onPress} hitSlop={8} className="flex-row items-center gap-0.5 py-1">
          <ChevronLeft size={13} color="#8695a3" />
          <Text className="font-app text-[11px] text-muted-foreground">{action}</Text>
        </Pressable>
      ) : action ? <Text className="font-app text-[11px] text-muted-foreground">{action}</Text> : null}
    </View>
  );
}

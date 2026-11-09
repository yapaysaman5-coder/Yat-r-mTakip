import type { LucideIcon } from 'lucide-react-native';

import { PressableScale, Text } from '@/ui';

/** A button revealed by swiping a row (Düzenle, Al, Sat, Sil). */
export function SwipeAction({
  icon: Icon,
  label,
  color,
  bg,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  color: string;
  bg: string;
  onPress: () => void;
}) {
  return (
    <PressableScale
      onPress={onPress}
      haptic="light"
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{
        width: 72,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        backgroundColor: bg,
      }}>
      <Icon size={20} color={color} strokeWidth={2.4} />
      <Text variant="caption" color={color}>
        {label}
      </Text>
    </PressableScale>
  );
}

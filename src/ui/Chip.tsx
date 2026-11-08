import type { LucideIcon } from 'lucide-react-native';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { useColors } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

import { PressableScale } from './PressableScale';
import { Text } from './Text';

export interface ChipProps {
  label?: string;
  selected?: boolean;
  onPress?: () => void;
  /** Small colour dot before the label (e.g. market colour). */
  dotColor?: string;
  icon?: LucideIcon;
  size?: 'sm' | 'md';
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function Chip({
  label,
  selected = false,
  onPress,
  dotColor,
  icon: Icon,
  size = 'md',
  style,
  accessibilityLabel,
}: ChipProps) {
  const colors = useColors();
  const fg = selected ? colors.accent : colors.textSecondary;
  return (
    <PressableScale
      onPress={onPress}
      haptic="selection"
      scaleTo={0.94}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={accessibilityLabel ?? label}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.xs + 2,
          height: size === 'sm' ? 30 : 36,
          paddingHorizontal: label ? (size === 'sm' ? space.md : space.lg - 2) : space.sm + 2,
          borderRadius: radius.pill,
          backgroundColor: selected ? colors.accentSoft : 'transparent',
          borderWidth: 1,
          borderColor: selected ? 'transparent' : colors.border,
        },
        style,
      ]}>
      {dotColor ? (
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dotColor }} />
      ) : null}
      {Icon ? <Icon size={16} color={fg} strokeWidth={2.3} /> : null}
      {label ? (
        <Text variant={size === 'sm' ? 'caption' : 'subhead'} color={fg}>
          {label}
        </Text>
      ) : null}
    </PressableScale>
  );
}

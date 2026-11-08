import type { LucideIcon } from 'lucide-react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { useColors } from '@/theme/ThemeProvider';

import { PressableScale } from './PressableScale';

export interface IconButtonProps {
  icon: LucideIcon;
  onPress?: () => void;
  accessibilityLabel: string;
  size?: number;
  /** `soft` = tinted round well (default), `plain` = icon only, `glass` = for use on the hero gradient. */
  variant?: 'soft' | 'plain' | 'glass';
  color?: string;
  style?: StyleProp<ViewStyle>;
}

export function IconButton({
  icon: Icon,
  onPress,
  accessibilityLabel,
  size = 40,
  variant = 'soft',
  color,
  style,
}: IconButtonProps) {
  const colors = useColors();
  const background =
    variant === 'soft' ? colors.surfaceAlt : variant === 'glass' ? colors.heroGlass : 'transparent';
  const tint = color ?? (variant === 'glass' ? colors.heroText : colors.text);
  return (
    <PressableScale
      onPress={onPress}
      haptic="selection"
      scaleTo={0.9}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: background,
        },
        style,
      ]}>
      <Icon size={Math.round(size * 0.48)} color={tint} strokeWidth={2.2} />
    </PressableScale>
  );
}

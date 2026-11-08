import { LinearGradient } from 'expo-linear-gradient';
import type { LucideIcon } from 'lucide-react-native';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { radius, softShadow, space } from '@/theme/tokens';

import { PressableScale } from './PressableScale';
import { Text } from './Text';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'buy' | 'sell' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  fullWidth?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
}

const HEIGHT: Record<ButtonSize, number> = { sm: 36, md: 46, lg: 56 };
const PAD_X: Record<ButtonSize, number> = { sm: space.md, md: space.lg, lg: space.xl };
const RADIUS: Record<ButtonSize, number> = { sm: radius.sm, md: radius.md, lg: radius.lg };

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  fullWidth,
  disabled,
  style,
  accessibilityHint,
}: ButtonProps) {
  const { colors, dark } = useTheme();

  let background: string | null = null;
  let foreground = colors.text;
  let gradient: readonly [string, string, ...string[]] | null = null;
  let shadowColor: string | null = null;

  switch (variant) {
    case 'primary':
      gradient = colors.ctaGradient;
      foreground = colors.textOnAccent;
      shadowColor = colors.ctaGradient[0];
      break;
    case 'secondary':
      background = colors.surfaceAlt;
      foreground = colors.text;
      break;
    case 'ghost':
      background = 'transparent';
      foreground = colors.accent;
      break;
    case 'buy':
      background = colors.up;
      foreground = dark ? '#06261A' : '#FFFFFF';
      shadowColor = colors.up;
      break;
    case 'sell':
      background = colors.down;
      foreground = dark ? '#2E0710' : '#FFFFFF';
      shadowColor = colors.down;
      break;
    case 'danger':
      background = colors.downSoft;
      foreground = colors.down;
      break;
  }

  const shape: ViewStyle = {
    height: HEIGHT[size],
    paddingHorizontal: PAD_X[size],
    borderRadius: RADIUS[size],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  };

  const content = (
    <>
      {Icon ? <Icon size={size === 'sm' ? 16 : 20} color={foreground} strokeWidth={2.4} /> : null}
      <Text variant={size === 'sm' ? 'subhead' : 'bodyStrong'} color={foreground} numberOfLines={1}>
        {label}
      </Text>
    </>
  );

  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled }}
      style={[
        {
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          borderRadius: RADIUS[size],
          opacity: disabled ? 0.45 : 1,
          boxShadow: shadowColor && !disabled ? softShadow(shadowColor, 2) : undefined,
        },
        style,
      ]}>
      {gradient ? (
        <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={shape}>
          {content}
        </LinearGradient>
      ) : (
        <View style={[shape, { backgroundColor: background ?? 'transparent' }]}>{content}</View>
      )}
    </PressableScale>
  );
}

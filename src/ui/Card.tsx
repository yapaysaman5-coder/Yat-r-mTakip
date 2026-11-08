import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { radius, softShadow, space } from '@/theme/tokens';

import { PressableScale } from './PressableScale';

type Padding = keyof typeof space | 0;

export interface CardProps {
  children?: ReactNode;
  /** `surface` (default), `alt` (raised tile), `outline` (transparent with border). */
  variant?: 'surface' | 'alt' | 'outline';
  padding?: Padding;
  elevated?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function Card({
  children,
  variant = 'surface',
  padding = 'lg',
  elevated = false,
  onPress,
  style,
}: CardProps) {
  const { colors, dark } = useTheme();
  const base: ViewStyle = {
    borderRadius: radius.lg,
    padding: padding === 0 ? 0 : space[padding],
    backgroundColor:
      variant === 'surface'
        ? colors.surface
        : variant === 'alt'
          ? colors.surfaceAlt
          : 'transparent',
    borderWidth: variant === 'outline' || dark ? 1 : 0,
    borderColor: colors.border,
    boxShadow: elevated || !dark ? softShadow(colors.shadow, dark ? 2 : 1) : undefined,
  };
  if (onPress) {
    return (
      <PressableScale onPress={onPress} scaleTo={0.98} style={[base, style]}>
        {children}
      </PressableScale>
    );
  }
  return <View style={[base, style]}>{children}</View>;
}

export interface GradientCardProps {
  children?: ReactNode;
  colors: readonly [string, string, ...string[]];
  padding?: Padding;
  style?: StyleProp<ViewStyle>;
}

/** Card filled with a soft diagonal gradient (the balance "hero" card). */
export function GradientCard({ children, colors, padding = 'xl', style }: GradientCardProps) {
  const theme = useTheme();
  return (
    <View
      style={[
        {
          borderRadius: radius.xl,
          boxShadow: softShadow(theme.dark ? theme.colors.shadow : colors[0], 3),
        },
        style,
      ]}>
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          borderRadius: radius.xl,
          padding: padding === 0 ? 0 : space[padding],
          overflow: 'hidden',
          borderWidth: theme.dark ? 1 : 0,
          borderColor: 'rgba(255,255,255,0.08)',
        }}>
        {children}
      </LinearGradient>
    </View>
  );
}

import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { useColors } from '@/theme/ThemeProvider';
import { typography, type TextVariant } from '@/theme/tokens';
import type { ThemeColors } from '@/theme/types';

export type TextTone =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'accent'
  | 'accent2'
  | 'up'
  | 'down'
  | 'warning'
  | 'onAccent'
  | 'hero'
  | 'heroSecondary';

const TONE_TO_COLOR: Record<TextTone, keyof ThemeColors> = {
  primary: 'text',
  secondary: 'textSecondary',
  tertiary: 'textTertiary',
  accent: 'accent',
  accent2: 'accent2',
  up: 'up',
  down: 'down',
  warning: 'warning',
  onAccent: 'textOnAccent',
  hero: 'heroText',
  heroSecondary: 'heroTextSecondary',
};

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  tone?: TextTone;
  /** Raw colour, overrides `tone`. */
  color?: string;
  align?: 'left' | 'center' | 'right';
}

export function Text({
  variant = 'body',
  tone = 'primary',
  color,
  align,
  style,
  ...rest
}: TextProps) {
  const colors = useColors();
  return (
    <RNText
      // Large system text sizes are welcome, but numbers and titles must keep their layout.
      maxFontSizeMultiplier={
        rest.maxFontSizeMultiplier ??
        (variant.startsWith('num') || variant.startsWith('title') ? 1.25 : 1.6)
      }
      {...rest}
      style={[
        typography[variant],
        { color: color ?? (colors[TONE_TO_COLOR[tone]] as string) },
        align ? { textAlign: align } : null,
        style,
      ]}
    />
  );
}

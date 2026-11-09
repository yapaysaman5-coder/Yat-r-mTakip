import type { TextStyle } from 'react-native';

/**
 * Design tokens shared by every theme.
 *
 * Type: Inter throughout — a neutral, highly legible face that is standard in finance apps.
 * Every style uses tabular figures (`tnum`) so live-updating prices never jitter and
 * columns of amounts stay aligned.
 */

export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semiBold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extraBold: 'Inter_800ExtraBold',
} as const;

/** 4-pt spacing scale. */
export const space = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
} as const;

/** Generous, soft corner radii. */
export const radius = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 22,
  xl: 28,
  pill: 999,
} as const;

/** Horizontal screen gutter. */
export const GUTTER = space.lg;

export type TextVariant =
  | 'hero'
  | 'title1'
  | 'title2'
  | 'title3'
  | 'body'
  | 'bodyStrong'
  | 'callout'
  | 'subhead'
  | 'footnote'
  | 'caption'
  | 'overline'
  | 'numXL'
  | 'numL'
  | 'numM'
  | 'numS';

const BASE_TYPOGRAPHY: Record<TextVariant, TextStyle> = {
  hero: { fontFamily: fonts.bold, fontSize: 36, lineHeight: 44, letterSpacing: -1 },
  title1: { fontFamily: fonts.bold, fontSize: 28, lineHeight: 34, letterSpacing: -0.6 },
  title2: { fontFamily: fonts.bold, fontSize: 22, lineHeight: 28, letterSpacing: -0.4 },
  title3: { fontFamily: fonts.semiBold, fontSize: 17, lineHeight: 23, letterSpacing: -0.2 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21, letterSpacing: -0.1 },
  bodyStrong: { fontFamily: fonts.semiBold, fontSize: 15, lineHeight: 21, letterSpacing: -0.1 },
  callout: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 20, letterSpacing: -0.1 },
  subhead: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 19 },
  footnote: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16 },
  overline: { fontFamily: fonts.semiBold, fontSize: 11, lineHeight: 14, letterSpacing: 0.8 },
  numXL: { fontFamily: fonts.bold, fontSize: 36, lineHeight: 44, letterSpacing: -1 },
  numL: { fontFamily: fonts.semiBold, fontSize: 20, lineHeight: 26, letterSpacing: -0.4 },
  numM: { fontFamily: fonts.semiBold, fontSize: 15, lineHeight: 20, letterSpacing: -0.2 },
  numS: { fontFamily: fonts.semiBold, fontSize: 12.5, lineHeight: 16 },
};

const TABULAR: TextStyle['fontVariant'] = ['tabular-nums'];

/** Text styles; every one uses tabular figures (Android applies them via font features). */
export const typography = {} as Record<TextVariant, TextStyle>;
for (const key of Object.keys(BASE_TYPOGRAPHY) as TextVariant[]) {
  typography[key] = { ...BASE_TYPOGRAPHY[key], fontVariant: TABULAR };
}

/** Animation timings (ms) and spring presets — soft, with a little bounce. */
export const motion = {
  fast: 150,
  base: 250,
  slow: 350,
  springSoft: { damping: 18, stiffness: 180, mass: 0.9 },
  springBouncy: { damping: 12, stiffness: 220, mass: 0.8 },
  springSnappy: { damping: 22, stiffness: 320, mass: 0.7 },
} as const;

/** Soft, diffuse shadows; colour comes from the active theme. */
export function softShadow(color: string, level: 1 | 2 | 3 = 1): string {
  switch (level) {
    case 1:
      return `0px 4px 14px ${hexToRgba(color, 0.12)}`;
    case 2:
      return `0px 10px 28px ${hexToRgba(color, 0.18)}`;
    case 3:
      return `0px 18px 44px ${hexToRgba(color, 0.26)}`;
  }
}

function hexToRgba(hex: string, opacity: number): string {
  if (!hex.startsWith('#')) return hex;
  const h = hex.slice(1);
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/** Space reserved at the bottom of scrollable screens for the floating tab bar. */
export const TAB_BAR_HEIGHT = 68;
export const TAB_BAR_BOTTOM_GAP = 12;

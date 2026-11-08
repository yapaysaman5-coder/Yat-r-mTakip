import type { TextStyle } from 'react-native';

/**
 * Design tokens shared by every theme.
 *
 * Type: Nunito (rounded, friendly) for headings and all amounts, Nunito Sans for body copy.
 * Both families draw digits with equal widths by default, so live-updating prices never jitter.
 */

export const fonts = {
  display: 'Nunito_800ExtraBold',
  displayBlack: 'Nunito_900Black',
  displayBold: 'Nunito_700Bold',
  body: 'NunitoSans_400Regular',
  bodySemiBold: 'NunitoSans_600SemiBold',
  bodyBold: 'NunitoSans_700Bold',
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

export const typography: Record<TextVariant, TextStyle> = {
  hero: { fontFamily: fonts.displayBlack, fontSize: 38, lineHeight: 46, letterSpacing: -0.6 },
  title1: { fontFamily: fonts.display, fontSize: 28, lineHeight: 34, letterSpacing: -0.4 },
  title2: { fontFamily: fonts.display, fontSize: 22, lineHeight: 28, letterSpacing: -0.2 },
  title3: { fontFamily: fonts.displayBold, fontSize: 18, lineHeight: 24 },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 22 },
  bodyStrong: { fontFamily: fonts.bodyBold, fontSize: 16, lineHeight: 22 },
  callout: { fontFamily: fonts.bodySemiBold, fontSize: 15, lineHeight: 20 },
  subhead: { fontFamily: fonts.bodySemiBold, fontSize: 14, lineHeight: 19 },
  footnote: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: fonts.bodySemiBold, fontSize: 12, lineHeight: 16 },
  overline: { fontFamily: fonts.bodyBold, fontSize: 11, lineHeight: 14, letterSpacing: 1.2 },
  numXL: { fontFamily: fonts.displayBlack, fontSize: 38, lineHeight: 46, letterSpacing: -0.8 },
  numL: { fontFamily: fonts.display, fontSize: 22, lineHeight: 28, letterSpacing: -0.3 },
  numM: { fontFamily: fonts.displayBold, fontSize: 16, lineHeight: 21 },
  numS: { fontFamily: fonts.displayBold, fontSize: 13, lineHeight: 17 },
};

/** Animation timings (ms) and spring presets — soft and a little bouncy. */
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

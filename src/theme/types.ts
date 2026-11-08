export type ThemeId = 'okyanus' | 'gece' | 'gun' | 'kraliyet';

/** User preference: a fixed theme, or follow the device light/dark setting. */
export type ThemePreference = ThemeId | 'system';

export type MarketKey = 'bist' | 'us' | 'crypto' | 'cash';

export interface ThemeColors {
  /** Screen background. */
  bg: string;
  /** Card / sheet surface. */
  surface: string;
  /** Raised element on a surface (inputs, inner tiles). */
  surfaceAlt: string;
  /** Pressed state for surfaces. */
  surfacePressed: string;
  border: string;
  borderStrong: string;

  text: string;
  textSecondary: string;
  textTertiary: string;
  /** Text drawn on top of `accent` / gradients. */
  textOnAccent: string;

  accent: string;
  /** Tinted background derived from accent (chips, icon wells). */
  accentSoft: string;
  accent2: string;
  accent2Soft: string;

  up: string;
  upSoft: string;
  down: string;
  downSoft: string;
  warning: string;
  warningSoft: string;
  neutralSoft: string;

  /** Hero (balance) card gradient, top-left → bottom-right. */
  heroGradient: readonly [string, string, ...string[]];
  heroText: string;
  heroTextSecondary: string;
  /** Soft glass tint used for elements placed on the hero gradient. */
  heroGlass: string;

  /** Gradient used by the primary button and the centre tab button. */
  ctaGradient: readonly [string, string, ...string[]];

  chartLine: string;
  chartFill: string;

  tabBar: string;
  tabBarBorder: string;

  overlay: string;
  skeleton: string;
  shadow: string;

  market: Record<MarketKey, string>;
}

export interface Theme {
  id: ThemeId;
  name: string;
  tagline: string;
  dark: boolean;
  colors: ThemeColors;
}

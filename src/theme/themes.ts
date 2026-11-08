import type { Theme, ThemeColors, ThemeId } from './types';

/** `#RRGGBB` + opacity → `rgba(...)`. */
export function alpha(hex: string, opacity: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/**
 * Okyanus — the default. Deep, soft navy with a cheerful blue → sky gradient.
 * Calm and trustworthy, but never cold.
 */
const okyanus: ThemeColors = {
  bg: '#0B1830',
  surface: '#132544',
  surfaceAlt: '#1A3056',
  surfacePressed: '#223A66',
  border: '#1F3459',
  borderStrong: '#2C4572',

  text: '#F3F7FF',
  textSecondary: '#A6B8DA',
  textTertiary: '#8299C0',
  textOnAccent: '#FFFFFF',

  accent: '#6AA6FF',
  accentSoft: alpha('#6AA6FF', 0.16),
  accent2: '#7BD8F9',
  accent2Soft: alpha('#7BD8F9', 0.14),

  up: '#4BE0A6',
  upSoft: alpha('#4BE0A6', 0.14),
  down: '#FF8097',
  downSoft: alpha('#FF8097', 0.14),
  warning: '#FFC96B',
  warningSoft: alpha('#FFC96B', 0.14),
  neutralSoft: alpha('#A6B8DA', 0.12),

  heroGradient: ['#2453E0', '#2B5BE3', '#1A68C2'],
  heroText: '#FFFFFF',
  heroTextSecondary: 'rgba(255, 255, 255, 0.9)',
  heroGlass: 'rgba(255, 255, 255, 0.16)',

  ctaGradient: ['#2C62EC', '#1A68C2'],

  chartLine: '#FFFFFF',
  chartFill: 'rgba(255, 255, 255, 0.28)',

  tabBar: '#15284A',
  tabBarBorder: '#24395F',

  overlay: 'rgba(4, 10, 24, 0.62)',
  skeleton: '#1C3157',
  shadow: '#02060F',

  market: { bist: '#FF8A7A', us: '#7FA2FF', crypto: '#FFC46B', cash: '#5FE3C1' },
};

/** Gece — true black for OLED screens, with a playful mint + lavender accent. */
const gece: ThemeColors = {
  bg: '#000000',
  surface: '#111214',
  surfaceAlt: '#1A1B1F',
  surfacePressed: '#232429',
  border: '#1E1F24',
  borderStrong: '#2C2D33',

  text: '#FFFFFF',
  textSecondary: '#A3A3AE',
  textTertiary: '#888893',
  textOnAccent: '#04140D',

  accent: '#3EE0A1',
  accentSoft: alpha('#3EE0A1', 0.14),
  accent2: '#B49CFF',
  accent2Soft: alpha('#B49CFF', 0.14),

  up: '#3EE0A1',
  upSoft: alpha('#3EE0A1', 0.13),
  down: '#FF6F86',
  downSoft: alpha('#FF6F86', 0.13),
  warning: '#FFC857',
  warningSoft: alpha('#FFC857', 0.13),
  neutralSoft: alpha('#A3A3AE', 0.12),

  heroGradient: ['#1B2A24', '#14161A', '#17131F'],
  heroText: '#FFFFFF',
  heroTextSecondary: 'rgba(255, 255, 255, 0.66)',
  heroGlass: 'rgba(255, 255, 255, 0.08)',

  ctaGradient: ['#3EE0A1', '#7BE7C4'],

  chartLine: '#3EE0A1',
  chartFill: alpha('#3EE0A1', 0.22),

  tabBar: '#121316',
  tabBarBorder: '#222329',

  overlay: 'rgba(0, 0, 0, 0.7)',
  skeleton: '#1A1B1F',
  shadow: '#000000',

  market: { bist: '#FF7F7F', us: '#8AB4FF', crypto: '#FFC857', cash: '#3EE0A1' },
};

/** Gün — airy and light, for daytime; fresh greens and a bright blue sky gradient. */
const gun: ThemeColors = {
  bg: '#F3F6FC',
  surface: '#FFFFFF',
  surfaceAlt: '#EEF2FB',
  surfacePressed: '#E4EAF7',
  border: '#E4E9F4',
  borderStrong: '#D3DBEC',

  text: '#15203A',
  textSecondary: '#536180',
  textTertiary: '#5F6C88',
  textOnAccent: '#FFFFFF',

  accent: '#2F5BE0',
  accentSoft: alpha('#2F5BE0', 0.09),
  accent2: '#0A719B',
  accent2Soft: alpha('#0A719B', 0.09),

  up: '#08794F',
  upSoft: alpha('#08794F', 0.09),
  down: '#C92A47',
  downSoft: alpha('#C92A47', 0.09),
  warning: '#9A5B00',
  warningSoft: alpha('#9A5B00', 0.09),
  neutralSoft: alpha('#5B6987', 0.08),

  heroGradient: ['#2B5BE3', '#3360EA', '#1F6BC4'],
  heroText: '#FFFFFF',
  heroTextSecondary: 'rgba(255, 255, 255, 0.9)',
  heroGlass: 'rgba(255, 255, 255, 0.2)',

  ctaGradient: ['#2F5BE0', '#1F6BC4'],

  chartLine: '#FFFFFF',
  chartFill: 'rgba(255, 255, 255, 0.32)',

  tabBar: '#FFFFFF',
  tabBarBorder: '#E6EBF5',

  overlay: 'rgba(17, 27, 51, 0.38)',
  skeleton: '#E8EDF7',
  shadow: '#2A3D73',

  market: { bist: '#E5533F', us: '#4A69E8', crypto: '#D98A0B', cash: '#0F9F7E' },
};

/** Kraliyet — warm anthracite with soft gold; the private-banking mood. */
const kraliyet: ThemeColors = {
  bg: '#13110E',
  surface: '#1E1B16',
  surfaceAlt: '#27231D',
  surfacePressed: '#302B23',
  border: '#2B2620',
  borderStrong: '#3A342B',

  text: '#F7F0E3',
  textSecondary: '#C2B6A0',
  textTertiary: '#998E79',
  textOnAccent: '#1B1407',

  accent: '#E6C15A',
  accentSoft: alpha('#E6C15A', 0.14),
  accent2: '#F2D995',
  accent2Soft: alpha('#F2D995', 0.12),

  up: '#72D99C',
  upSoft: alpha('#72D99C', 0.13),
  down: '#F28A7E',
  downSoft: alpha('#F28A7E', 0.13),
  warning: '#F2B45A',
  warningSoft: alpha('#F2B45A', 0.13),
  neutralSoft: alpha('#C2B6A0', 0.1),

  heroGradient: ['#4B3B1F', '#2E2618', '#1F1B15'],
  heroText: '#FBF3E2',
  heroTextSecondary: 'rgba(251, 243, 226, 0.72)',
  heroGlass: 'rgba(230, 193, 90, 0.14)',

  ctaGradient: ['#E6C15A', '#F2D995'],

  chartLine: '#E6C15A',
  chartFill: alpha('#E6C15A', 0.24),

  tabBar: '#1F1C17',
  tabBarBorder: '#2F2A22',

  overlay: 'rgba(8, 6, 3, 0.68)',
  skeleton: '#27231D',
  shadow: '#000000',

  market: { bist: '#F28A7E', us: '#9DB4FF', crypto: '#E6C15A', cash: '#72D99C' },
};

export const THEMES: Record<ThemeId, Theme> = {
  okyanus: {
    id: 'okyanus',
    name: 'Okyanus',
    tagline: 'Derin mavi, sakin ve güven veren',
    dark: true,
    colors: okyanus,
  },
  gece: {
    id: 'gece',
    name: 'Gece',
    tagline: 'Saf siyah, OLED ekranlara özel',
    dark: true,
    colors: gece,
  },
  gun: {
    id: 'gun',
    name: 'Gün',
    tagline: 'Ferah ve aydınlık, gündüz için',
    dark: false,
    colors: gun,
  },
  kraliyet: {
    id: 'kraliyet',
    name: 'Kraliyet',
    tagline: 'Antrasit ve altın, özel bankacılık hissi',
    dark: true,
    colors: kraliyet,
  },
};

export const THEME_ORDER: ThemeId[] = ['okyanus', 'gece', 'gun', 'kraliyet'];

export const DEFAULT_THEME: ThemeId = 'okyanus';

/** Theme used for each device colour scheme when the preference is "system". */
export const SYSTEM_THEME_MAP: Record<'light' | 'dark', ThemeId> = {
  light: 'gun',
  dark: 'okyanus',
};

/** Colour-blind friendly up/down pair (blue / orange) applied on top of any theme. */
export function withColorBlindSafePalette(theme: Theme): Theme {
  const up = theme.dark ? '#5AA2FF' : '#2558C9';
  const down = theme.dark ? '#FFAA4D' : '#9A5100';
  return {
    ...theme,
    colors: {
      ...theme.colors,
      up,
      upSoft: alpha(up, theme.dark ? 0.15 : 0.11),
      down,
      downSoft: alpha(down, theme.dark ? 0.15 : 0.11),
    },
  };
}

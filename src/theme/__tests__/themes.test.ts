import { describe, expect, it } from '@jest/globals';

import { contrast } from '../contrast';
import { resolveThemeId } from '../resolve';
import { THEME_ORDER, THEMES, withColorBlindSafePalette } from '../themes';
import type { Theme } from '../types';

/** WCAG AA for normal-size text. */
const AA = 4.5;

function textPairs(t: Theme): [string, string, string][] {
  const c = t.colors;
  const pairs: [string, string, string][] = [];
  for (const [bgName, bg] of [
    ['bg', c.bg],
    ['surface', c.surface],
    ['surfaceAlt', c.surfaceAlt],
  ] as const) {
    pairs.push([`text on ${bgName}`, c.text, bg]);
    pairs.push([`textSecondary on ${bgName}`, c.textSecondary, bg]);
    pairs.push([`textTertiary on ${bgName}`, c.textTertiary, bg]);
  }
  for (const key of ['up', 'down', 'accent', 'accent2', 'warning'] as const) {
    pairs.push([`${key} on surface`, c[key], c.surface]);
  }
  pairs.push(['up on upSoft', c.up, c.upSoft]);
  pairs.push(['down on downSoft', c.down, c.downSoft]);
  pairs.push(['accent on accentSoft', c.accent, c.accentSoft]);
  pairs.push(['accent2 on accent2Soft', c.accent2, c.accent2Soft]);
  for (const stop of c.ctaGradient)
    pairs.push([`textOnAccent on cta ${stop}`, c.textOnAccent, stop]);
  for (const stop of c.heroGradient) {
    pairs.push([`heroText on hero ${stop}`, c.heroText, stop]);
    pairs.push([`heroTextSecondary on hero ${stop}`, c.heroTextSecondary, stop]);
  }
  return pairs;
}

describe.each(THEME_ORDER)('theme %s', (id) => {
  const theme = THEMES[id];

  it.each(textPairs(theme))('%s meets AA contrast', (_name, fg, bg) => {
    // Translucent backgrounds (soft tints) are composited over the card surface.
    expect(contrast(fg, bg, theme.colors.surface)).toBeGreaterThanOrEqual(AA);
  });

  it('keeps AA for up/down in colour-blind mode', () => {
    const cb = withColorBlindSafePalette(theme).colors;
    expect(contrast(cb.up, cb.surface)).toBeGreaterThanOrEqual(AA);
    expect(contrast(cb.down, cb.surface)).toBeGreaterThanOrEqual(AA);
    expect(contrast(cb.up, cb.upSoft, cb.surface)).toBeGreaterThanOrEqual(AA);
    expect(contrast(cb.down, cb.downSoft, cb.surface)).toBeGreaterThanOrEqual(AA);
  });
});

describe('resolveThemeId', () => {
  it('returns a fixed preference as is', () => {
    expect(resolveThemeId('kraliyet', 'light')).toBe('kraliyet');
  });

  it('maps the system preference to Gün (light) and Okyanus (dark)', () => {
    expect(resolveThemeId('system', 'light')).toBe('gun');
    expect(resolveThemeId('system', 'dark')).toBe('okyanus');
    expect(resolveThemeId('system', null)).toBe('okyanus');
  });
});

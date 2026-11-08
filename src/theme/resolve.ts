import { SYSTEM_THEME_MAP } from './themes';
import type { ThemeId, ThemePreference } from './types';

/** The theme to show for a preference and the device colour scheme. */
export function resolveThemeId(
  preference: ThemePreference,
  scheme: 'light' | 'dark' | null | undefined,
): ThemeId {
  if (preference === 'system') return SYSTEM_THEME_MAP[scheme === 'light' ? 'light' : 'dark'];
  return preference;
}

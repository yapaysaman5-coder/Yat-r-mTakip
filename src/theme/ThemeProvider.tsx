import { NavigationBar } from 'expo-navigation-bar';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { createContext, useContext, useEffect, useMemo, type PropsWithChildren } from 'react';
import { Platform, useColorScheme } from 'react-native';

import { useSettings } from '@/state/settings';

import { resolveThemeId } from './resolve';
import { DEFAULT_THEME, THEMES, withColorBlindSafePalette } from './themes';
import type { Theme } from './types';

export { resolveThemeId };

const ThemeContext = createContext<Theme>(THEMES[DEFAULT_THEME]);

export function ThemeProvider({ children }: PropsWithChildren) {
  const scheme = useColorScheme();
  const preference = useSettings((s) => s.themePreference);
  const colorBlindSafe = useSettings((s) => s.colorBlindSafe);

  const theme = useMemo(() => {
    const base = THEMES[resolveThemeId(preference, scheme)];
    return colorBlindSafe ? withColorBlindSafePalette(base) : base;
  }, [preference, scheme, colorBlindSafe]);

  // Keep the window background in sync so screen transitions never flash white.
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(theme.colors.bg).catch(() => {});
  }, [theme.colors.bg]);

  const barStyle = theme.dark ? 'light' : 'dark';

  return (
    <ThemeContext.Provider value={theme}>
      <StatusBar style={barStyle} />
      {Platform.OS === 'android' ? <NavigationBar style={theme.dark ? 'dark' : 'light'} /> : null}
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}

export function useColors() {
  return useContext(ThemeContext).colors;
}

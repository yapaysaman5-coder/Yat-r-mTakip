import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { kvStorage } from '@/lib/storage';
import type { ThemePreference } from '@/theme/types';

/** What the change badge on a holding row shows; tapping the badge cycles through these. */
export type ChangeDisplay = 'dailyPercent' | 'dailyAmount' | 'totalPercent';

const CHANGE_DISPLAY_CYCLE: ChangeDisplay[] = ['dailyPercent', 'dailyAmount', 'totalPercent'];

interface SettingsState {
  themePreference: ThemePreference;
  colorBlindSafe: boolean;
  /** Hide every amount behind dots (privacy mode). */
  privacyMode: boolean;
  hapticsEnabled: boolean;
  changeDisplay: ChangeDisplay;

  setThemePreference: (preference: ThemePreference) => void;
  setColorBlindSafe: (value: boolean) => void;
  togglePrivacyMode: () => void;
  setHapticsEnabled: (value: boolean) => void;
  cycleChangeDisplay: () => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      themePreference: 'okyanus',
      colorBlindSafe: false,
      privacyMode: false,
      hapticsEnabled: true,
      changeDisplay: 'dailyPercent',

      setThemePreference: (themePreference) => set({ themePreference }),
      setColorBlindSafe: (colorBlindSafe) => set({ colorBlindSafe }),
      togglePrivacyMode: () => set((s) => ({ privacyMode: !s.privacyMode })),
      setHapticsEnabled: (hapticsEnabled) => set({ hapticsEnabled }),
      cycleChangeDisplay: () =>
        set((s) => {
          const i = CHANGE_DISPLAY_CYCLE.indexOf(s.changeDisplay);
          return { changeDisplay: CHANGE_DISPLAY_CYCLE[(i + 1) % CHANGE_DISPLAY_CYCLE.length] };
        }),
    }),
    {
      name: 'settings',
      version: 1,
      storage: createJSONStorage(() => kvStorage),
      partialize: (s) => ({
        themePreference: s.themePreference,
        colorBlindSafe: s.colorBlindSafe,
        privacyMode: s.privacyMode,
        hapticsEnabled: s.hapticsEnabled,
        changeDisplay: s.changeDisplay,
      }),
    },
  ),
);

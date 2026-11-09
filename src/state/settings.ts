import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { kvStorage } from '@/lib/storage';
import type { ThemePreference } from '@/theme/types';

/** What the change badge on a holding row shows; tapping the badge cycles through these. */
export type ChangeDisplay = 'dailyPercent' | 'dailyAmount' | 'totalPercent';

const CHANGE_DISPLAY_CYCLE: ChangeDisplay[] = ['dailyPercent', 'dailyAmount', 'totalPercent'];

/** Order of the holdings list on the home screen; the sort chip cycles through these. */
export type HoldingSort = 'value' | 'dailyPercent' | 'totalPercent' | 'name';

const HOLDING_SORT_CYCLE: HoldingSort[] = ['value', 'dailyPercent', 'totalPercent', 'name'];

interface SettingsState {
  themePreference: ThemePreference;
  colorBlindSafe: boolean;
  /** Hide every amount behind dots (privacy mode). */
  privacyMode: boolean;
  hapticsEnabled: boolean;
  changeDisplay: ChangeDisplay;
  holdingSort: HoldingSort;
  /** Portfolio shown on the screens (null: the first one). */
  activePortfolioId: string | null;

  setThemePreference: (preference: ThemePreference) => void;
  setColorBlindSafe: (value: boolean) => void;
  togglePrivacyMode: () => void;
  setHapticsEnabled: (value: boolean) => void;
  cycleChangeDisplay: () => void;
  cycleHoldingSort: () => void;
  setActivePortfolioId: (id: string | null) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      themePreference: 'okyanus',
      colorBlindSafe: false,
      privacyMode: false,
      hapticsEnabled: true,
      changeDisplay: 'dailyPercent',
      holdingSort: 'value',
      activePortfolioId: null,

      setThemePreference: (themePreference) => set({ themePreference }),
      setColorBlindSafe: (colorBlindSafe) => set({ colorBlindSafe }),
      togglePrivacyMode: () => set((s) => ({ privacyMode: !s.privacyMode })),
      setHapticsEnabled: (hapticsEnabled) => set({ hapticsEnabled }),
      cycleChangeDisplay: () =>
        set((s) => {
          const i = CHANGE_DISPLAY_CYCLE.indexOf(s.changeDisplay);
          return { changeDisplay: CHANGE_DISPLAY_CYCLE[(i + 1) % CHANGE_DISPLAY_CYCLE.length] };
        }),
      cycleHoldingSort: () =>
        set((s) => {
          const i = HOLDING_SORT_CYCLE.indexOf(s.holdingSort);
          return { holdingSort: HOLDING_SORT_CYCLE[(i + 1) % HOLDING_SORT_CYCLE.length] };
        }),
      setActivePortfolioId: (activePortfolioId) => set({ activePortfolioId }),
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
        holdingSort: s.holdingSort,
        activePortfolioId: s.activePortfolioId,
      }),
    },
  ),
);

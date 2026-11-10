import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { kvStorage } from '@/lib/storage';
import type { EngineOptions } from '@/data/engine';
import { DEFAULT_FEES, type FeeSettings } from '@/data/fees';
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
  /** Yearly net deposit rate for the "Mevduat" comparison (0.4 = %40). */
  depositRate: number;
  /** "Ya Olsaydı?" in TL or in US dollars. */
  whatIfCurrency: 'TRY' | 'USD';
  /** "Ya Olsaydı?" replays money in/out (flows) or the buys and sells (trades). */
  whatIfBasis: 'flows' | 'trades';
  /** Cost basis method (Ayarlar › Hesaplama). */
  costMethod: EngineOptions['method'];
  fees: FeeSettings;
  /** Yearly risk-free rate for Sharpe, Sortino and Alpha. */
  riskFree: number;
  /** Biometric / device lock (Ayarlar › Güvenlik). */
  lockEnabled: boolean;
  /** Lock after this many seconds in the background (0 = right away). */
  lockAfter: 0 | 60 | 300;
  /** Start with amounts hidden. */
  startHidden: boolean;
  /** Block screenshots and hide the app in the app switcher. */
  secureScreen: boolean;
  /** The first-run welcome was shown. */
  onboarded: boolean;
  /** Portfolio shown on the screens (null: the first one). */
  activePortfolioId: string | null;

  setThemePreference: (preference: ThemePreference) => void;
  setColorBlindSafe: (value: boolean) => void;
  togglePrivacyMode: () => void;
  setHapticsEnabled: (value: boolean) => void;
  cycleChangeDisplay: () => void;
  cycleHoldingSort: () => void;
  setDepositRate: (rate: number) => void;
  setCostMethod: (m: EngineOptions['method']) => void;
  setFees: (f: FeeSettings) => void;
  setRiskFree: (r: number) => void;
  setLockEnabled: (v: boolean) => void;
  setLockAfter: (v: 0 | 60 | 300) => void;
  setStartHidden: (v: boolean) => void;
  setSecureScreen: (v: boolean) => void;
  setOnboarded: (v: boolean) => void;
  setWhatIfCurrency: (c: 'TRY' | 'USD') => void;
  setWhatIfBasis: (b: 'flows' | 'trades') => void;
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
      depositRate: 0.4,
      whatIfCurrency: 'TRY',
      whatIfBasis: 'flows',
      costMethod: 'average',
      fees: DEFAULT_FEES,
      riskFree: 0,
      lockEnabled: false,
      lockAfter: 60,
      startHidden: false,
      secureScreen: false,
      onboarded: false,
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
      setDepositRate: (depositRate) => set({ depositRate }),
      setCostMethod: (costMethod) => set({ costMethod }),
      setFees: (fees) => set({ fees }),
      setRiskFree: (riskFree) => set({ riskFree }),
      setLockEnabled: (lockEnabled) => set({ lockEnabled }),
      setLockAfter: (lockAfter) => set({ lockAfter }),
      setStartHidden: (startHidden) => set({ startHidden }),
      setSecureScreen: (secureScreen) => set({ secureScreen }),
      setOnboarded: (onboarded) => set({ onboarded }),
      setWhatIfCurrency: (whatIfCurrency) => set({ whatIfCurrency }),
      setWhatIfBasis: (whatIfBasis) => set({ whatIfBasis }),
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
        depositRate: s.depositRate,
        whatIfCurrency: s.whatIfCurrency,
        whatIfBasis: s.whatIfBasis,
        costMethod: s.costMethod,
        fees: s.fees,
        riskFree: s.riskFree,
        lockEnabled: s.lockEnabled,
        lockAfter: s.lockAfter,
        startHidden: s.startHidden,
        secureScreen: s.secureScreen,
        onboarded: s.onboarded,
        activePortfolioId: s.activePortfolioId,
      }),
    },
  ),
);

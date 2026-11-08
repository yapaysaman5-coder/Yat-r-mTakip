import type { StateStorage } from 'zustand/middleware';

/** Web preview fallback: localStorage, guarded because it can be unavailable. */
export const kvStorage: StateStorage = {
  getItem: (key) => {
    try {
      return globalThis.localStorage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  },
  setItem: (key, value) => {
    try {
      globalThis.localStorage?.setItem(key, value);
    } catch {
      // Ignore: preferences simply won't persist in this browser.
    }
  },
  removeItem: (key) => {
    try {
      globalThis.localStorage?.removeItem(key);
    } catch {
      // Ignore.
    }
  },
};

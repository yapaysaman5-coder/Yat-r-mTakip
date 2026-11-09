import { AppState, type AppStateStatus } from 'react-native';
import { create } from 'zustand';

import { getDatabase } from '@/data/database';
import { getMarketRouter, usesMockPrices } from '@/data/market';
import { instrumentFor, type Instrument } from '@/data/market/instruments';
import { dueInstruments } from '@/data/market/session';
import {
  addToWatchlist,
  loadQuotes,
  loadSyncStates,
  loadWatchlist,
  removeFromWatchlist,
  type StoredQuote,
} from '@/data/repo/market';
import { latestCloses } from '@/data/repo/prices';
import { marketNeeds, refreshQuotes, syncHistory, type MarketNeeds } from '@/data/service/market';

import { usePortfolioStore } from './portfolio';

/**
 * Live market data while the app is in front (docs/03-TEKNIK-MIMARI.md §7):
 * - on start: stored prices show at once; then missing history and fresh quotes are fetched,
 * - every few seconds the instruments whose interval has passed are refreshed (crypto 15 s,
 *   US 15 s, currencies 30 s, BIST 60 s while open),
 * - in the background nothing runs; coming back refreshes everything due,
 * - without internet the last stored prices stay on screen with an "offline" mark.
 */
export interface WatchItem {
  instrument: Instrument;
  quote: StoredQuote | null;
  /** Last 30 daily closes for the mini chart. */
  spark: number[];
}

interface MarketState {
  /** null until the first attempt. */
  online: boolean | null;
  /** Last time any price arrived (epoch ms). */
  lastUpdate: number | null;
  syncing: boolean;
  lastSync: { at: number; failed: [string, string][] } | null;
  watchlist: WatchItem[];
  sources: ReturnType<ReturnType<typeof getMarketRouter>['status']>;
  mock: boolean;

  start: () => void;
  refreshNow: () => Promise<void>;
  /** Records changed: the set of needed instruments may have changed too. */
  invalidate: () => void;
  addWatch: (assetId: string) => Promise<void>;
  removeWatch: (assetId: string) => Promise<void>;
}

const TICK_MS = 5_000;
const NEEDS_MS = 5 * 60_000;
const SYNC_MS = 30 * 60_000;
const RELOAD_MIN_GAP_MS = 10_000;

let started = false;
let busy = false;
let needs: MarketNeeds | null = null;
let needsAt = 0;
let needsKey = '';
let lastSyncAt = 0;
let lastReload = 0;
let reloadTimer: ReturnType<typeof setTimeout> | null = null;
const lastFetched = new Map<string, number>();
let appState: AppStateStatus = (AppState.currentState as AppStateStatus | null) ?? 'active';

function reloadPortfolio() {
  const view = usePortfolioStore.getState().view;
  if (!view || view.isDemo) return; // the example has its own prices
  const wait = lastReload + RELOAD_MIN_GAP_MS - Date.now();
  if (wait > 0) {
    reloadTimer ??= setTimeout(() => {
      reloadTimer = null;
      reloadPortfolio();
    }, wait);
    return;
  }
  lastReload = Date.now();
  usePortfolioStore.getState().reload();
}

async function readWatchlist(): Promise<WatchItem[]> {
  const db = await getDatabase();
  const ids = await loadWatchlist(db);
  const instruments = ids.flatMap((id) => {
    const i = instrumentFor(id);
    return i ? [i] : [];
  });
  const quotes = await loadQuotes(db, ids);
  const closes = await latestCloses(db, ids, 30);
  return instruments.map((instrument) => ({
    instrument,
    quote: quotes.get(instrument.id) ?? null,
    spark: (closes[instrument.id] ?? []).map((c) => c.close),
  }));
}

async function tick(force = false) {
  if (busy || appState !== 'active') return;
  busy = true;
  const set = useMarketStore.setState;
  try {
    const db = await getDatabase();
    const router = getMarketRouter();
    const now = Date.now();
    let changed = false;

    if (!needs || force || now - needsAt > NEEDS_MS) {
      needs = await marketNeeds(db, new Date(now));
      needsAt = now;
      const key = [...needs.historyFrom].map(([k, v]) => `${k}@${v}`).join('|');
      if (key !== needsKey) {
        needsKey = key;
        lastSyncAt = 0; // something new to download
      }
    }

    if (now - lastSyncAt > SYNC_MS) {
      set({ syncing: true });
      const report = await syncHistory(db, router, needs, { now: new Date(now) });
      lastSyncAt = now;
      changed ||= report.synced.length > 0;
      set({ syncing: false, lastSync: { at: now, failed: [...report.failed] } });
    }

    const live = needs.live.flatMap((id) => {
      const i = needs!.instruments.get(id);
      return i ? [i] : [];
    });
    const due = force ? live : dueInstruments(live, lastFetched, now);
    if (due.length) {
      const r = await refreshQuotes(db, router, due, { now: new Date(now) });
      for (const i of due) lastFetched.set(i.id, now);
      changed ||= r.quotes.size > 0;
      set({
        online: r.quotes.size > 0 ? true : r.offline ? false : useMarketStore.getState().online,
        lastUpdate: r.quotes.size > 0 ? now : useMarketStore.getState().lastUpdate,
      });
    }

    set({ watchlist: await readWatchlist(), sources: router.status() });
    if (changed) reloadPortfolio();
  } catch (e) {
    console.warn('market update failed', e);
    set({ syncing: false });
  } finally {
    busy = false;
  }
}

export const useMarketStore = create<MarketState>()((set) => ({
  online: null,
  lastUpdate: null,
  syncing: false,
  lastSync: null,
  watchlist: [],
  sources: [],
  mock: usesMockPrices(),

  start: () => {
    if (started) return;
    started = true;
    // Stored prices first (instant, offline too), then the network.
    readWatchlist()
      .then(async (watchlist) => {
        const db = await getDatabase();
        const quotes = await loadQuotes(db);
        const latest = Math.max(0, ...[...quotes.values()].map((q) => q.fetchedAt));
        const states = await loadSyncStates(db);
        const syncedAt = Math.max(0, ...[...states.values()].map((s) => s.syncedAt));
        set({
          watchlist,
          lastUpdate: latest || null,
          lastSync: syncedAt ? { at: syncedAt, failed: [] } : null,
        });
      })
      .catch(() => undefined)
      .finally(() => tick(true));
    setInterval(() => tick(), TICK_MS);
    // New records (a new asset, an earlier date) can change what needs prices.
    const keyOf = (s: ReturnType<typeof usePortfolioStore.getState>) =>
      `${s.portfolios.length}:${s.view?.portfolio.id}:${s.view?.data.txns.length}`;
    usePortfolioStore.subscribe((now, before) => {
      if (keyOf(now) === keyOf(before)) return;
      needs = null;
      tick();
    });
    AppState.addEventListener('change', (next) => {
      const wasBackground = appState !== 'active';
      appState = next;
      if (next === 'active' && wasBackground) tick();
    });
  },

  refreshNow: async () => {
    lastSyncAt = 0;
    lastFetched.clear();
    await tick(true);
  },

  invalidate: () => {
    needs = null;
  },

  addWatch: async (assetId) => {
    await addToWatchlist(await getDatabase(), assetId);
    needs = null;
    set({ watchlist: await readWatchlist() });
    tick();
  },

  removeWatch: async (assetId) => {
    await removeFromWatchlist(await getDatabase(), assetId);
    needs = null;
    set({ watchlist: await readWatchlist() });
  },
}));

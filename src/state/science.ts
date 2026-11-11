import { useEffect, useState } from 'react';

import { getDatabase } from '@/data/database';
import { usesMockPrices } from '@/data/market';
import { fetchBytes, type FactorRow } from '@/data/market/providers/french';
import { loadAssetHistory, type AssetHistory } from '@/data/service/assetHistory';
import { demoFactors, loadFactors, syncFactors } from '@/data/service/factors';
import { FACTOR_LOOKBACK_DAYS } from '@/data/service/market';
import type { PortfolioView } from '@/data/view/portfolioView';
import { addDays } from '@/domain';

import { useMarketStore } from './market';

/**
 * Data the science features read on demand: every asset's daily prices on one calendar
 * (behaviour, risk, factors) and the Fama–French factor returns.
 *
 * The portfolio view is rebuilt every few seconds while prices stream, but the daily history
 * only changes with the records, the day and a history download. It is cached on those, and
 * the previous history stays on screen while a new one loads.
 */
const historyCache = new Map<string, Promise<AssetHistory>>();

function historyKey(view: PortfolioView, syncedAt: number): string {
  let h = 0;
  for (const t of view.data.txns) {
    const s = `${t.id}|${t.ts}|${t.quantity ?? ''}|${t.price ?? ''}|${t.splitRatio ?? ''}`;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return `${view.portfolio.id}:${view.today}:${view.data.txns.length}:${h}:${syncedAt}`;
}

function historyFor(view: PortfolioView, key: string): Promise<AssetHistory> {
  let p = historyCache.get(key);
  if (!p) {
    const back = addDays(view.today, -FACTOR_LOOKBACK_DAYS);
    const first = view.series.dates[0] ?? view.today;
    p = getDatabase().then((db) =>
      loadAssetHistory(db, view, { from: back < first ? back : first }),
    );
    historyCache.set(key, p);
    // Keep the last few only.
    while (historyCache.size > 4) historyCache.delete(historyCache.keys().next().value!);
  }
  return p;
}

/** The view's asset price history (null while the first one loads). */
export function useAssetHistory(view: PortfolioView): AssetHistory | null {
  const syncedAt = useMarketStore((s) => s.lastSync?.at ?? 0);
  const key = historyKey(view, syncedAt);
  const [state, setState] = useState<{
    key: string;
    portfolio: string;
    history: AssetHistory;
  } | null>(null);
  useEffect(() => {
    let live = true;
    // Same key: the cached promise, and the state stays the same object (no re-render).
    historyFor(view, key).then(
      (history) =>
        live &&
        setState((prev) =>
          prev?.key === key ? prev : { key, portfolio: view.portfolio.id, history },
        ),
      () => undefined,
    );
    return () => {
      live = false;
    };
  }, [view, key]);
  return state && state.portfolio === view.portfolio.id ? state.history : null;
}

export interface FactorState {
  status: 'loading' | 'ready' | 'failed' | 'none';
  rows: FactorRow[];
  /** Fictional factors (example portfolio and web preview). */
  demo: boolean;
  lastDate: string | null;
  error?: string;
}

let syncing: Promise<unknown> | null = null;

/** Fama–French rows for the view's US positions; downloads them on the phone when stale. */
export function useFactors(view: PortfolioView, history: AssetHistory | null): FactorState {
  const usIds = view.holdings.filter((h) => h.market === 'us').map((h) => h.assetId);
  const demo = view.isDemo || usesMockPrices();
  const [state, setState] = useState<FactorState>({
    status: 'loading',
    rows: [],
    demo,
    lastDate: null,
  });
  const key = usIds.join(',');
  useEffect(() => {
    let live = true;
    const set = (s: FactorState) => live && setState(s);
    if (!history) return;
    const ids = key ? key.split(',') : [];
    if (ids.length === 0) {
      set({ status: 'none', rows: [], demo, lastDate: null });
      return;
    }
    if (demo) {
      const rows = demoFactors(history, ids);
      set({ status: 'ready', rows, demo, lastDate: rows.at(-1)?.date ?? null });
      return;
    }
    (async () => {
      const db = await getDatabase();
      const from = history.dates[0];
      let rows = await loadFactors(db, from);
      if (rows.length) set({ status: 'ready', rows, demo, lastDate: rows.at(-1)!.date });
      syncing ??= syncFactors(db, fetchBytes).finally(() => (syncing = null));
      const result = (await syncing) as Awaited<ReturnType<typeof syncFactors>>;
      if (result.status === 'synced') rows = await loadFactors(db, from);
      if (rows.length) {
        set({ status: 'ready', rows, demo, lastDate: rows.at(-1)!.date, error: result.error });
      } else {
        set({
          status: 'failed',
          rows: [],
          demo,
          lastDate: null,
          error: result.error ?? 'Faktör verisi yok',
        });
      }
    })().catch((e: unknown) =>
      set({ status: 'failed', rows: [], demo, lastDate: null, error: String(e) }),
    );
    return () => {
      live = false;
    };
  }, [history, key, demo]);
  return state;
}

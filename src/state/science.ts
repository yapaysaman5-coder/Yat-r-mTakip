import { useEffect, useState } from 'react';

import { getDatabase } from '@/data/database';
import { usesMockPrices } from '@/data/market';
import { fetchBytes, type FactorRow } from '@/data/market/providers/french';
import { loadAssetHistory, type AssetHistory } from '@/data/service/assetHistory';
import { demoFactors, loadFactors, syncFactors } from '@/data/service/factors';
import { FACTOR_LOOKBACK_DAYS } from '@/data/service/market';
import type { PortfolioView } from '@/data/view/portfolioView';
import { addDays } from '@/domain';

/**
 * Data the science features read on demand: every asset's daily prices on one calendar
 * (behaviour, risk, factors) and the Fama–French factor returns. Loaded once per portfolio view.
 */
const historyCache = new WeakMap<PortfolioView, Promise<AssetHistory>>();

function historyFor(view: PortfolioView): Promise<AssetHistory> {
  let p = historyCache.get(view);
  if (!p) {
    const back = addDays(view.today, -FACTOR_LOOKBACK_DAYS);
    const first = view.series.dates[0] ?? view.today;
    p = getDatabase().then((db) =>
      loadAssetHistory(db, view, { from: back < first ? back : first }),
    );
    historyCache.set(view, p);
  }
  return p;
}

/** The view's asset price history (null while loading). */
export function useAssetHistory(view: PortfolioView): AssetHistory | null {
  const [state, setState] = useState<{ view: PortfolioView; history: AssetHistory } | null>(null);
  useEffect(() => {
    let live = true;
    historyFor(view).then(
      (history) => live && setState({ view, history }),
      () => live && setState(null),
    );
    return () => {
      live = false;
    };
  }, [view]);
  return state && state.view === view ? state.history : null;
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

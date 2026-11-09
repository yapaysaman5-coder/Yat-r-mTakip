import { create } from 'zustand';

import { ensureStarterData, getDatabase } from '@/data/database';
import { DEFAULT_ENGINE } from '@/data/engine';
import { listPortfolios } from '@/data/repo/portfolios';
import { loadPortfolioData } from '@/data/service/load';
import {
  deleteTransaction,
  deleteTransactions,
  restoreTransactions,
  saveTransaction,
  type BatchResult,
  type ChangeResult,
} from '@/data/service/transactions';
import type { Portfolio } from '@/data/types';
import { buildAnalysis, type AnalysisView } from '@/data/view/analysisView';
import { buildPortfolioView, type PortfolioView } from '@/data/view/portfolioView';
import type { Transaction } from '@/domain';

import { useSettings } from './settings';

/**
 * The active portfolio's figures, read from the database. Screens subscribe to `view`; every
 * change goes through the transaction service and then reloads the view.
 */
interface PortfolioState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;
  portfolios: Portfolio[];
  view: PortfolioView | null;
  /** Time the last load took (ms), shown in Ayarlar › Veri. */
  loadMs: number;

  init: () => Promise<void>;
  reload: () => Promise<void>;
  select: (id: string) => Promise<void>;
  save: (txn: Transaction) => Promise<ChangeResult>;
  remove: (id: string) => Promise<ChangeResult>;
  /** Several records as one change (e.g. all of an asset's), and putting them back. */
  removeMany: (ids: string[]) => Promise<BatchResult>;
  restoreMany: (txns: Transaction[]) => Promise<BatchResult>;
}

let loading: Promise<void> | null = null;

async function load(set: (s: Partial<PortfolioState>) => void) {
  const started = Date.now();
  const db = await getDatabase();
  await ensureStarterData(db);
  const portfolios = await listPortfolios(db);
  const wanted = useSettings.getState().activePortfolioId;
  const active =
    portfolios.find((p) => p.id === wanted) ??
    portfolios.find((p) => p.kind === 'demo') ??
    portfolios[0];
  const data = active ? await loadPortfolioData(db, active.id, { engine: DEFAULT_ENGINE }) : null;
  set({
    status: 'ready',
    error: null,
    portfolios,
    view: data ? buildPortfolioView(data) : null,
    loadMs: Date.now() - started,
  });
  if (active && active.id !== wanted) useSettings.getState().setActivePortfolioId(active.id);
}

export const usePortfolioStore = create<PortfolioState>()((set, get) => ({
  status: 'idle',
  error: null,
  portfolios: [],
  view: null,
  loadMs: 0,

  init: async () => {
    if (get().status === 'ready') return;
    await get().reload();
  },

  reload: async () => {
    if (get().status !== 'ready') set({ status: 'loading' });
    loading = (loading ?? Promise.resolve()).then(() =>
      load(set).catch((e: unknown) => {
        set({ status: 'error', error: e instanceof Error ? e.message : String(e) });
      }),
    );
    await loading;
  },

  select: async (id) => {
    useSettings.getState().setActivePortfolioId(id);
    await get().reload();
  },

  save: async (txn) => {
    const view = get().view;
    if (!view) return { ok: false, rejection: { code: 'NOT_FOUND' } };
    const result = await saveTransaction(await getDatabase(), view.portfolio.id, txn);
    if (result.ok) await get().reload();
    return result;
  },

  removeMany: async (ids) => {
    const view = get().view;
    if (!view) return { ok: false, rejection: { code: 'NOT_FOUND' } };
    const result = await deleteTransactions(await getDatabase(), view.portfolio.id, ids);
    if (result.ok) await get().reload();
    return result;
  },

  restoreMany: async (txns) => {
    const view = get().view;
    if (!view) return { ok: false, rejection: { code: 'NOT_FOUND' } };
    const result = await restoreTransactions(await getDatabase(), view.portfolio.id, txns);
    if (result.ok) await get().reload();
    return result;
  },

  remove: async (id) => {
    const view = get().view;
    if (!view) return { ok: false, rejection: { code: 'NOT_FOUND' } };
    const result = await deleteTransaction(await getDatabase(), view.portfolio.id, id);
    if (result.ok) await get().reload();
    return result;
  },
}));

/** The active portfolio's figures (available once the app has started). */
export function usePortfolioView(): PortfolioView {
  const view = usePortfolioStore((s) => s.view);
  if (!view) throw new Error('Portfolio view is not loaded yet');
  return view;
}

/** Analiz figures for the active portfolio, computed once per loaded view. */
const analysisCache = new WeakMap<PortfolioView, AnalysisView>();
export function useAnalysis(): AnalysisView {
  const view = usePortfolioView();
  let a = analysisCache.get(view);
  if (!a) {
    a = buildAnalysis(view);
    analysisCache.set(view, a);
  }
  return a;
}

import { ols } from '@/domain';

import { FACTOR_KEYS, type FactorKey, type FactorRow } from '../market/providers/french';
import type { AssetHistory } from '../service/assetHistory';
import type { PortfolioView } from './portfolioView';

export { FACTOR_KEYS, type FactorKey, type FactorRow };

/**
 * Faktör analizi (docs/02-HESAPLAMA-MOTORU.md §16.7): the US positions' daily returns regressed
 * on the Fama–French five factors (2015) and momentum (Carhart 1997), from Kenneth French's
 * data library. Today's US positions and weights, over their common history.
 */
export interface FactorLoading {
  key: FactorKey;
  beta: number;
  t: number;
  /** |t| ≥ 2: unlikely to be chance. */
  significant: boolean;
}

export interface FactorReport {
  /** Trading days in the regression. */
  n: number;
  enough: boolean;
  /** US positions included and their share of the US part. */
  positions: { symbol: string; weight: number }[];
  /** Share of the whole portfolio the analysis covers. */
  coverage: number;
  loadings: FactorLoading[];
  /** Yearly alpha (252 trading days) and its t statistic. */
  alphaAnnual: number | null;
  alphaT: number | null;
  r2: number | null;
  /** Last date of the factor data (the library is updated monthly). */
  lastFactorDate: string | null;
}

export const FACTOR_MIN_DAYS = 60;

export function factorReport(
  view: PortfolioView,
  history: AssetHistory,
  factors: readonly FactorRow[],
): FactorReport {
  const us = view.holdings.filter((h) => h.market === 'us' && history.assets.has(h.assetId));
  const usValue = us.reduce((s, h) => s + h.valueTRY, 0);
  const positions = us.map((h) => ({
    symbol: h.symbol,
    weight: usValue > 0 ? h.valueTRY / usValue : 0,
  }));
  const base: FactorReport = {
    n: 0,
    enough: false,
    positions,
    coverage: view.summary.totalValue > 0 ? usValue / view.summary.totalValue : 0,
    loadings: [],
    alphaAnnual: null,
    alphaT: null,
    r2: null,
    lastFactorDate: factors.length ? factors[factors.length - 1].date : null,
  };
  if (us.length === 0 || factors.length === 0) return base;

  const index = new Map(history.dates.map((d, i) => [d, i]));
  const y: number[] = [];
  const x: number[][] = FACTOR_KEYS.map(() => []);
  let prev: FactorRow | null = null;
  for (const f of factors) {
    const i = index.get(f.date);
    const j = prev ? index.get(prev.date) : undefined;
    prev = f;
    if (i === undefined || j === undefined) continue;
    // The US part's return in dollars from the previous trading day, at today's weights.
    let r = 0;
    let ok = true;
    for (let k = 0; k < us.length; k++) {
      const p = history.assets.get(us[k].assetId)!.adjusted;
      const a = p[j];
      const b = p[i];
      if (a === null || b === null || a <= 0) {
        ok = false;
        break;
      }
      r += positions[k].weight * (b / a - 1);
    }
    if (!ok) continue;
    y.push(r - f.rf);
    FACTOR_KEYS.forEach((key, k) => x[k].push(f.values[key]));
  }
  const n = y.length;
  if (n < FACTOR_MIN_DAYS) return { ...base, n };
  const fit = ols(y, x);
  if (!fit) return { ...base, n };
  return {
    ...base,
    n,
    enough: true,
    loadings: FACTOR_KEYS.map((key, k) => ({
      key,
      beta: fit.coef[k + 1],
      t: fit.t[k + 1],
      significant: Math.abs(fit.t[k + 1]) >= 2,
    })),
    alphaAnnual: fit.coef[0] * 252,
    alphaT: fit.t[0],
    r2: fit.r2,
  };
}

/** What each factor means, in plain Turkish (for positive and negative exposure). */
export const FACTOR_TEXT: Record<FactorKey, { name: string; up: string; down: string }> = {
  'Mkt-RF': {
    name: 'Piyasa',
    up: 'piyasadan daha oynak (beta 1’in üstünde)',
    down: 'piyasadan daha sakin (beta 1’in altında)',
  },
  SMB: { name: 'Büyüklük', up: 'küçük şirketlere eğilim', down: 'büyük şirketlere eğilim' },
  HML: {
    name: 'Değer',
    up: 'ucuz (değer) hisselere eğilim',
    down: 'pahalı (büyüme) hisselere eğilim',
  },
  RMW: {
    name: 'Kârlılık',
    up: 'kârlı şirketlere eğilim',
    down: 'kârlılığı zayıf şirketlere eğilim',
  },
  CMA: {
    name: 'Yatırım',
    up: 'temkinli büyüyen şirketlere eğilim',
    down: 'hızlı büyüyen (çok yatırım yapan) şirketlere eğilim',
  },
  MOM: {
    name: 'Momentum',
    up: 'son bir yılda yükselenlere eğilim',
    down: 'son bir yılda düşenlere eğilim',
  },
};

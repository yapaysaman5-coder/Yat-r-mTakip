import { correlationOf, covariance } from '@/domain';

import { tryReturns, type AssetHistory } from '../service/assetHistory';
import type { HoldingMarket, PortfolioView } from './portfolioView';

/**
 * Portföy sağlığı (docs/02-HESAPLAMA-MOTORU.md §16.4): how the positions move together and
 * where the risk really comes from (Markowitz 1952; risk contributions / "risk budgeting").
 * Today's positions and weights over their last year of daily TRY returns.
 */
export interface HealthAsset {
  assetId: string;
  symbol: string;
  market: HoldingMarket;
  weight: number;
  /** Yearly volatility of the asset alone. */
  volatility: number;
  /** Share of the portfolio's risk (sums to 1 over the positions). */
  riskShare: number;
}

export interface HealthReport {
  /** Common days with returns for every position. */
  days: number;
  enough: boolean;
  assets: HealthAsset[];
  /** Yearly volatility of today's positions (cash included at weight, without risk). */
  volatility: number | null;
  /** Σ wᵢσᵢ ÷ σₚ: 1 = no diversification benefit; higher = more. */
  diversificationRatio: number | null;
  /** 1 ÷ Σ wᵢ² over the positions. */
  effectivePositions: number;
  /** 1 ÷ Σ (risk share)²: how many positions really carry the risk. */
  effectiveRiskPositions: number | null;
  averageCorrelation: number | null;
  /** Correlation matrix of the largest positions (same order as `matrixIds`). */
  matrix: number[][];
  matrixIds: string[];
}

export const HEALTH_MIN_DAYS = 30;
const MATRIX_MAX = 8;

export function healthReport(view: PortfolioView, history: AssetHistory): HealthReport {
  const total = view.summary.totalValue;
  const held = view.holdings.filter((h) => h.valueTRY > 0 && history.assets.has(h.assetId));
  const weights = held.map((h) => (total > 0 ? h.valueTRY / total : 0));
  const sumW = weights.reduce((a, b) => a + b, 0);
  const effectivePositions = sumW > 0 ? 1 / weights.reduce((a, w) => a + (w / sumW) ** 2, 0) : 0;
  const empty: HealthReport = {
    days: 0,
    enough: false,
    assets: [],
    volatility: null,
    diversificationRatio: null,
    effectivePositions,
    effectiveRiskPositions: null,
    averageCorrelation: null,
    matrix: [],
    matrixIds: [],
  };
  if (held.length === 0) return empty;

  // Last year of the calendar, days where every position has a return.
  const returns = held.map((h) => tryReturns(history.assets.get(h.assetId)!));
  const startIdx = Math.max(1, history.dates.length - 365);
  const rows: number[] = [];
  for (let i = startIdx; i < history.dates.length; i++) {
    if (returns.every((r) => r[i] !== null)) rows.push(i);
  }
  const series = returns.map((r) => rows.map((i) => r[i]!));
  if (rows.length < HEALTH_MIN_DAYS) return { ...empty, days: rows.length };

  const k = held.length;
  const cov = Array.from({ length: k }, (_, a) =>
    Array.from({ length: k }, (_, b) => covariance(series[a], series[b]) * 365),
  );
  const sigma = cov.map((row, i) => Math.sqrt(Math.max(0, row[i])));
  const sw = cov.map((row) => row.reduce((s, c, j) => s + c * weights[j], 0));
  const varP = weights.reduce((s, w, i) => s + w * sw[i], 0);
  const volP = Math.sqrt(Math.max(0, varP));
  const shares = weights.map((w, i) => (varP > 0 ? (w * sw[i]) / varP : 0));

  const order = held
    .map((h, i) => ({ i, w: weights[i] }))
    .sort((a, b) => b.w - a.w)
    .slice(0, MATRIX_MAX)
    .map((x) => x.i);
  const matrix = order.map((a) =>
    order.map((b) => (a === b ? 1 : correlationOf(series[a], series[b]))),
  );
  let pairs = 0;
  let sumCorr = 0;
  for (let a = 0; a < k; a++) {
    for (let b = a + 1; b < k; b++) {
      sumCorr += correlationOf(series[a], series[b]);
      pairs++;
    }
  }
  const sumShare2 = shares.reduce((s, x) => s + x * x, 0);
  return {
    days: rows.length,
    enough: true,
    assets: held
      .map((h, i) => ({
        assetId: h.assetId,
        symbol: h.symbol,
        market: h.market,
        weight: weights[i],
        volatility: sigma[i],
        riskShare: shares[i],
      }))
      .sort((a, b) => b.riskShare - a.riskShare),
    volatility: volP,
    diversificationRatio: volP > 0 ? weights.reduce((s, w, i) => s + w * sigma[i], 0) / volP : null,
    effectivePositions,
    effectiveRiskPositions: sumShare2 > 0 ? 1 / sumShare2 : null,
    averageCorrelation: pairs > 0 ? sumCorr / pairs : null,
    matrix,
    matrixIds: order.map((i) => held[i].symbol),
  };
}

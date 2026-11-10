/**
 * Analiz figures: "Ya Olsaydı?" replays, TWR, XIRR, Alpha and risk measures. Computed only
 * when the Analiz screen asks for them (they replay every benchmark).
 */
import {
  annualize,
  beta,
  jensenAlpha,
  maxDrawdown,
  riskLevel,
  sharpe,
  simulateWhatIf,
  sortino,
  stepReturns,
  trDay,
  unitize,
  volatility,
  xirr,
  type CashFlow,
} from '@/domain';

import { MAIN_BENCHMARK } from '../benchmarks';
import { rangeStartIndex, type PortfolioView } from './portfolioView';

export type AnalysisPeriod = '1A' | '3A' | '6A' | 'YB' | '1Y' | 'Tümü';
export const ANALYSIS_PERIODS: AnalysisPeriod[] = ['1A', '3A', '6A', 'YB', '1Y', 'Tümü'];

export interface ComparedSeries {
  key: string;
  name: string;
  /** Value of the replayed cash flows per day (for the portfolio: its real value). */
  values: number[];
  /** Price level per day (for the portfolio: its internal unit value). */
  prices: number[];
}

export interface MonthReturn {
  month: string;
  ratio: number;
}

export interface Metrics {
  twr: number;
  twrAnnual: number;
  xirr: number | null;
  /** null without benchmark prices. */
  alpha: number | null;
  beta: number | null;
  excessReturn: number | null;
  volatility: number;
  sharpe: number;
  sortino: number;
  maxDrawdown: number;
  riskLevel: number;
  bestMonth: MonthReturn | null;
  worstMonth: MonthReturn | null;
  months: MonthReturn[];
}

export interface AnalysisOptions {
  /** Replay in TL, or in US dollars (every amount at that day's rate). */
  currency: 'TRY' | 'USD';
  /** Replay the money put in and taken out, or the buys and sells (positions only). */
  basis: 'flows' | 'trades';
  /** Yearly risk-free rate for Sharpe, Sortino and Alpha (Ayarlar › Hesaplama). */
  riskFree?: number;
}

export const DEFAULT_ANALYSIS: AnalysisOptions = { currency: 'TRY', basis: 'flows' };

export interface AnalysisView {
  options: AnalysisOptions;
  /** USD is possible only with a Dolar/TL series. */
  usdAvailable: boolean;
  dates: string[];
  netInvested: number[];
  periodStart: Record<AnalysisPeriod, number>;
  /** The portfolio first, then every benchmark with prices. */
  series: ComparedSeries[];
  mainBenchmark: ComparedSeries | null;
  metrics: Metrics | null;
  riskFree: number;
}

export function buildAnalysis(
  view: PortfolioView,
  options: AnalysisOptions = DEFAULT_ANALYSIS,
): AnalysisView {
  const { dates } = view.series;
  const n = dates.length;
  const usdSeries = view.data.benchmarks.find((b) => b.key === 'usd' && b.prices.length === n);
  const usdAvailable = !!usdSeries && usdSeries.prices.every((p) => p > 0);
  const currency = options.currency === 'USD' && usdAvailable ? 'USD' : 'TRY';
  const rate = (i: number) => (currency === 'USD' ? usdSeries!.prices[i] : 1);

  // What the replay invests: money in/out, or the buys and sells.
  let rawFlows = view.series.flows;
  let rawValues = view.series.values;
  if (options.basis === 'trades') {
    const index = new Map(dates.map((d, i) => [d, i]));
    rawFlows = dates.map(() => 0);
    for (const h of view.history) {
      if (h.type !== 'BUY' && h.type !== 'SELL') continue;
      const i = index.get(trDay(h.ts));
      if (i !== undefined) rawFlows[i] += -h.amountTRY; // a buy puts money in (+)
    }
    rawValues = view.series.values.map((v, i) => v - view.series.cash[i]);
  }
  const flows = rawFlows.map((f, i) => f / rate(i));
  const values = rawValues.map((v, i) => v / rate(i));
  let running = 0;
  const netInvested = flows.map((f) => (running += f));
  const unitValues =
    currency === 'TRY' && options.basis === 'flows'
      ? view.series.unitValues
      : unitize(dates.map((date, i) => ({ date, value: values[i], flow: flows[i] }))).map(
          (u) => u.unitValue,
        );
  const indexedFlows = flows.flatMap((amount, index) => (amount !== 0 ? [{ index, amount }] : []));

  const me: ComparedSeries = { key: 'me', name: 'Portföyüm', values, prices: unitValues };
  const benchmarks: ComparedSeries[] = view.data.benchmarks
    .filter((b) => b.prices.length === n && n > 0)
    .map((b) => {
      const prices = b.prices.map((p, i) => p / rate(i));
      return {
        key: b.key,
        name: b.name,
        prices,
        values: simulateWhatIf(prices, indexedFlows).values,
      };
    });
  const main = benchmarks.find((b) => b.key === MAIN_BENCHMARK) ?? null;

  const periodStart = Object.fromEntries(
    ANALYSIS_PERIODS.map((p) => [p, rangeStartIndex(dates, p)]),
  ) as Record<AnalysisPeriod, number>;

  return {
    options: { currency, basis: options.basis, riskFree: options.riskFree ?? 0 },
    usdAvailable,
    dates,
    netInvested,
    periodStart,
    series: [me, ...benchmarks],
    mainBenchmark: main,
    metrics: n >= 2 ? computeMetrics(view, main, options.riskFree ?? 0) : null,
    riskFree: options.riskFree ?? 0,
  };
}

/** Time-weighted return of a price series over a period (from its start index). */
export function periodReturn(s: ComparedSeries, start: number): number {
  const p = s.prices;
  return p[start] > 0 ? p[p.length - 1] / p[start] - 1 : 0;
}

function computeMetrics(
  view: PortfolioView,
  main: ComparedSeries | null,
  riskFree: number,
): Metrics {
  const { dates, values, flows, unitValues } = view.series;
  const last = dates.length - 1;
  const days = last;
  const twr = unitValues[last] / unitValues[0] - 1;
  const twrAnnual = annualize(twr, days);
  const rMe = stepReturns(unitValues);
  const vol = volatility(rMe, 365);

  const cashFlows: CashFlow[] = flows.flatMap((amount, i) =>
    amount !== 0 ? [{ date: dates[i], amount: -amount }] : [],
  );
  cashFlows.push({ date: dates[last], amount: values[last] });

  let b: number | null = null;
  let alpha: number | null = null;
  let excess: number | null = null;
  if (main) {
    const benchTotal = main.prices[last] / main.prices[0] - 1;
    b = beta(rMe, stepReturns(main.prices));
    alpha = jensenAlpha(twrAnnual, annualize(benchTotal, days), b, riskFree);
    excess = twr - benchTotal;
  }

  // Month-end to month-end returns (the first month from the first day).
  const monthEnds: number[] = [0];
  for (let i = 1; i < dates.length; i++) {
    if (dates[i].slice(0, 7) !== dates[i - 1].slice(0, 7)) monthEnds.push(i - 1);
  }
  if (monthEnds[monthEnds.length - 1] !== last) monthEnds.push(last);
  const months: MonthReturn[] = monthEnds.slice(1).map((end, k) => ({
    month: dates[end].slice(0, 7),
    ratio: unitValues[end] / unitValues[monthEnds[k]] - 1,
  }));
  const pick = (better: (a: MonthReturn, b: MonthReturn) => boolean) =>
    months.length ? months.reduce((a, m) => (better(m, a) ? m : a)) : null;

  return {
    twr,
    twrAnnual,
    xirr: cashFlows.length >= 2 ? xirr(cashFlows) : null,
    alpha,
    beta: b,
    excessReturn: excess,
    volatility: vol,
    sharpe: sharpe(twrAnnual, riskFree, vol),
    sortino: sortino(rMe, twrAnnual, riskFree, 365),
    maxDrawdown: maxDrawdown(unitValues),
    riskLevel: riskLevel(vol),
    bestMonth: pick((m, a) => m.ratio > a.ratio),
    worstMonth: pick((m, a) => m.ratio < a.ratio),
    months,
  };
}

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
import { rangeFromInception, rangeStartIndex, type PortfolioView } from './portfolioView';

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

/**
 * Short histories (docs/02-HESAPLAMA-MOTORU.md §10): yearly figures are shown only after a
 * year (a few days' return turned into a yearly rate means nothing), and risk statistics need
 * a few weeks of daily moves.
 */
export const ANNUALIZE_AFTER_DAYS = 365;
export const MIN_RISK_DAYS = 20;

export interface Metrics {
  /** Days the history covers (first record day included). */
  days: number;
  /** The history is at least a year: yearly figures are meaningful. */
  annualized: boolean;
  twr: number;
  /** null under a year. */
  twrAnnual: number | null;
  /** Yearly money-weighted return (XIRR); null under a year or when it cannot be solved. */
  xirr: number | null;
  /** Money-weighted return over the whole history (not yearly). */
  mwr: number | null;
  /** Yearly when `annualized`, else over the history; null without benchmark or enough days. */
  alpha: number | null;
  beta: number | null;
  excessReturn: number | null;
  /** null with fewer than MIN_RISK_DAYS daily moves. */
  volatility: number | null;
  sharpe: number | null;
  sortino: number | null;
  maxDrawdown: number;
  riskLevel: number | null;
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
  /** The period reaches back to the first record (returns include the first day). */
  periodInception: Record<AnalysisPeriod, boolean>;
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

  const periodInception = Object.fromEntries(
    ANALYSIS_PERIODS.map((p) => [p, rangeFromInception(dates, p)]),
  ) as Record<AnalysisPeriod, boolean>;

  return {
    periodInception,
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

/**
 * Time-weighted return of a price series over a period (from its start index). From the first
 * record, the portfolio's unit value starts at 1 before the first day, so that day's own gain
 * counts; a comparison is bought at the first day's close.
 */
export function periodReturn(s: ComparedSeries, start: number, inception = false): number {
  const p = s.prices;
  const base = inception && s.key === 'me' ? 1 : p[start];
  return base > 0 ? p[p.length - 1] / base - 1 : 0;
}

function computeMetrics(
  view: PortfolioView,
  main: ComparedSeries | null,
  riskFree: number,
): Metrics {
  const { dates, values, flows, unitValues } = view.series;
  const last = dates.length - 1;
  // Calendar days covered, the first record day included.
  const days = last + 1;
  const annualized = days >= ANNUALIZE_AFTER_DAYS;
  // Unit values are 1 before the first day: the first day's own result is included.
  const twr = unitValues[last] - 1;
  const twrAnnual = annualized ? annualize(twr, days) : null;
  const rMe = stepReturns(unitValues);
  const enough = rMe.length >= MIN_RISK_DAYS;
  const vol = enough ? volatility(rMe, 365) : null;
  // Sharpe and Sortino under a year: the average daily return times 365 (no compounding of a
  // short, lucky run into a huge yearly number).
  const meanDaily = rMe.length ? rMe.reduce((a, r) => a + r, 0) / rMe.length : 0;
  const yearlyReturn = twrAnnual ?? meanDaily * 365;

  const cashFlows: CashFlow[] = flows.flatMap((amount, i) =>
    amount !== 0 ? [{ date: dates[i], amount: -amount }] : [],
  );
  cashFlows.push({ date: dates[last], amount: values[last] });

  let b: number | null = null;
  let alpha: number | null = null;
  let excess: number | null = null;
  if (main) {
    const benchTotal = main.prices[last] / main.prices[0] - 1;
    excess = twr - benchTotal;
    if (enough) {
      b = beta(rMe, stepReturns(main.prices));
      alpha = annualized
        ? jensenAlpha(twrAnnual!, annualize(benchTotal, days), b, riskFree)
        : // Over the history: the same formula with the period's returns and risk-free rate.
          jensenAlpha(twr, benchTotal, b, (1 + riskFree) ** (days / 365) - 1);
    }
  }
  const yearlyMwr = cashFlows.length >= 2 ? xirr(cashFlows) : null;
  const netIn = view.series.netInvested[last];

  // Month-end to month-end returns (the first month from the first day).
  const monthEnds: number[] = [0];
  for (let i = 1; i < dates.length; i++) {
    if (dates[i].slice(0, 7) !== dates[i - 1].slice(0, 7)) monthEnds.push(i - 1);
  }
  if (monthEnds[monthEnds.length - 1] !== last) monthEnds.push(last);
  const months: MonthReturn[] = monthEnds.slice(1).map((end, k) => ({
    month: dates[end].slice(0, 7),
    ratio: unitValues[end] / (k === 0 ? 1 : unitValues[monthEnds[k]]) - 1,
  }));
  const pick = (better: (a: MonthReturn, b: MonthReturn) => boolean) =>
    months.length ? months.reduce((a, m) => (better(m, a) ? m : a)) : null;

  return {
    days,
    annualized,
    twr,
    twrAnnual,
    xirr: annualized ? yearlyMwr : null,
    // XIRR's own span: from the first cash flow to today.
    mwr:
      yearlyMwr !== null
        ? (1 + yearlyMwr) **
            ((Date.parse(dates[last]) - new Date(cashFlows[0].date).getTime()) / 86_400_000 / 365) -
          1
        : netIn > 0
          ? values[last] / netIn - 1
          : null,
    alpha,
    beta: b,
    excessReturn: excess,
    volatility: vol,
    sharpe: vol !== null ? sharpe(yearlyReturn, riskFree, vol) : null,
    sortino: enough ? sortino(rMe, yearlyReturn, riskFree, 365) : null,
    maxDrawdown: maxDrawdown(unitValues),
    riskLevel: vol !== null ? riskLevel(vol) : null,
    bestMonth: pick((m, a) => m.ratio > a.ratio),
    worstMonth: pick((m, a) => m.ratio < a.ratio),
    months,
  };
}

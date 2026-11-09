/**
 * DEMO DATA for the Analiz preview — fictional prices, real formulas.
 *
 * The portfolio line is the engine's daily value series of the demo transactions
 * (src/demo/portfolio.ts). The same cash flows are replayed into every benchmark with the
 * what-if rule of doc §12. Bitcoin and Dolar/TL use exactly the prices behind the demo
 * holdings; the other benchmarks are generated from the same market moves and gently tilted
 * towards plausible end values. All metrics are computed with src/domain.
 */
import {
  annualize,
  beta,
  jensenAlpha,
  maxDrawdown,
  riskLevel,
  sharpe,
  sortino,
  stepReturns,
  volatility,
  xirr,
  type CashFlow,
  type IndexedFlow,
} from '@/domain';

import { DEMO_CLOSES, DEMO_DATES, DEMO_DAYS, shocks, USDTRY } from './market';
import { DEMO_SERIES, DEMO_UNITS } from './portfolio';

export { DEMO_DATES, DEMO_DAYS };

/** Deposits (+) and withdrawals (−) per day, straight from the engine. */
export const DEMO_FLOWS: { date: string; amount: number }[] = DEMO_SERIES.filter(
  (p) => p.flow !== 0,
).map((p) => ({ date: p.date, amount: p.flow }));

const INDEXED_FLOWS: IndexedFlow[] = DEMO_SERIES.flatMap((p, index) =>
  p.flow !== 0 ? [{ index, amount: p.flow }] : [],
);

/** Net invested capital at each day (step line on the charts). */
export const DEMO_NET_INVESTED: number[] = DEMO_SERIES.map((p) => p.netInvested);

const last = DEMO_DAYS - 1;
const NET_INVESTED_END = DEMO_NET_INVESTED[last];

export interface BenchmarkDef {
  key: string;
  name: string;
}

export const BENCHMARKS: BenchmarkDef[] = [
  { key: 'me', name: 'Portföyüm' },
  { key: 'gold', name: 'Gram Altın' },
  { key: 'btc', name: 'Bitcoin' },
  { key: 'deposit', name: 'Mevduat' },
  { key: 'cpi', name: 'TÜFE (enflasyon)' },
  { key: 'ndx', name: 'Nasdaq 100' },
  { key: 'spx', name: 'S&P 500' },
  { key: 'xu030', name: 'BIST 30' },
  { key: 'xu100', name: 'BIST 100' },
  { key: 'silver', name: 'Gram Gümüş' },
  { key: 'eur', name: 'Euro/TL' },
  { key: 'rut', name: 'Russell 2000' },
  { key: 'usd', name: 'Dolar/TL' },
];

/** End value as a multiple of net invested, for the generated (tilted) benchmarks. */
const TARGET_MULTIPLE: Record<string, number> = {
  gold: 1.3203,
  deposit: 1.27,
  cpi: 1.23,
  ndx: 1.1792,
  spx: 1.1593,
  xu030: 1.1206,
  xu100: 1.1099,
  silver: 1.1001,
  eur: 1.095,
  rut: 1.0847,
};

/* ───────────────────────── Benchmark price paths ───────────────────────── */

const logReturns = (p: number[]) => p.map((x, i) => (i === 0 ? 0 : Math.log(x / p[i - 1])));
const fromLogReturns = (r: number[]) => {
  const out = [1];
  for (let i = 1; i < r.length; i++) out.push(out[i - 1] * Math.exp(r[i]));
  return out;
};
const mix = (...parts: [number, number[]][]) =>
  Array.from({ length: DEMO_DAYS }, (_, i) => parts.reduce((s, [w, r]) => s + w * r[i], 0));
const noise = (seed: number, vol: number) => shocks(seed).map((z) => z * vol);

const r = Object.fromEntries(Object.entries(DEMO_CLOSES).map(([k, v]) => [k, logReturns(v)]));
const rUsd = logReturns(USDTRY);
const rBist = mix([1 / 3, r.THYAO], [1 / 3, r.ASELS], [1 / 3, r.TUPRS]);
const rUs = mix([0.5, r.AAPL], [0.5, r.NVDA]);
const flat = Array.from({ length: DEMO_DAYS }, () => 1);

const BASE: Record<string, number[]> = {
  xu100: fromLogReturns(mix([0.85, rBist], [1, noise(103, 0.006)])),
  xu030: fromLogReturns(mix([0.95, rBist], [1, noise(104, 0.006)])),
  spx: fromLogReturns(mix([0.55, rUs], [1, noise(105, 0.006)], [1, rUsd])),
  ndx: fromLogReturns(mix([0.8, rUs], [1, noise(106, 0.007)], [1, rUsd])),
  rut: fromLogReturns(mix([0.4, rUs], [1, noise(107, 0.011)], [1, rUsd])),
  gold: fromLogReturns(mix([1, noise(109, 0.009)], [1, rUsd])),
  silver: fromLogReturns(mix([1, noise(110, 0.016)], [1, rUsd])),
  eur: fromLogReturns(mix([1, noise(102, 0.004)], [1.05, rUsd])),
  cpi: flat,
  deposit: flat,
};

/** Multiplies the path by a smooth exponential trend: ×e^logF at the last day. */
function tilt(path: number[], logF: number): number[] {
  const step = Math.exp(logF / (path.length - 1));
  let factor = 1;
  return path.map((p) => {
    const out = p * factor;
    factor *= step;
    return out;
  });
}

/** Net flow per day index (several flows on one day are summed). */
const FLOW_AT = new Map<number, number>();
for (const f of INDEXED_FLOWS) FLOW_AT.set(f.index, (FLOW_AT.get(f.index) ?? 0) + Number(f.amount));
const FLOW_STEPS = [...FLOW_AT.entries()].sort((a, b) => a[0] - b[0]);

/**
 * The what-if replay with plain numbers (same rule as `simulateWhatIf` in src/domain, which
 * uses exact decimals and is tested there). The demo benchmarks are fictional, and this keeps
 * the preview instant on a phone.
 */
function fastWhatIf(prices: number[]): number[] {
  let units = 0;
  return prices.map((price, i) => {
    const amount = FLOW_AT.get(i);
    if (amount !== undefined && price > 0) units = Math.max(0, units + amount / price);
    return units * price;
  });
}

/** End value of the replay on a tilted path, touching only the days with a flow. */
function tiltedEndValue(path: number[], logF: number): number {
  const n = path.length - 1;
  let units = 0;
  for (const [index, amount] of FLOW_STEPS) {
    const price = path[index] * Math.exp((logF * index) / n);
    if (price > 0) units = Math.max(0, units + amount / price);
  }
  return units * path[n] * Math.exp(logF);
}

/** Finds the tilt that makes the replayed cash flows end at `target`. */
function calibrate(path: number[], target: number): number[] {
  let lo = -4;
  let hi = 4;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (tiltedEndValue(path, mid) < target) lo = mid;
    else hi = mid;
  }
  return tilt(path, (lo + hi) / 2);
}

/**
 * Price path (index level) of every series. For the portfolio this is its internal unit value,
 * whose ratio over any period is the portfolio's time-weighted return.
 */
export const DEMO_PRICES: Record<string, number[]> = {
  me: DEMO_UNITS.map((u) => u.unitValue),
  btc: DEMO_CLOSES.BTC.map((p, i) => p * USDTRY[i]),
  usd: USDTRY,
  ...Object.fromEntries(
    Object.entries(BASE).map(([k, path]) => [
      k,
      calibrate(path, NET_INVESTED_END * TARGET_MULTIPLE[k]),
    ]),
  ),
};

/** Value of the replayed cash flows in each series, per day. The portfolio is its real value. */
export const DEMO_VALUES: Record<string, number[]> = Object.fromEntries(
  BENCHMARKS.map((b) => [
    b.key,
    b.key === 'me' ? DEMO_SERIES.map((p) => p.value) : fastWhatIf(DEMO_PRICES[b.key]),
  ]),
);

/* ───────────────────────── Metrics (real formulas) ───────────────────────── */

const RISK_FREE = 0; // set by the user in Settings › Calculation (Phase 10)

function totalReturn(key: string, from = 0, to = last) {
  const p = DEMO_PRICES[key];
  return p[to] / p[from] - 1;
}

function indexOfDate(date: string) {
  const i = DEMO_DATES.findIndex((d) => d >= date);
  return i === -1 ? last : i;
}

export type PeriodKey = '1A' | '3A' | '6A' | 'YB' | '1Y' | 'Tümü';

export const PERIOD_START: Record<PeriodKey, number> = {
  '1A': DEMO_DAYS - 31,
  '3A': DEMO_DAYS - 92,
  '6A': DEMO_DAYS - 183,
  YB: indexOfDate('2025-12-31'),
  '1Y': DEMO_DAYS - 366,
  Tümü: 0,
};

/** Time-weighted return of a series over a period. */
export function periodReturn(key: string, period: PeriodKey) {
  return totalReturn(key, PERIOD_START[period]);
}

function computeMetrics(benchmarkKey = 'xu100') {
  const days = last;
  const twr = totalReturn('me');
  const twrAnnual = annualize(twr, days);
  const benchAnnual = annualize(totalReturn(benchmarkKey), days);
  const rMe = stepReturns(DEMO_PRICES.me);
  const rBench = stepReturns(DEMO_PRICES[benchmarkKey]);
  const vol = volatility(rMe, 365);
  const b = beta(rMe, rBench);

  const flows: CashFlow[] = DEMO_FLOWS.map((f) => ({ date: f.date, amount: -f.amount }));
  flows.push({ date: DEMO_DATES[last], amount: DEMO_VALUES.me[last] });

  // Month-end returns for best / worst month.
  const monthEnds: number[] = [];
  for (let i = 1; i < DEMO_DAYS; i++) {
    if (DEMO_DATES[i].slice(0, 7) !== DEMO_DATES[i - 1].slice(0, 7)) monthEnds.push(i - 1);
  }
  monthEnds.push(last);
  const months = monthEnds.slice(1).map((end, k) => ({
    month: DEMO_DATES[end].slice(0, 7),
    ratio: DEMO_PRICES.me[end] / DEMO_PRICES.me[monthEnds[k]] - 1,
  }));
  const best = months.reduce((a, m) => (m.ratio > a.ratio ? m : a));
  const worst = months.reduce((a, m) => (m.ratio < a.ratio ? m : a));

  return {
    benchmarkKey,
    riskFree: RISK_FREE,
    twr,
    twrAnnual,
    xirr: xirr(flows) ?? 0,
    alpha: jensenAlpha(twrAnnual, benchAnnual, b, RISK_FREE),
    excessReturn: twr - totalReturn(benchmarkKey),
    beta: b,
    volatility: vol,
    sharpe: sharpe(twrAnnual, RISK_FREE, vol),
    sortino: sortino(rMe, twrAnnual, RISK_FREE, 365),
    maxDrawdown: maxDrawdown(DEMO_PRICES.me),
    riskLevel: riskLevel(vol),
    bestMonth: best,
    worstMonth: worst,
    months,
  };
}

export const DEMO_METRICS = computeMetrics();

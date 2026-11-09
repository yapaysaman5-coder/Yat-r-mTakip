/**
 * DEMO DATA for the Analiz preview — fictional prices, real formulas.
 *
 * Daily price paths are generated for the portfolio and every benchmark, then the same
 * cash flows are replayed into each one with `simulateWhatIf` (doc §12). Each path is gently
 * tilted so the final values match the league table. All metrics below are computed from
 * these series with the real functions in `src/domain/metrics.ts`.
 */
import {
  annualize,
  beta,
  jensenAlpha,
  maxDrawdown,
  periodReturns,
  riskLevel,
  sharpe,
  sortino,
  volatility,
  xirr,
  type CashFlow,
} from '@/domain/metrics';
import { simulateWhatIf, type IndexedFlow } from '@/domain/whatIf';

const DAY_MS = 86_400_000;
const START = Date.UTC(2025, 0, 12);
const END = Date.UTC(2026, 10, 8);
export const DEMO_DAYS = Math.round((END - START) / DAY_MS) + 1;

/** ISO date (yyyy-mm-dd) for every day of the demo history. */
export const DEMO_DATES: string[] = Array.from({ length: DEMO_DAYS }, (_, i) =>
  new Date(START + i * DAY_MS).toISOString().slice(0, 10),
);

/** Deposits (+) and withdrawals (−): total in ₺1.150.000, total out ₺80.318. */
export const DEMO_FLOWS: { date: string; amount: number }[] = [
  { date: '2025-01-12', amount: 400_000 },
  { date: '2025-03-03', amount: 150_000 },
  { date: '2025-06-02', amount: 200_000 },
  { date: '2025-09-01', amount: 150_000 },
  { date: '2025-12-01', amount: 130_000 },
  { date: '2026-03-02', amount: -60_318 },
  { date: '2026-06-01', amount: 120_000 },
  { date: '2026-10-15', amount: -20_000 },
];

const INDEXED_FLOWS: IndexedFlow[] = DEMO_FLOWS.map((f) => ({
  index: DEMO_DATES.indexOf(f.date),
  amount: f.amount,
}));

/** Net invested capital at each day (step line on the charts). */
export const DEMO_NET_INVESTED: number[] = (() => {
  const out: number[] = [];
  let total = 0;
  for (let i = 0; i < DEMO_DAYS; i++) {
    for (const f of INDEXED_FLOWS) if (f.index === i) total += f.amount;
    out.push(total);
  }
  return out;
})();

export interface BenchmarkDef {
  key: string;
  name: string;
  /** Final value after replaying the cash flows (league table). */
  target: number;
}

export const BENCHMARKS: BenchmarkDef[] = [
  { key: 'gold', name: 'Gram Altın', target: 1_412_300 },
  { key: 'btc', name: 'Bitcoin', target: 1_398_120 },
  { key: 'deposit', name: 'Mevduat', target: 1_358_500 },
  { key: 'cpi', name: 'TÜFE (enflasyon)', target: 1_315_700 },
  { key: 'me', name: 'Portföyüm', target: 1_284_562.4 },
  { key: 'ndx', name: 'Nasdaq 100', target: 1_261_400 },
  { key: 'spx', name: 'S&P 500', target: 1_240_110 },
  { key: 'xu030', name: 'BIST 30', target: 1_198_700 },
  { key: 'xu100', name: 'BIST 100', target: 1_187_240 },
  { key: 'silver', name: 'Gram Gümüş', target: 1_176_800 },
  { key: 'eur', name: 'Euro/TL', target: 1_171_300 },
  { key: 'rut', name: 'Russell 2000', target: 1_160_300 },
  { key: 'usd', name: 'Dolar/TL', target: 1_150_900 },
];

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Daily returns: Gaussian-ish noise from a seeded generator. */
function noise(seed: number, vol: number): number[] {
  const rand = mulberry32(seed);
  return Array.from({ length: DEMO_DAYS }, (_, i) => {
    if (i === 0) return 0;
    const g = (rand() + rand() + rand() - 1.5) * 2; // ~N(0, 1)
    return g * vol;
  });
}

function pathFromReturns(returns: number[]): number[] {
  const out = [1];
  for (let i = 1; i < returns.length; i++) out.push(out[i - 1] * (1 + returns[i]));
  return out;
}

const raw = {
  usd: noise(101, 0.0025),
  eur: noise(102, 0.004),
  xu100: noise(103, 0.016),
  spx: noise(105, 0.01),
  ndx: noise(106, 0.013),
  rut: noise(107, 0.014),
  btc: noise(108, 0.03),
  gold: noise(109, 0.009),
  silver: noise(110, 0.016),
  idio: noise(111, 0.004),
};
const xu030Extra = noise(104, 0.004);
const xu030Returns = raw.xu100.map((r, i) => r * 1.05 + xu030Extra[i]);

/** Base (untilted) price paths in TL. */
const BASE: Record<string, number[]> = {
  usd: pathFromReturns(raw.usd),
  eur: pathFromReturns(raw.eur.map((r, i) => r + raw.usd[i] * 0.6)),
  xu100: pathFromReturns(raw.xu100),
  xu030: pathFromReturns(xu030Returns),
  spx: pathFromReturns(raw.spx.map((r, i) => r + raw.usd[i])),
  ndx: pathFromReturns(raw.ndx.map((r, i) => r + raw.usd[i])),
  rut: pathFromReturns(raw.rut.map((r, i) => r + raw.usd[i])),
  btc: pathFromReturns(raw.btc.map((r, i) => r + raw.usd[i])),
  gold: pathFromReturns(raw.gold.map((r, i) => r + raw.usd[i])),
  silver: pathFromReturns(raw.silver.map((r, i) => r + raw.usd[i])),
  cpi: Array.from({ length: DEMO_DAYS }, () => 1),
  deposit: Array.from({ length: DEMO_DAYS }, () => 1),
  // The portfolio: 48% BIST, 34% US (in TL), 18% crypto, plus stock-specific noise.
  me: pathFromReturns(
    raw.xu100.map(
      (r, i) => 0.48 * r + 0.34 * (raw.spx[i] + raw.usd[i]) + 0.18 * raw.btc[i] + raw.idio[i],
    ),
  ),
};

function tilt(path: number[], logF: number): number[] {
  const n = path.length - 1;
  return path.map((p, i) => p * Math.exp((logF * i) / n));
}

/** Finds the tilt that makes the replayed cash flows end exactly at `target`. */
function calibrate(path: number[], target: number): number[] {
  let lo = -4;
  let hi = 4;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    const end = simulateWhatIf(tilt(path, mid), INDEXED_FLOWS).values[DEMO_DAYS - 1];
    if (end < target) lo = mid;
    else hi = mid;
  }
  return tilt(path, (lo + hi) / 2);
}

/** Price path (index level) of every series, calibrated. */
export const DEMO_PRICES: Record<string, number[]> = Object.fromEntries(
  BENCHMARKS.map((b) => [b.key, calibrate(BASE[b.key], b.target)]),
);

/** Value of the replayed cash flows in each series, per day. */
export const DEMO_VALUES: Record<string, number[]> = Object.fromEntries(
  BENCHMARKS.map((b) => [b.key, simulateWhatIf(DEMO_PRICES[b.key], INDEXED_FLOWS).values]),
);

/* ───────────────────────── Metrics (real formulas) ───────────────────────── */

const RISK_FREE = 0; // set by the user in Settings › Calculation (Phase 10)

function totalReturn(key: string, from = 0, to = DEMO_DAYS - 1) {
  const p = DEMO_PRICES[key];
  return p[to] / p[from] - 1;
}

function indexOfDate(date: string) {
  const i = DEMO_DATES.findIndex((d) => d >= date);
  return i === -1 ? DEMO_DAYS - 1 : i;
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
  const days = DEMO_DAYS - 1;
  const twr = totalReturn('me');
  const twrAnnual = annualize(twr, days);
  const benchAnnual = annualize(totalReturn(benchmarkKey), days);
  const rMe = periodReturns(DEMO_PRICES.me);
  const rBench = periodReturns(DEMO_PRICES[benchmarkKey]);
  const vol = volatility(rMe, 365);
  const b = beta(rMe, rBench);

  const flows: CashFlow[] = DEMO_FLOWS.map((f) => ({ date: f.date, amount: -f.amount }));
  flows.push({ date: DEMO_DATES[DEMO_DAYS - 1], amount: DEMO_VALUES.me[DEMO_DAYS - 1] });

  // Month-end returns for best / worst month.
  const monthEnds: number[] = [];
  for (let i = 1; i < DEMO_DAYS; i++) {
    if (DEMO_DATES[i].slice(0, 7) !== DEMO_DATES[i - 1].slice(0, 7)) monthEnds.push(i - 1);
  }
  monthEnds.push(DEMO_DAYS - 1);
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

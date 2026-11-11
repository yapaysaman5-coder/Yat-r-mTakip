import { quantile, seededRandom } from '@/domain';

/**
 * Hedef planlama (docs/02-HESAPLAMA-MOTORU.md §16.6): a Monte Carlo simulation in today's
 * lira (real terms). Monthly returns are drawn from a lognormal distribution with the chosen
 * yearly real return and volatility; contributions grow with inflation, so they too are in
 * today's lira. The answer is a probability and a range, never one number.
 */
export interface GoalInput {
  /** Value today (TL). */
  start: number;
  /** Monthly contribution in today's lira. */
  monthly: number;
  years: number;
  /** Target in today's lira. */
  target: number;
  /** Expected yearly real return (arithmetic) and volatility. */
  realReturn: number;
  volatility: number;
  paths?: number;
  seed?: number;
}

export interface GoalResult {
  /** Probability of reaching the target at the horizon. */
  probability: number;
  /** p10 / p50 / p90 per year (index 0 = today). */
  fan: { year: number; p10: number; p50: number; p90: number }[];
  /** Median end value and the money put in over the years. */
  median: number;
  contributed: number;
  /** Monthly contribution for an 80 % chance (null: unreachable or already certain). */
  monthlyFor80: number | null;
  /** Probability of ending below what was put in (start + contributions). */
  lossProbability: number;
  paths: number;
}

export const GOAL_PATHS = 4000;
export const GOAL_MAX_YEARS = 50;

export function simulateGoal(input: GoalInput): GoalResult {
  const paths = input.paths ?? GOAL_PATHS;
  const years = Math.max(1, Math.min(GOAL_MAX_YEARS, Math.round(input.years)));
  const months = years * 12;
  // Lognormal with E[1 + R] = 1 + μ: log mean m = ln(1 + μ) − s²/2.
  const sYear = Math.sqrt(Math.log(1 + input.volatility ** 2 / (1 + input.realReturn) ** 2));
  const mYear = Math.log(1 + input.realReturn) - (sYear * sYear) / 2;
  const m = mYear / 12;
  const s = sYear / Math.sqrt(12);
  const rnd = seededRandom(input.seed ?? 20240101);

  // End value = a + C·b per path: a grows the start, b the stream of 1-lira contributions
  // (paid at the start of each month), so the contribution can be solved for exactly.
  const a = new Float64Array(paths);
  const b = new Float64Array(paths);
  const yearly: { a: Float64Array; b: Float64Array }[] = [
    { a: new Float64Array(paths).fill(input.start), b: new Float64Array(paths) },
  ];
  for (let p = 0; p < paths; p++) a[p] = input.start;
  for (let k = 1; k <= months; k++) {
    for (let p = 0; p < paths; p++) {
      const g = Math.exp(m + s * rnd.normal());
      a[p] *= g;
      b[p] = (b[p] + 1) * g;
    }
    if (k % 12 === 0) yearly.push({ a: a.slice(), b: b.slice() });
  }
  const C = input.monthly;
  const contributed = input.start + C * months;
  const fan = yearly.map((y, year) => {
    const v = Array.from(y.a, (x, p) => x + C * y.b[p]).sort((p, q) => p - q);
    return { year, p10: quantile(v, 0.1), p50: quantile(v, 0.5), p90: quantile(v, 0.9) };
  });
  let hit = 0;
  let loss = 0;
  const need: number[] = [];
  for (let p = 0; p < paths; p++) {
    const end = a[p] + C * b[p];
    if (end >= input.target) hit++;
    if (end < contributed) loss++;
    need.push((input.target - a[p]) / b[p]);
  }
  need.sort((p, q) => p - q);
  // P(a + C·b ≥ target) = P(C ≥ need) ≥ 0,8 ⇔ C ≥ the 80th percentile of need.
  const c80 = quantile(need, 0.8);
  return {
    probability: hit / paths,
    fan,
    median: fan[fan.length - 1].p50,
    contributed,
    monthlyFor80: c80 > 0 && Number.isFinite(c80) ? c80 : null,
    lossProbability: loss / paths,
    paths,
  };
}

export interface Goal {
  id: string;
  name: string;
  target: number;
  years: number;
  monthly: number;
  /** Assumptions: the plan's risk profile, or own values. */
  realReturn: number;
  volatility: number;
  /** Count today's portfolio value as the start. */
  usePortfolio: boolean;
  /** Start used when usePortfolio is off. */
  start: number;
  createdOn: string;
}

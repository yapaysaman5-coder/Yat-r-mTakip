/**
 * Performance and risk statistics (docs/02-HESAPLAMA-MOTORU.md §8–§10).
 *
 * These work on ratios and value series, so plain floating point is appropriate here;
 * money amounts and quantities use decimal arithmetic elsewhere (§14).
 */

const DAY_MS = 86_400_000;

export interface CashFlow {
  date: Date | string;
  /** Investor's perspective: deposits negative, withdrawals and final value positive. */
  amount: number;
}

function toTime(d: Date | string): number {
  return new Date(d).getTime();
}

/** Annualises a total return earned over `days` calendar days: (1 + r)^(365/days) − 1. */
export function annualize(totalReturn: number, days: number): number {
  if (days <= 0) return 0;
  return Math.pow(1 + totalReturn, 365 / days) - 1;
}

function npv(rate: number, flows: { t: number; amount: number }[]): number {
  return flows.reduce((sum, f) => sum + f.amount / Math.pow(1 + rate, f.t), 0);
}

function dNpv(rate: number, flows: { t: number; amount: number }[]): number {
  return flows.reduce((sum, f) => sum - (f.t * f.amount) / Math.pow(1 + rate, f.t + 1), 0);
}

/**
 * Money-weighted annual return (same convention as Excel's XIRR).
 * Newton–Raphson first; falls back to bisection on [−99.99%, +10 000%].
 * Returns `null` when there is no sign change (no solution).
 */
export function xirr(cashflows: CashFlow[]): number | null {
  if (cashflows.length < 2) return null;
  const t0 = Math.min(...cashflows.map((c) => toTime(c.date)));
  const flows = cashflows.map((c) => ({
    t: (toTime(c.date) - t0) / DAY_MS / 365,
    amount: c.amount,
  }));
  const hasPos = flows.some((f) => f.amount > 0);
  const hasNeg = flows.some((f) => f.amount < 0);
  if (!hasPos || !hasNeg) return null;

  let rate = 0.1;
  for (let i = 0; i < 50; i++) {
    const value = npv(rate, flows);
    const slope = dNpv(rate, flows);
    if (!Number.isFinite(value) || !Number.isFinite(slope) || slope === 0) break;
    const next = rate - value / slope;
    if (next <= -0.9999 || !Number.isFinite(next)) break;
    if (Math.abs(next - rate) < 1e-10) return next;
    rate = next;
  }

  let lo = -0.9999;
  let hi = 100;
  let fLo = npv(lo, flows);
  if (fLo * npv(hi, flows) > 0) return null;
  for (let i = 0; i < 300; i++) {
    const mid = (lo + hi) / 2;
    const fMid = npv(mid, flows);
    if (Math.abs(fMid) < 1e-9 || hi - lo < 1e-12) return mid;
    if (fLo * fMid < 0) {
      hi = mid;
    } else {
      lo = mid;
      fLo = fMid;
    }
  }
  return (lo + hi) / 2;
}

/** Step-by-step returns of a series: v[i] / v[i−1] − 1. */
export function stepReturns(series: number[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < series.length; i++) out.push(series[i] / series[i - 1] - 1);
  return out;
}

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

/** Sample standard deviation. */
export function stdev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1));
}

/** Annualised volatility from per-period returns. */
export function volatility(returns: number[], periodsPerYear: number): number {
  return stdev(returns) * Math.sqrt(periodsPerYear);
}

/** Largest peak-to-trough fall as a positive ratio (0.127 = 12,7% drawdown). */
export function maxDrawdown(series: number[]): number {
  let peak = -Infinity;
  let worst = 0;
  for (const v of series) {
    peak = Math.max(peak, v);
    if (peak > 0) worst = Math.max(worst, 1 - v / peak);
  }
  return worst;
}

export function sharpe(annualReturn: number, riskFree: number, annualVol: number): number {
  return annualVol === 0 ? 0 : (annualReturn - riskFree) / annualVol;
}

/** Sortino ratio: like Sharpe but only penalises downside deviation. */
export function sortino(
  returns: number[],
  annualReturn: number,
  riskFree: number,
  periodsPerYear: number,
): number {
  const downside = returns.map((r) => Math.min(0, r));
  const dd = Math.sqrt(downside.reduce((s, r) => s + r * r, 0) / Math.max(1, returns.length));
  const annualDd = dd * Math.sqrt(periodsPerYear);
  return annualDd === 0 ? 0 : (annualReturn - riskFree) / annualDd;
}

function covariance(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n < 2) return 0;
  const ma = mean(a.slice(0, n));
  const mb = mean(b.slice(0, n));
  let s = 0;
  for (let i = 0; i < n; i++) s += (a[i] - ma) * (b[i] - mb);
  return s / (n - 1);
}

/** Sensitivity of the portfolio to the benchmark: cov(rp, rm) / var(rm). */
export function beta(portfolio: number[], benchmark: number[]): number {
  const v = covariance(benchmark, benchmark);
  return v === 0 ? 0 : covariance(portfolio, benchmark) / v;
}

export function correlation(a: number[], b: number[]): number {
  const sa = stdev(a);
  const sb = stdev(b);
  return sa === 0 || sb === 0 ? 0 : covariance(a, b) / (sa * sb);
}

/**
 * Jensen's alpha (annual): the return above what the portfolio's market risk (beta)
 * alone would have earned. α = Rp − [Rf + β·(Rm − Rf)].
 */
export function jensenAlpha(
  portfolioAnnual: number,
  benchmarkAnnual: number,
  betaValue: number,
  riskFree: number,
): number {
  return portfolioAnnual - (riskFree + betaValue * (benchmarkAnnual - riskFree));
}

/** Risk level 1–7 from annual volatility (UCITS SRRI bands). */
export function riskLevel(annualVol: number): number {
  const bands = [0.005, 0.02, 0.05, 0.1, 0.15, 0.25];
  const i = bands.findIndex((b) => annualVol < b);
  return i === -1 ? 7 : i + 1;
}

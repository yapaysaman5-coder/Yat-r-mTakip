/**
 * Statistics for the science features (docs/02-HESAPLAMA-MOTORU.md §14): moments, covariance,
 * ordinary least squares with standard errors, and the normal distribution.
 */

export function mean(xs: readonly number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

/** Sample variance (n − 1). */
export function variance(xs: readonly number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - 1);
}

/** Sample covariance (n − 1) of two equally long series. */
export function covariance(a: readonly number[], b: readonly number[]): number {
  const n = Math.min(a.length, b.length);
  if (n < 2) return 0;
  const ma = mean(a.slice(0, n));
  const mb = mean(b.slice(0, n));
  let s = 0;
  for (let i = 0; i < n; i++) s += (a[i] - ma) * (b[i] - mb);
  return s / (n - 1);
}

export function correlationOf(a: readonly number[], b: readonly number[]): number {
  const d = Math.sqrt(variance(a) * variance(b));
  return d > 0 ? covariance(a, b) / d : 0;
}

/** Skewness (population form, as in Bailey & López de Prado). */
export function skewness(xs: readonly number[]): number {
  const n = xs.length;
  if (n < 3) return 0;
  const m = mean(xs);
  const s2 = xs.reduce((a, x) => a + (x - m) ** 2, 0) / n;
  if (s2 === 0) return 0;
  return xs.reduce((a, x) => a + (x - m) ** 3, 0) / n / s2 ** 1.5;
}

/** Kurtosis (not excess: a normal distribution gives 3). */
export function kurtosis(xs: readonly number[]): number {
  const n = xs.length;
  if (n < 4) return 3;
  const m = mean(xs);
  const s2 = xs.reduce((a, x) => a + (x - m) ** 2, 0) / n;
  if (s2 === 0) return 3;
  return xs.reduce((a, x) => a + (x - m) ** 4, 0) / n / s2 ** 2;
}

/** Standard normal cumulative distribution (Abramowitz–Stegun 7.1.26 via erf, |error| < 1.5e-7). */
export function normCdf(z: number): number {
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * x);
  const erf =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-x * x);
  return z >= 0 ? (1 + erf) / 2 : (1 - erf) / 2;
}

/** Inverse of the standard normal cumulative distribution (Acklam, |relative error| < 1.2e-9). */
export function normInv(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  const a = [
    -39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716,
    2.506628277459239,
  ];
  const b = [
    -54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972,
    -13.28068155288572,
  ];
  const c = [
    -0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734,
    4.374664141464968, 2.938163982698783,
  ];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  const lo = 0.02425;
  if (p < lo) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (
      (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    );
  }
  if (p > 1 - lo) {
    const q = Math.sqrt(-2 * Math.log(1 - p));
    return (
      -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    );
  }
  const q = p - 0.5;
  const r = q * q;
  return (
    ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) /
    (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
  );
}

export interface OlsResult {
  /** Intercept first, then one coefficient per regressor. */
  coef: number[];
  /** Standard errors of the coefficients. */
  se: number[];
  /** t statistics (coef ÷ se). */
  t: number[];
  r2: number;
  /** Standard deviation of the residuals. */
  residualSd: number;
  n: number;
}

/**
 * Ordinary least squares y = a + Σ b_k·x_k + e, with classic standard errors.
 * `xs` holds one array per regressor. Returns null when the system cannot be solved.
 */
export function ols(y: readonly number[], xs: readonly (readonly number[])[]): OlsResult | null {
  const n = y.length;
  const k = xs.length + 1;
  if (n <= k || xs.some((x) => x.length !== n)) return null;
  const row = (i: number) => [1, ...xs.map((x) => x[i])];
  // X'X and X'y.
  const xtx = Array.from({ length: k }, () => new Array<number>(k).fill(0));
  const xty = new Array<number>(k).fill(0);
  for (let i = 0; i < n; i++) {
    const r = row(i);
    for (let a = 0; a < k; a++) {
      xty[a] += r[a] * y[i];
      for (let b = 0; b < k; b++) xtx[a][b] += r[a] * r[b];
    }
  }
  const inv = invert(xtx);
  if (!inv) return null;
  const coef = inv.map((rowInv) => rowInv.reduce((s, v, j) => s + v * xty[j], 0));
  let sse = 0;
  const my = mean(y);
  let sst = 0;
  for (let i = 0; i < n; i++) {
    const r = row(i);
    const fit = r.reduce((s, v, j) => s + v * coef[j], 0);
    sse += (y[i] - fit) ** 2;
    sst += (y[i] - my) ** 2;
  }
  const s2 = sse / (n - k);
  const se = inv.map((rowInv, j) => Math.sqrt(Math.max(0, rowInv[j] * s2)));
  return {
    coef,
    se,
    t: coef.map((c, j) => (se[j] > 0 ? c / se[j] : 0)),
    r2: sst > 0 ? 1 - sse / sst : 0,
    residualSd: Math.sqrt(s2),
    n,
  };
}

/** Gauss–Jordan inverse with partial pivoting; null for a singular matrix. */
export function invert(m: readonly (readonly number[])[]): number[][] | null {
  const n = m.length;
  const a = m.map((r, i) => [...r, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(a[r][col]) > Math.abs(a[pivot][col])) pivot = r;
    if (Math.abs(a[pivot][col]) < 1e-14) return null;
    [a[col], a[pivot]] = [a[pivot], a[col]];
    const p = a[col][col];
    for (let j = 0; j < 2 * n; j++) a[col][j] /= p;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = a[r][col];
      if (f === 0) continue;
      for (let j = 0; j < 2 * n; j++) a[r][j] -= f * a[col][j];
    }
  }
  return a.map((r) => r.slice(n));
}

/** Small, fast, seedable random numbers (mulberry32) and normal draws (Box–Muller). */
export function seededRandom(seed: number) {
  let s = seed >>> 0;
  const next = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  let spare: number | null = null;
  const normal = () => {
    if (spare !== null) {
      const v = spare;
      spare = null;
      return v;
    }
    let u = 0;
    while (u === 0) u = next();
    const v = next();
    const r = Math.sqrt(-2 * Math.log(u));
    spare = r * Math.sin(2 * Math.PI * v);
    return r * Math.cos(2 * Math.PI * v);
  };
  return { next, normal };
}

/** Value at quantile p (0–1) of a sorted array, linear between points. */
export function quantile(sorted: readonly number[], p: number): number {
  if (sorted.length === 0) return 0;
  const i = (sorted.length - 1) * p;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
}

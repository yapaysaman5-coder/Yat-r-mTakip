import { describe, expect, it } from '@jest/globals';

import {
  correlationOf,
  covariance,
  invert,
  kurtosis,
  mean,
  normCdf,
  normInv,
  ols,
  quantile,
  seededRandom,
  skewness,
  variance,
} from '../stats';

describe('moments', () => {
  it('mean, sample variance, covariance and correlation', () => {
    expect(mean([1, 2, 3, 4])).toBe(2.5);
    expect(variance([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(32 / 7, 12);
    expect(covariance([1, 2, 3], [2, 4, 6])).toBeCloseTo(2, 12);
    expect(correlationOf([1, 2, 3], [2, 4, 6])).toBeCloseTo(1, 12);
    expect(correlationOf([1, 2, 3], [6, 4, 2])).toBeCloseTo(-1, 12);
  });

  it('skewness is 0 and kurtosis 3 for a symmetric two-point spread; long tails raise kurtosis', () => {
    expect(skewness([-1, 1, -1, 1])).toBeCloseTo(0, 12);
    expect(kurtosis([-1, 1, -1, 1])).toBeCloseTo(1, 12);
    expect(kurtosis([0, 0, 0, 0, 0, 0, 0, 0, 10, -10])).toBeGreaterThan(3);
    expect(skewness([0, 0, 0, 0, 10])).toBeGreaterThan(0);
  });
});

describe('normal distribution', () => {
  it('matches table values and round-trips', () => {
    expect(normCdf(0)).toBeCloseTo(0.5, 7);
    expect(normCdf(1.959964)).toBeCloseTo(0.975, 6);
    expect(normCdf(-1.644854)).toBeCloseTo(0.05, 6);
    expect(normInv(0.975)).toBeCloseTo(1.959964, 6);
    expect(normInv(0.01)).toBeCloseTo(-2.326348, 6);
    for (const p of [0.001, 0.2, 0.5, 0.8, 0.999]) expect(normCdf(normInv(p))).toBeCloseTo(p, 6);
  });
});

describe('least squares', () => {
  it('recovers an exact line and reports R² = 1', () => {
    const x = [1, 2, 3, 4, 5, 6];
    const y = x.map((v) => 0.5 + 2 * v);
    const r = ols(y, [x])!;
    expect(r.coef[0]).toBeCloseTo(0.5, 10);
    expect(r.coef[1]).toBeCloseTo(2, 10);
    expect(r.r2).toBeCloseTo(1, 10);
  });

  it('gives textbook standard errors (simple regression)', () => {
    // y = 1 + 2x + noise; SE(b) = s / sqrt(Σ(x − x̄)²).
    const x = [1, 2, 3, 4, 5, 6, 7, 8];
    const noise = [0.1, -0.2, 0.15, -0.05, 0.2, -0.1, 0.05, -0.15];
    const y = x.map((v, i) => 1 + 2 * v + noise[i]);
    const r = ols(y, [x])!;
    const mx = mean(x);
    const sxx = x.reduce((s, v) => s + (v - mx) ** 2, 0);
    expect(r.se[1]).toBeCloseTo(r.residualSd / Math.sqrt(sxx), 10);
    expect(r.t[1]).toBeCloseTo(r.coef[1] / r.se[1], 10);
  });

  it('handles several regressors and refuses a singular system', () => {
    const a = [1, 2, 3, 4, 5, 6, 7];
    const b = [2, 1, 4, 3, 6, 5, 8];
    const y = a.map((v, i) => 3 + 1.5 * v - 0.5 * b[i]);
    const r = ols(y, [a, b])!;
    expect(r.coef.map((c) => Number(c.toFixed(8)))).toEqual([3, 1.5, -0.5]);
    expect(ols(y, [a, a])).toBeNull();
    expect(
      invert([
        [1, 2],
        [2, 4],
      ]),
    ).toBeNull();
  });
});

describe('random numbers and quantiles', () => {
  it('are reproducible with a seed and roughly standard normal', () => {
    const a = seededRandom(42);
    const b = seededRandom(42);
    expect([a.next(), a.next()]).toEqual([b.next(), b.next()]);
    const g = seededRandom(7);
    const xs = Array.from({ length: 20000 }, () => g.normal());
    expect(mean(xs)).toBeCloseTo(0, 1);
    expect(Math.sqrt(variance(xs))).toBeCloseTo(1, 1);
    expect(quantile([1, 2, 3, 4, 5], 0.5)).toBe(3);
    expect(quantile([1, 2, 3, 4], 0.25)).toBe(1.75);
  });
});

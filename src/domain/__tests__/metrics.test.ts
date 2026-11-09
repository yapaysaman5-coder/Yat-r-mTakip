import { describe, expect, it } from '@jest/globals';

import {
  annualize,
  beta,
  correlation,
  jensenAlpha,
  maxDrawdown,
  stepReturns,
  riskLevel,
  sharpe,
  volatility,
  xirr,
} from '../metrics';
import { simulateWhatIf } from '../whatIf';

describe('xirr (doc §9 example, T3)', () => {
  it('matches the documented example (≈ 16,09%)', () => {
    const r = xirr([
      { date: '2025-01-01', amount: -1000 },
      { date: '2025-07-01', amount: -500 },
      { date: '2026-01-01', amount: 1700 },
    ]);
    expect(r).not.toBeNull();
    expect(r!).toBeCloseTo(0.16094, 4);
  });

  it('returns 10% for a simple one-year 10% gain', () => {
    expect(
      xirr([
        { date: '2025-01-01', amount: -100 },
        { date: '2026-01-01', amount: 110 },
      ])!,
    ).toBeCloseTo(0.1, 6);
  });

  it('handles losses', () => {
    expect(
      xirr([
        { date: '2025-01-01', amount: -100 },
        { date: '2026-01-01', amount: 80 },
      ])!,
    ).toBeCloseTo(-0.2, 6);
  });

  it('returns null without a sign change', () => {
    expect(
      xirr([
        { date: '2025-01-01', amount: -100 },
        { date: '2026-01-01', amount: -10 },
      ]),
    ).toBeNull();
  });
});

describe('time-weighted return example (doc §8, T2)', () => {
  it('chains unit values: 1 → 1,1 → 1,03125', () => {
    // Day 1: market +10%, then a 500 deposit at end of day; day 2 value 1500.
    const unitValues = [1, 1.1, 1500 / (1000 + 500 / 1.1)];
    expect(unitValues[2] / unitValues[0] - 1).toBeCloseTo(0.03125, 6);
  });
});

describe('risk statistics', () => {
  it('annualizes returns', () => {
    expect(annualize(0.21, 730)).toBeCloseTo(0.1, 6);
    expect(annualize(0.1, 365)).toBeCloseTo(0.1, 10);
  });

  it('computes period returns and volatility', () => {
    expect(stepReturns([100, 110, 99])).toEqual([0.10000000000000009, -0.09999999999999998]);
    expect(volatility([0.01, -0.01, 0.01, -0.01], 252)).toBeCloseTo(
      0.01154700538 * Math.sqrt(252),
      6,
    );
  });

  it('finds the maximum drawdown', () => {
    expect(maxDrawdown([100, 120, 90, 130, 104])).toBeCloseTo(0.25, 10);
    expect(maxDrawdown([1, 2, 3])).toBe(0);
  });

  it('beta and correlation of a series with itself are 1', () => {
    const r = [0.01, -0.02, 0.015, 0.003, -0.007];
    expect(beta(r, r)).toBeCloseTo(1, 10);
    expect(correlation(r, r)).toBeCloseTo(1, 10);
    expect(
      beta(
        r.map((x) => 2 * x),
        r,
      ),
    ).toBeCloseTo(2, 10);
  });

  it('alpha is zero when the portfolio is the benchmark', () => {
    expect(jensenAlpha(0.12, 0.12, 1, 0.05)).toBeCloseTo(0, 12);
    expect(jensenAlpha(0.15, 0.1, 1, 0)).toBeCloseTo(0.05, 12);
  });

  it('computes sharpe', () => {
    expect(sharpe(0.2, 0.05, 0.15)).toBeCloseTo(1, 10);
    expect(sharpe(0.2, 0.05, 0)).toBe(0);
  });

  it('maps volatility to the 1–7 risk scale', () => {
    expect(riskLevel(0.001)).toBe(1);
    expect(riskLevel(0.03)).toBe(3);
    expect(riskLevel(0.12)).toBe(5);
    expect(riskLevel(0.2)).toBe(6);
    expect(riskLevel(0.4)).toBe(7);
  });
});

describe('simulateWhatIf (doc §12.4 example, T4)', () => {
  it('replays deposits and withdrawals into the benchmark', () => {
    const prices = [100, 125, 80, 110];
    const r = simulateWhatIf(prices, [
      { index: 0, amount: 10_000 },
      { index: 1, amount: 5_000 },
      { index: 2, amount: -3_000 },
    ]);
    expect(r.units[0]).toBeCloseTo(100, 10);
    expect(r.units[1]).toBeCloseTo(140, 10);
    expect(r.units[2]).toBeCloseTo(102.5, 10);
    expect(r.values[3]).toBeCloseTo(11_275, 6);
    expect(r.netPnl).toBeCloseTo(-725, 6);
    expect(r.shortfall).toBe(0);
  });

  it('records a shortfall when the benchmark cannot cover a withdrawal (T11)', () => {
    const r = simulateWhatIf(
      [100, 20],
      [
        { index: 0, amount: 1_000 },
        { index: 1, amount: -500 },
      ],
    );
    expect(r.paidOut).toBeCloseTo(200, 10);
    expect(r.shortfall).toBeCloseTo(300, 10);
    expect(r.values[1]).toBe(0);
    expect(r.netPnl).toBeCloseTo(-800, 10);
  });

  it('a single deposit grows exactly with the benchmark price (its own TWR)', () => {
    const prices = [10, 11, 9, 12, 13];
    const r = simulateWhatIf(prices, [{ index: 0, amount: 1_000 }]);
    expect(r.values[4] / 1_000 - 1).toBeCloseTo(prices[4] / prices[0] - 1, 12);
  });
});

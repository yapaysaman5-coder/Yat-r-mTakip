import { describe, expect, it } from '@jest/globals';

import {
  annualize,
  beta,
  buildDailySeries,
  buildLedger,
  compareTransactions,
  convertSeries,
  correlation,
  dailyChange,
  maxDrawdown,
  simulateWhatIf,
  sortino,
  sortTransactions,
  stdev,
  unitize,
  validateTransaction,
  valuePortfolio,
  volatility,
  xirr,
  type Asset,
  type Transaction,
} from '..';

const T = (t: Partial<Transaction> & Pick<Transaction, 'id' | 'type' | 'ts'>): Transaction => t;

describe('XIRR edge cases', () => {
  it('finds a near-total loss through the bisection fallback', () => {
    const r = xirr([
      { date: '2025-01-01', amount: -1000 },
      { date: '2026-01-01', amount: 1 },
    ]);
    expect(r!).toBeCloseTo(-0.999, 6);
  });

  it('returns null when the answer is beyond +10.000%', () => {
    expect(
      xirr([
        { date: '2025-01-01', amount: -1 },
        { date: '2025-01-02', amount: 1_000_000 },
      ]),
    ).toBeNull();
  });

  it('needs at least two flows', () => {
    expect(xirr([{ date: '2025-01-01', amount: -1 }])).toBeNull();
  });
});

describe('statistics edge cases', () => {
  it('handle flat and too-short series', () => {
    expect(stdev([1])).toBe(0);
    expect(volatility([], 365)).toBe(0);
    expect(beta([0.01, 0.02], [0.01, 0.01])).toBe(0); // benchmark never moved
    expect(correlation([0.01, 0.01], [0.02, 0.01])).toBe(0);
    expect(beta([0.01], [0.02])).toBe(0);
    expect(sortino([0.01, 0.02], 0.1, 0, 252)).toBe(0); // no down days
    expect(sortino([0.01, -0.02], 0.1, 0, 252)).toBeGreaterThan(0);
    expect(annualize(0.5, 0)).toBe(0);
    expect(maxDrawdown([0, 0, 0])).toBe(0);
  });
});

describe('ledger edge cases', () => {
  it('flags records that miss their asset and skips them', () => {
    const l = buildLedger([
      T({ id: 'b', type: 'BUY', ts: '2026-01-01T08:00:00Z', quantity: '1', price: '1' }),
      T({ id: 's', type: 'SELL', ts: '2026-01-02T08:00:00Z', quantity: '1', price: '1' }),
      T({ id: 'v', type: 'DIVIDEND', ts: '2026-01-03T08:00:00Z', amount: '1' }),
      T({ id: 'p', type: 'SPLIT', ts: '2026-01-04T08:00:00Z', splitRatio: '2' }),
    ]);
    expect(l.issues.map((i) => i.code)).toEqual([
      'MISSING_ASSET',
      'MISSING_ASSET',
      'MISSING_ASSET',
      'MISSING_ASSET',
    ]);
    expect(l.positions.size).toBe(0);
  });

  it('ignores a non-positive split ratio and a sale of nothing', () => {
    const l = buildLedger([
      T({ id: 'd', type: 'DEPOSIT', ts: '2026-01-01T07:00:00Z', amount: '100' }),
      T({
        id: 'b',
        type: 'BUY',
        ts: '2026-01-01T08:00:00Z',
        assetId: 'X',
        quantity: '10',
        price: '10',
      }),
      T({ id: 'p', type: 'SPLIT', ts: '2026-01-02T08:00:00Z', assetId: 'X', splitRatio: '0' }),
      T({
        id: 's',
        type: 'SELL',
        ts: '2026-01-03T08:00:00Z',
        assetId: 'Y',
        quantity: '1',
        price: '1',
      }),
    ]);
    expect(l.positions.get('X')!.quantity.toFixed()).toBe('10');
    expect(l.issues.map((i) => i.code)).toEqual(['OVERSELL']);
    expect(l.realizations).toEqual([]);
  });

  it('sorts ties by type and then by id, in both directions', () => {
    const ts = '2026-01-01T10:00:00Z';
    expect(
      compareTransactions(
        T({ id: 'a', type: 'BUY', ts }),
        T({ id: 'a', type: 'BUY', ts: '2026-01-01T09:00:00Z' }),
      ),
    ).toBeGreaterThan(0);
    expect(
      compareTransactions(T({ id: 'a', type: 'SELL', ts }), T({ id: 'b', type: 'BUY', ts })),
    ).toBeGreaterThan(0);
    expect(
      compareTransactions(T({ id: 'b', type: 'BUY', ts }), T({ id: 'a', type: 'BUY', ts })),
    ).toBeGreaterThan(0);
    expect(
      compareTransactions(T({ id: 'a', type: 'BUY', ts }), T({ id: 'a', type: 'BUY', ts })),
    ).toBe(0);
    expect(
      sortTransactions([
        T({ id: 'b', type: 'BUY', ts }),
        T({ id: 'a', type: 'BUY', ts }),
        T({ id: 'a', type: 'BUY', ts }),
      ]).map((t) => t.id),
    ).toEqual(['a', 'a', 'b']);
  });
});

describe('valuation edge cases', () => {
  it('handles free shares (zero cost) without dividing by zero', () => {
    const l = buildLedger([
      T({
        id: 'b',
        type: 'BUY',
        ts: '2026-01-01T08:00:00Z',
        assetId: 'X',
        quantity: '10',
        price: '0',
      }),
    ]);
    const v = valuePortfolio(l, { X: { price: 5 } });
    expect(v.positions[0].unrealizedRatio).toBeNull();
    expect(v.positions[0].fxSplit).toBeNull();
    expect(v.positions[0].valueTRY.toFixed()).toBe('50');
  });

  it('gives zero weights when the portfolio is worth nothing', () => {
    const l = buildLedger([
      T({
        id: 'b',
        type: 'BUY',
        ts: '2026-01-01T08:00:00Z',
        assetId: 'X',
        quantity: '10',
        price: '10',
      }),
    ]);
    const v = valuePortfolio(l, { X: { price: 0 } });
    expect(v.totalValue.lte(0)).toBe(true);
    expect(v.positions[0].weight.toFixed()).toBe('0');
  });

  it('values a missing quote at the last trade price and rate', () => {
    const l = buildLedger([
      T({
        id: 'b',
        type: 'BUY',
        ts: '2026-01-01T15:00:00Z',
        assetId: 'U',
        quantity: '2',
        price: '100',
        fxRate: '40',
      }),
    ]);
    const v = valuePortfolio(l, {});
    expect(v.positions[0].valueTRY.toFixed()).toBe('8000');
    expect(v.positions[0].stale).toBe(true);
  });

  it('computes today’s change without quotes (no move) and ignores cash records', () => {
    const txns = [
      T({ id: 'd', type: 'DEPOSIT', ts: '2026-11-09T07:00:00Z', amount: '1000' }),
      T({
        id: 'b',
        type: 'BUY',
        ts: '2026-11-09T08:00:00Z',
        assetId: 'X',
        quantity: '10',
        price: '10',
      }),
    ];
    const d = dailyChange(txns, {}, '2026-11-08T21:00:00Z');
    expect(d.total.toFixed()).toBe('0');
    expect(d.ratio).toBeNull();
  });
});

describe('series edge cases', () => {
  const assets = new Map<string, Asset>([
    ['U', { id: 'U', symbol: 'U', market: 'US', currency: 'USD' }],
  ]);

  it('values an unknown asset in TRY and closed positions at zero', () => {
    const s = buildDailySeries(
      [
        T({ id: 'd', type: 'DEPOSIT', ts: '2026-01-01T07:00:00Z', amount: '100' }),
        T({
          id: 'b',
          type: 'BUY',
          ts: '2026-01-01T08:00:00Z',
          assetId: 'Z',
          quantity: '1',
          price: '50',
        }),
        T({
          id: 's',
          type: 'SELL',
          ts: '2026-01-02T08:00:00Z',
          assetId: 'Z',
          quantity: '1',
          price: '60',
        }),
      ],
      assets,
      { Z: { '2026-01-01': 55 } },
      {},
    );
    expect(s.map((p) => p.value)).toEqual([105, 110]);
  });

  it('uses the trade’s rate until a market rate is known', () => {
    const s = buildDailySeries(
      [
        T({
          id: 'b',
          type: 'BUY',
          ts: '2026-01-01T15:00:00Z',
          assetId: 'U',
          quantity: '1',
          price: '100',
          fxRate: '40',
        }),
      ],
      assets,
      { U: { '2026-01-01': 100 } },
      { USD: {} },
    );
    expect(s[0].value).toBe(0); // 4000 of stock − 4000 cash spent
  });

  it('produces NaN in another currency until a first rate exists', () => {
    const usd = convertSeries(
      [{ date: '2026-01-01', value: 10, cash: 0, netInvested: 10, flow: 10 }],
      {},
    );
    expect(Number.isNaN(usd[0].value)).toBe(true);
  });
});

describe('TWR and what-if edge cases', () => {
  it('waits for the first deposit before starting', () => {
    const u = unitize([
      { date: 'd0', value: 0, flow: 0 },
      { date: 'd1', value: 100, flow: 100 },
    ]);
    expect(u[0]).toEqual({ date: 'd0', unitValue: 1, units: 0 });
    expect(u[1].units).toBe(100);
  });

  it('skips flows on days without a valid price', () => {
    const r = simulateWhatIf(
      [0, 10],
      [
        { index: 0, amount: 100 },
        { index: 1, amount: 100 },
      ],
    );
    expect(r.totalIn).toBe(100);
    expect(r.values).toEqual([0, 100]);
  });
});

describe('validation edge cases', () => {
  it('rejects a non-string numeric field and an invalid tax', () => {
    const issues = validateTransaction(
      {
        id: 'v',
        type: 'DIVIDEND',
        ts: '2026-01-01T08:00:00Z',
        assetId: 'X',
        amount: '10',
        tax: 'x',
        fxRate: '0',
      },
      { now: Date.parse('2026-02-01T00:00:00Z') },
    );
    expect(issues.map((i) => `${String(i.field)}:${i.code}`)).toEqual([
      'tax:NOT_A_NUMBER',
      'fxRate:MUST_BE_POSITIVE',
    ]);
    const bad = validateTransaction(
      {
        id: 'b',
        type: 'BUY',
        ts: '2026-01-01T08:00:00Z',
        assetId: 'X',
        quantity: 5 as unknown as string,
        price: '1',
      },
      { now: Date.parse('2026-02-01T00:00:00Z') },
    );
    expect(bad).toEqual([{ field: 'quantity', code: 'NOT_A_NUMBER' }]);
    const split = validateTransaction(
      { id: 'p', type: 'SPLIT', ts: '2026-01-01T08:00:00Z', assetId: 'X', splitRatio: 'abc' },
      { now: Date.parse('2026-02-01T00:00:00Z') },
    );
    expect(split).toEqual([{ field: 'splitRatio', code: 'NOT_A_NUMBER' }]);
  });
});

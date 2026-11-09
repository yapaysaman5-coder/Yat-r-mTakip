import { describe, expect, it } from '@jest/globals';

import { autoDepositId, autoWithdrawId, reconcileAutoRecords } from '../autoRecords';
import { dec } from '../decimal';
import { buildLedger } from '../ledger';
import type { Transaction } from '../types';
import { dailyChange, fxDecomposition, identityGap, valuePortfolio } from '../valuation';

const T = (t: Partial<Transaction> & Pick<Transaction, 'id' | 'type' | 'ts'>): Transaction => t;

describe('automatic linked records', () => {
  it('adds a deposit for the cash shortfall of a buy, at the same time (invariant 4)', () => {
    const txns = reconcileAutoRecords(
      [
        T({ id: 'd', type: 'DEPOSIT', ts: '2026-01-01T07:00:00Z', amount: '1000' }),
        T({
          id: 'b',
          type: 'BUY',
          ts: '2026-01-02T08:00:00Z',
          assetId: 'X',
          quantity: '10',
          price: '120',
          fee: '2',
        }),
      ],
      { autoDeposit: true },
    );
    const auto = txns.find((t) => t.id === autoDepositId('b'))!;
    expect(auto).toMatchObject({
      type: 'DEPOSIT',
      ts: '2026-01-02T08:00:00Z',
      amount: '202',
      isAuto: true,
      linkedTo: 'b',
    });
    // The automatic deposit is processed right before its buy.
    expect(txns.map((t) => t.id)).toEqual(['d', autoDepositId('b'), 'b']);
    const l = buildLedger(txns);
    expect(l.cash.toFixed()).toBe('0');
    expect(l.issues).toEqual([]);
  });

  it('does nothing when the setting is off', () => {
    const txns = reconcileAutoRecords(
      [
        T({
          id: 'b',
          type: 'BUY',
          ts: '2026-01-02T08:00:00Z',
          assetId: 'X',
          quantity: '1',
          price: '5',
        }),
      ],
      { autoDeposit: false },
    );
    expect(txns.map((t) => t.id)).toEqual(['b']);
  });

  it('regenerates linked records after a buy is edited or deleted', () => {
    const base = [
      T({
        id: 'b1',
        type: 'BUY',
        ts: '2026-01-02T08:00:00Z',
        assetId: 'X',
        quantity: '10',
        price: '100',
      }),
      T({
        id: 'b2',
        type: 'BUY',
        ts: '2026-02-02T08:00:00Z',
        assetId: 'X',
        quantity: '5',
        price: '100',
      }),
    ];
    const first = reconcileAutoRecords(base, { autoDeposit: true });
    expect(first.filter((t) => t.isAuto).map((t) => t.amount)).toEqual(['1000', '500']);

    const edited = first.map((t) => (t.id === 'b1' ? { ...t, quantity: '20' } : t));
    const second = reconcileAutoRecords(edited, { autoDeposit: true });
    expect(second.filter((t) => t.isAuto).map((t) => t.amount)).toEqual(['2000', '500']);

    const deleted = reconcileAutoRecords(
      second.filter((t) => t.id !== 'b1'),
      { autoDeposit: true },
    );
    expect(deleted.filter((t) => t.isAuto).map((t) => [t.linkedTo, t.amount])).toEqual([
      ['b2', '500'],
    ]);
  });

  it('withdraws sale proceeds when the sale asks for it', () => {
    const txns = reconcileAutoRecords(
      [
        T({
          id: 'b',
          type: 'BUY',
          ts: '2026-01-02T08:00:00Z',
          assetId: 'X',
          quantity: '10',
          price: '10',
        }),
        T({
          id: 's',
          type: 'SELL',
          ts: '2026-03-02T08:00:00Z',
          assetId: 'X',
          quantity: '10',
          price: '12',
          fee: '1',
          fxRate: '1',
          withdrawProceeds: true,
        }),
      ],
      { autoDeposit: true },
    );
    expect(txns.find((t) => t.id === autoWithdrawId('s'))).toMatchObject({
      type: 'WITHDRAW',
      amount: '119',
      linkedTo: 's',
    });
    const l = buildLedger(txns);
    expect(l.cash.toFixed()).toBe('0');
    expect(l.withdrawn.toFixed()).toBe('119');
  });

  it('uses prior cash before adding a deposit, across currencies, dividends and fees', () => {
    const txns = reconcileAutoRecords(
      [
        T({ id: 'd', type: 'DEPOSIT', ts: '2026-01-01T07:00:00Z', amount: '1000' }),
        T({
          id: 'v',
          type: 'DIVIDEND',
          ts: '2026-01-01T08:00:00Z',
          assetId: 'Y',
          amount: '10',
          tax: '1',
          fxRate: '40',
        }),
        T({ id: 'f', type: 'FEE', ts: '2026-01-01T09:00:00Z', amount: '60' }),
        T({ id: 'w', type: 'WITHDRAW', ts: '2026-01-01T10:00:00Z', amount: '100' }),
        T({ id: 'sp', type: 'SPLIT', ts: '2026-01-01T11:00:00Z', assetId: 'Y', splitRatio: '2' }),
        T({
          id: 'b',
          type: 'BUY',
          ts: '2026-01-02T08:00:00Z',
          assetId: 'X',
          quantity: '1',
          price: '30',
          fxRate: '40',
        }),
      ],
      { autoDeposit: true },
    );
    // cash before the buy: 1000 + 360 − 60 − 100 = 1200; buy costs 1200 → no deposit needed
    expect(txns.filter((t) => t.isAuto)).toEqual([]);
  });
});

describe('valuation', () => {
  const txns = reconcileAutoRecords(
    [
      T({ id: 'd', type: 'DEPOSIT', ts: '2026-01-01T07:00:00Z', amount: '100000' }),
      T({
        id: 'b1',
        type: 'BUY',
        ts: '2026-01-02T08:00:00Z',
        assetId: 'THYAO',
        quantity: '100',
        price: '300',
        fee: '6',
        fxRate: '1',
      }),
      T({
        id: 'b2',
        type: 'BUY',
        ts: '2026-01-02T15:00:00Z',
        assetId: 'AAPL',
        quantity: '10',
        price: '200',
        fxRate: '32',
      }),
      T({
        id: 's1',
        type: 'SELL',
        ts: '2026-02-02T08:00:00Z',
        assetId: 'THYAO',
        quantity: '40',
        price: '320',
        fee: '2.56',
        fxRate: '1',
      }),
      T({
        id: 'v',
        type: 'DIVIDEND',
        ts: '2026-03-02T08:00:00Z',
        assetId: 'THYAO',
        amount: '300',
        tax: '45',
        fxRate: '1',
      }),
      T({ id: 'f', type: 'FEE', ts: '2026-03-03T08:00:00Z', amount: '25' }),
      T({ id: 'w', type: 'WITHDRAW', ts: '2026-03-04T08:00:00Z', amount: '5000' }),
    ],
    { autoDeposit: true },
  );
  const quotes = {
    THYAO: { price: '312.4', prevClose: '308.7', fx: '1', fxPrev: '1' },
    AAPL: { price: '240', prevClose: '242', fx: '40', fxPrev: '39.9' },
  };

  it('values positions and the budget', () => {
    const v = valuePortfolio(buildLedger(txns), quotes);
    const thy = v.positions.find((p) => p.assetId === 'THYAO')!;
    const aapl = v.positions.find((p) => p.assetId === 'AAPL')!;
    expect(thy.valueTRY.toFixed()).toBe('18744');
    expect(aapl.valueTRY.toFixed()).toBe('96000');
    expect(thy.averageCost.toFixed()).toBe('300.06');
    expect(v.deposited.toFixed()).toBe('100000');
    expect(v.withdrawn.toFixed()).toBe('5000');
    expect(v.netInvested.toFixed()).toBe('95000');
    expect(v.totalValue.toFixed()).toBe(v.positionsValue.plus(v.cash).toFixed());
    expect(v.positions[0].assetId).toBe('AAPL'); // sorted by value
    expect(thy.weight.plus(aapl.weight).plus(v.cash.div(v.totalValue)).toFixed(10)).toBe(
      '1.0000000000',
    );
  });

  it('balances: net P/L = unrealized + realized + dividends − fees (invariant 1)', () => {
    for (const method of ['average', 'fifo'] as const) {
      const v = valuePortfolio(buildLedger(txns, { method }), quotes);
      expect(identityGap(v).toFixed()).toBe('0');
    }
  });

  it('T5 — splits a foreign position’s gain into price and currency effects (doc §5.2)', () => {
    const l = buildLedger([
      T({
        id: 'b',
        type: 'BUY',
        ts: '2026-01-02T15:00:00Z',
        assetId: 'AAPL',
        quantity: '10',
        price: '200',
        fxRate: '32',
      }),
    ]);
    const split = fxDecomposition(l.positions.get('AAPL')!, dec(240), dec(40))!;
    expect(split.priceEffect.toFixed()).toBe('12800');
    expect(split.fxEffect.toFixed()).toBe('19200');
    const v = valuePortfolio(l, { AAPL: { price: 240, fx: 40 } });
    expect(
      v.positions[0].fxSplit!.priceEffect.plus(v.positions[0].fxSplit!.fxEffect).toFixed(),
    ).toBe(v.positions[0].unrealizedTRY.toFixed());
  });

  it('has no FX split for TRY assets', () => {
    const v = valuePortfolio(buildLedger(txns), quotes, { foreignCurrency: (id) => id === 'AAPL' });
    expect(v.positions.find((p) => p.assetId === 'THYAO')!.fxSplit).toBeNull();
    expect(v.positions.find((p) => p.assetId === 'AAPL')!.fxSplit).not.toBeNull();
  });

  it('falls back to the last trade price when a quote is missing, and says so', () => {
    const v = valuePortfolio(buildLedger(txns), { THYAO: quotes.THYAO });
    expect(v.staleAssets).toEqual(['AAPL']);
    expect(v.positions.find((p) => p.assetId === 'AAPL')!.valueTRY.toFixed()).toBe('64000');
  });

  it('reports no simple return when nothing is invested', () => {
    const v = valuePortfolio(buildLedger([]), {});
    expect(v.simpleReturn).toBeNull();
    expect(v.totalValue.toFixed()).toBe('0');
  });
});

describe('T6 — today’s change (doc §5.3)', () => {
  const base: Transaction[] = [
    T({ id: 'd', type: 'DEPOSIT', ts: '2026-11-01T07:00:00Z', amount: '100000' }),
    T({
      id: 'b',
      type: 'BUY',
      ts: '2026-11-02T08:00:00Z',
      assetId: 'X',
      quantity: '100',
      price: '300',
      fxRate: '1',
    }),
  ];
  const dayStart = '2026-11-08T21:00:00Z'; // 9 Nov 00:00 Istanbul

  it('units held since yesterday move with the price', () => {
    const d = dailyChange(base, { X: { price: 312, prevClose: 310 } }, dayStart);
    expect(d.total.toFixed()).toBe('200');
    expect(d.startValue.toFixed()).toBe(String(100 * 310 + 70000));
  });

  it('units bought today count from their purchase price', () => {
    const txns = [
      ...base,
      T({
        id: 'b2',
        type: 'BUY',
        ts: '2026-11-09T08:00:00Z',
        assetId: 'X',
        quantity: '10',
        price: '311',
        fee: '1',
        fxRate: '1',
      }),
    ];
    const d = dailyChange(txns, { X: { price: 312, prevClose: 310 } }, dayStart);
    // 100 × (312 − 310) + 10 × 312 − 3111
    expect(d.total.toFixed()).toBe(String(200 + 3120 - 3111));
  });

  it('a same-day buy and sell counts only its own result', () => {
    const txns = [
      ...base,
      T({
        id: 'b2',
        type: 'BUY',
        ts: '2026-11-09T08:00:00Z',
        assetId: 'Y',
        quantity: '10',
        price: '50',
        fxRate: '1',
      }),
      T({
        id: 's2',
        type: 'SELL',
        ts: '2026-11-09T09:00:00Z',
        assetId: 'Y',
        quantity: '10',
        price: '53',
        fxRate: '1',
      }),
    ];
    const d = dailyChange(
      txns,
      { X: { price: 310, prevClose: 310 }, Y: { price: 55, prevClose: 49 } },
      dayStart,
    );
    expect(d.byAsset.Y.toFixed()).toBe('30');
    expect(d.total.toFixed()).toBe('30');
  });

  it('units sold today count from yesterday’s close', () => {
    const txns = [
      ...base,
      T({
        id: 's',
        type: 'SELL',
        ts: '2026-11-09T08:00:00Z',
        assetId: 'X',
        quantity: '100',
        price: '315',
        fxRate: '1',
      }),
    ];
    const d = dailyChange(txns, { X: { price: 312, prevClose: 310 } }, dayStart);
    expect(d.total.toFixed()).toBe('500');
  });

  it('includes the currency move for foreign assets', () => {
    const txns = [
      T({ id: 'd', type: 'DEPOSIT', ts: '2026-11-01T07:00:00Z', amount: '84000' }),
      T({
        id: 'b',
        type: 'BUY',
        ts: '2026-11-02T15:00:00Z',
        assetId: 'A',
        quantity: '10',
        price: '200',
        fxRate: '42',
      }),
    ];
    const d = dailyChange(
      txns,
      { A: { price: 200, prevClose: 200, fx: 42.5, fxPrev: 42 } },
      dayStart,
    );
    expect(d.total.toFixed()).toBe('1000');
    expect(d.ratio!.toFixed(6)).toBe((1000 / 84000).toFixed(6));
  });

  it('is empty for an empty portfolio', () => {
    const d = dailyChange([], {}, dayStart);
    expect(d.total.toFixed()).toBe('0');
    expect(d.ratio).toBeNull();
  });
});

describe('automatic deposit rounding', () => {
  it('rounds the shortfall up to whole kuruş so cash never dips below zero', () => {
    const txns = reconcileAutoRecords(
      [
        T({
          id: 'b',
          type: 'BUY',
          ts: '2026-01-02T15:00:00Z',
          assetId: 'U',
          quantity: '3',
          price: '33.333',
          fxRate: '41.2345',
        }),
      ],
      { autoDeposit: true },
    );
    const auto = txns.find((t) => t.isAuto)!;
    expect(auto.amount).toBe('4123.41'); // 3 × 33,333 × 41,2345 = 4123,4088… → 4123,41
    expect(buildLedger(txns).cash.gte(0)).toBe(true);
  });
});

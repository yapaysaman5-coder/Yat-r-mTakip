import { describe, expect, it } from '@jest/globals';

import { buildLedger, openPositions, quantityAt } from '../ledger';
import { compareTransactions, sortTransactions, trDay, trDayEnd } from '../order';
import type { Transaction } from '../types';
import { validateTransaction } from '../validate';

const buy = (
  id: string,
  ts: string,
  quantity: string,
  price: string,
  extra: Partial<Transaction> = {},
): Transaction => ({
  id,
  type: 'BUY',
  ts,
  assetId: 'X',
  quantity,
  price,
  ...extra,
});
const sell = (
  id: string,
  ts: string,
  quantity: string,
  price: string,
  extra: Partial<Transaction> = {},
): Transaction => ({
  id,
  type: 'SELL',
  ts,
  assetId: 'X',
  quantity,
  price,
  ...extra,
});
const deposit = (id: string, ts: string, amount: string): Transaction => ({
  id,
  type: 'DEPOSIT',
  ts,
  amount,
});

/** Doc §4.3: buy 100 @ 10 (fee 2), buy 50 @ 16 (fee 1), sell 80 @ 20 (fee 1,60). */
const DOC_EXAMPLE: Transaction[] = [
  deposit('d1', '2026-01-01T07:00:00Z', '10000'),
  buy('b1', '2026-01-02T08:00:00Z', '100', '10', { fee: '2' }),
  buy('b2', '2026-02-02T08:00:00Z', '50', '16', { fee: '1' }),
  sell('s1', '2026-03-02T08:00:00Z', '80', '20', { fee: '1.6' }),
];

describe('T1 — average cost vs FIFO (doc §4.3)', () => {
  it('average cost', () => {
    const l = buildLedger(DOC_EXAMPLE, { method: 'average' });
    const p = l.positions.get('X')!;
    expect(l.realizations[0].pnl.toFixed()).toBe('636.8');
    expect(p.quantity.toFixed()).toBe('70');
    expect(p.cost.toFixed()).toBe('841.4');
    expect(p.cost.div(p.quantity).toFixed(2)).toBe('12.02');
    // Unrealized at a price of 18: 70 × 18 − 841,40
    expect(p.quantity.times(18).minus(p.cost).toFixed()).toBe('418.6');
  });

  it('FIFO', () => {
    const l = buildLedger(DOC_EXAMPLE, { method: 'fifo' });
    const p = l.positions.get('X')!;
    expect(l.realizations[0].pnl.toFixed()).toBe('796.8');
    expect(p.cost.toFixed()).toBe('1001.4');
    expect(p.cost.div(p.quantity).toFixed(2)).toBe('14.31');
    expect(p.quantity.times(18).minus(p.cost).toFixed()).toBe('258.6');
  });

  it('total P/L does not depend on the method (invariant 2)', () => {
    for (const method of ['average', 'fifo'] as const) {
      const l = buildLedger(DOC_EXAMPLE, { method });
      const p = l.positions.get('X')!;
      const total = l.realizedTotal.plus(p.quantity.times(18).minus(p.costTRY));
      expect(total.toFixed()).toBe('1055.4');
    }
  });
});

describe('cash and budget', () => {
  it('tracks deposits, buys, sells, dividends, fees and withdrawals', () => {
    const l = buildLedger([
      ...DOC_EXAMPLE,
      {
        id: 'dv',
        type: 'DIVIDEND',
        ts: '2026-03-10T08:00:00Z',
        assetId: 'X',
        amount: '50',
        tax: '5',
      },
      { id: 'f', type: 'FEE', ts: '2026-03-11T08:00:00Z', amount: '7.5' },
      { id: 'w', type: 'WITHDRAW', ts: '2026-03-12T08:00:00Z', amount: '1000' },
    ]);
    // 10000 − 1002 − 801 + 1598,40 + 45 − 7,50 − 1000
    expect(l.cash.toFixed()).toBe('8832.9');
    expect(l.deposited.toFixed()).toBe('10000');
    expect(l.withdrawn.toFixed()).toBe('1000');
    expect(l.dividends.toFixed()).toBe('45');
    expect(l.accountFees.toFixed()).toBe('7.5');
    expect(l.commissions.toFixed()).toBe('4.6');
    expect(l.positions.get('X')!.dividendsTRY.toFixed()).toBe('45');
  });

  it('converts foreign-currency trades and dividends at their own rates', () => {
    const l = buildLedger([
      deposit('d', '2026-01-01T07:00:00Z', '100000'),
      buy('b', '2026-01-02T15:00:00Z', '10', '200', { fee: '1', fxRate: '32' }),
      {
        id: 'dv',
        type: 'DIVIDEND',
        ts: '2026-02-01T15:00:00Z',
        assetId: 'X',
        amount: '2.5',
        tax: '0.5',
        fxRate: '33',
      },
      sell('s', '2026-03-02T15:00:00Z', '4', '240', { fee: '1', fxRate: '40' }),
    ]);
    const p = l.positions.get('X')!;
    expect(p.costTRY.toFixed()).toBe('38419.2'); // (2001 × 32) × 6/10
    expect(p.cost.toFixed()).toBe('1200.6'); // 2001 × 6/10
    expect(l.realizations[0].proceedsTRY.toFixed()).toBe('38360'); // (960 − 1) × 40
    expect(l.realizations[0].pnlTRY.toFixed()).toBe('12747.2'); // 38360 − 25612,8
    expect(l.dividends.toFixed()).toBe('66'); // (2,5 − 0,5) × 33
    expect(l.cash.toFixed()).toBe(String(100000 - 64032 + 66 + 38360));
  });

  it('flags spending more cash than available', () => {
    const l = buildLedger([
      deposit('d', '2026-01-01T07:00:00Z', '100'),
      buy('b', '2026-01-02T08:00:00Z', '2', '60'),
    ]);
    expect(l.issues).toEqual([{ txnId: 'b', code: 'NEGATIVE_CASH', cash: '-20' }]);
  });
});

describe('selling', () => {
  it('T7 — rejects selling more than held and keeps the books consistent', () => {
    const l = buildLedger([
      deposit('d', '2026-01-01T07:00:00Z', '1000'),
      buy('b', '2026-01-02T08:00:00Z', '10', '10'),
      sell('s', '2026-01-03T08:00:00Z', '15', '12'),
    ]);
    expect(l.issues).toEqual([{ txnId: 's', code: 'OVERSELL', available: '10', requested: '15' }]);
    expect(l.positions.get('X')!.quantity.toFixed()).toBe('0');
    expect(l.realizations[0].quantity.toFixed()).toBe('10');
  });

  it('T8 — deleting an earlier buy surfaces the later sell that no longer fits', () => {
    const txns = [
      deposit('d', '2026-01-01T07:00:00Z', '5000'),
      buy('b1', '2026-01-02T08:00:00Z', '10', '100'),
      buy('b2', '2026-01-05T08:00:00Z', '10', '100'),
      sell('s', '2026-02-01T08:00:00Z', '15', '120'),
    ];
    expect(buildLedger(txns).issues).toEqual([]);
    const withoutB1 = txns.filter((t) => t.id !== 'b1');
    expect(buildLedger(withoutB1).issues.map((i) => [i.txnId, i.code])).toEqual([
      ['s', 'OVERSELL'],
    ]);
  });

  it('T6 — same-day buy and sell realize the right profit', () => {
    const l = buildLedger([
      deposit('d', '2026-01-01T07:00:00Z', '10000'),
      buy('b', '2026-01-02T08:00:00Z', '10', '100', { fee: '2' }),
      sell('s', '2026-01-02T12:00:00Z', '10', '103', { fee: '2' }),
    ]);
    expect(l.realizations[0].pnl.toFixed()).toBe('26');
    expect(l.positions.get('X')!.cost.toFixed()).toBe('0');
    expect(openPositions(l)).toEqual([]);
  });

  it('closing a position releases its whole cost exactly (thirds)', () => {
    const l = buildLedger([
      deposit('d', '2026-01-01T07:00:00Z', '1000'),
      buy('b', '2026-01-02T08:00:00Z', '3', '100'),
      sell('s1', '2026-01-03T08:00:00Z', '1', '100'),
      sell('s2', '2026-01-04T08:00:00Z', '1', '100'),
      sell('s3', '2026-01-05T08:00:00Z', '1', '100'),
    ]);
    const p = l.positions.get('X')!;
    expect(p.cost.toFixed()).toBe('0');
    expect(l.realizedTotal.toFixed()).toBe('0');
  });

  it('reports the holding period of the sold units (oldest first)', () => {
    const l = buildLedger([
      deposit('d', '2026-01-01T00:00:00Z', '10000'),
      buy('b1', '2026-01-01T00:00:00Z', '10', '10'),
      buy('b2', '2026-01-11T00:00:00Z', '10', '10'),
      sell('s', '2026-01-21T00:00:00Z', '15', '10'),
    ]);
    // 10 units held 20 days + 5 units held 10 days → 16,67 days
    expect(l.realizations[0].holdingDays).toBeCloseTo(16.6667, 3);
  });

  it('quantityAt answers "how many did I hold then"', () => {
    expect(quantityAt(DOC_EXAMPLE, 'X', '2026-02-15T00:00:00Z').toFixed()).toBe('150');
    expect(quantityAt(DOC_EXAMPLE, 'X', '2026-03-03T00:00:00Z').toFixed()).toBe('70');
    expect(quantityAt(DOC_EXAMPLE, 'Y', '2026-03-03T00:00:00Z').toFixed()).toBe('0');
  });
});

describe('splits and bonus issues (doc §13.1)', () => {
  it('a 100% bonus doubles units, halves unit cost and keeps total cost (invariant 3)', () => {
    for (const method of ['average', 'fifo'] as const) {
      const l = buildLedger(
        [
          deposit('d', '2026-01-01T07:00:00Z', '10000'),
          buy('b', '2026-01-02T08:00:00Z', '100', '50', { fee: '10' }),
          { id: 'sp', type: 'SPLIT', ts: '2026-02-01T05:00:00Z', assetId: 'X', splitRatio: '2' },
          sell('s', '2026-03-01T08:00:00Z', '50', '30'),
        ],
        { method },
      );
      const p = l.positions.get('X')!;
      expect(p.quantity.toFixed()).toBe('150');
      // cost 5010 → after selling 50 of 200 units: 5010 × 150/200
      expect(p.cost.toFixed()).toBe('3757.5');
      expect(l.realizations[0].pnl.toFixed()).toBe(String(1500 - 1252.5));
    }
  });

  it('ignores a split for an asset that is not held', () => {
    const l = buildLedger([
      { id: 'sp', type: 'SPLIT', ts: '2026-02-01T05:00:00Z', assetId: 'X', splitRatio: '2' },
    ]);
    expect(l.positions.get('X')!.quantity.toFixed()).toBe('0');
  });
});

describe('ordering', () => {
  it('orders by time, then SPLIT → DEPOSIT → BUY → SELL → DIVIDEND → FEE → WITHDRAW', () => {
    const ts = '2026-01-01T10:00:00Z';
    const types = ['WITHDRAW', 'FEE', 'SELL', 'DIVIDEND', 'BUY', 'DEPOSIT', 'SPLIT'] as const;
    const sorted = sortTransactions(types.map((type, i) => ({ id: String(i), type, ts })));
    expect(sorted.map((t) => t.type)).toEqual([
      'SPLIT',
      'DEPOSIT',
      'BUY',
      'SELL',
      'DIVIDEND',
      'FEE',
      'WITHDRAW',
    ]);
    expect(
      compareTransactions({ id: 'a', type: 'BUY', ts }, { id: 'b', type: 'BUY', ts }),
    ).toBeLessThan(0);
  });

  it('maps timestamps to Istanbul calendar days', () => {
    expect(trDay('2026-11-08T20:59:59Z')).toBe('2026-11-08');
    expect(trDay('2026-11-08T21:00:00Z')).toBe('2026-11-09');
    expect(new Date(trDayEnd('2026-11-08')).toISOString()).toBe('2026-11-08T21:00:00.000Z');
  });

  it('respects the until / before bounds', () => {
    expect(
      buildLedger(DOC_EXAMPLE, { before: '2026-02-02T08:00:00Z' })
        .positions.get('X')!
        .quantity.toFixed(),
    ).toBe('100');
    expect(
      buildLedger(DOC_EXAMPLE, { until: '2026-02-02T08:00:00Z' })
        .positions.get('X')!
        .quantity.toFixed(),
    ).toBe('150');
  });
});

describe('validateTransaction', () => {
  const now = Date.parse('2026-11-09T10:00:00Z');
  const codes = (t: Transaction) =>
    validateTransaction(t, { now }).map((i) => `${String(i.field)}:${i.code}`);

  it('accepts well-formed transactions', () => {
    expect(
      codes(buy('b', '2026-11-09T09:00:00Z', '10', '312.4', { fee: '6.25', fxRate: '1' })),
    ).toEqual([]);
    expect(codes(deposit('d', '2026-11-01T09:00:00Z', '50000'))).toEqual([]);
  });

  it('rejects missing and invalid fields', () => {
    expect(codes({ id: 'b', type: 'BUY', ts: '2026-11-09T09:00:00Z' })).toEqual([
      'assetId:REQUIRED',
      'quantity:REQUIRED',
      'price:REQUIRED',
    ]);
    expect(codes(buy('b', '2026-11-09T09:00:00Z', '0', '-1', { fee: 'abc' }))).toEqual([
      'quantity:MUST_BE_POSITIVE',
      'price:MUST_NOT_BE_NEGATIVE',
      'fee:NOT_A_NUMBER',
    ]);
    expect(codes(deposit('d', '2026-11-01T09:00:00Z', '0'))).toEqual(['amount:MUST_BE_POSITIVE']);
  });

  it('rejects bad dates and future dates', () => {
    expect(codes(deposit('d', 'not a date', '1'))).toEqual(['ts:INVALID_DATE']);
    expect(codes(deposit('d', '2026-11-10T09:00:00Z', '1'))).toEqual(['ts:FUTURE_DATE']);
  });

  it('checks dividends and splits', () => {
    expect(
      codes({
        id: 'v',
        type: 'DIVIDEND',
        ts: '2026-11-01T09:00:00Z',
        assetId: 'X',
        amount: '10',
        tax: '12',
      }),
    ).toEqual(['tax:TAX_EXCEEDS_AMOUNT']);
    expect(
      codes({ id: 's', type: 'SPLIT', ts: '2026-11-01T09:00:00Z', assetId: 'X', splitRatio: '1' }),
    ).toEqual(['splitRatio:SPLIT_RATIO_ONE']);
  });

  it('checks the asset exists when an asset list is given', () => {
    const issues = validateTransaction(buy('b', '2026-11-09T09:00:00Z', '1', '1'), {
      now,
      assets: new Map(),
    });
    expect(issues).toEqual([{ field: 'assetId', code: 'UNKNOWN_ASSET' }]);
  });
});

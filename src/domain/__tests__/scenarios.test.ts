import { describe, expect, it } from '@jest/globals';

import {
  buildLedger,
  dec,
  identityGap,
  reconcileAutoRecords,
  sum,
  toNum,
  toStr,
  valuePortfolio,
  type Transaction,
} from '..';

/** Deterministic pseudo-random numbers for reproducible scenarios. */
function rng(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('T12 — 10.000 transactions with 8-decimal crypto quantities', () => {
  it('stays exact to the last satoshi and is fast', () => {
    const rand = rng(42);
    const txns: Transaction[] = [];
    const start = Date.parse('2024-01-01T00:00:00Z');
    let held = 0n; // satoshis, tracked independently with integers
    for (let i = 0; i < 10_000; i++) {
      const ts = new Date(start + i * 3_600_000).toISOString();
      const sats = BigInt(1 + Math.floor(rand() * 5_000_000)); // 0,00000001 … 0,05 BTC
      const qty = (Number(sats) / 1e8).toFixed(8);
      const price = (60_000 + rand() * 40_000).toFixed(2);
      const sellable = held >= sats && rand() < 0.45;
      if (sellable) held -= sats;
      else held += sats;
      txns.push({
        id: `t${i}`,
        type: sellable ? 'SELL' : 'BUY',
        ts,
        assetId: 'BTC',
        quantity: qty,
        price,
        fee: '0.5',
        fxRate: (30 + i / 1000).toFixed(4),
      });
    }

    const all = reconcileAutoRecords(txns, { autoDeposit: true });
    const t0 = performance.now();
    const ledger = buildLedger(all);
    const v = valuePortfolio(ledger, { BTC: { price: '98410.12', fx: '42.5' } });
    const elapsed = performance.now() - t0;

    const expectedQty = (Number(held) / 1e8).toFixed(8);
    expect(ledger.positions.get('BTC')!.quantity.toFixed(8)).toBe(expectedQty);
    expect(ledger.issues).toEqual([]);
    expect(ledger.cash.gte(0)).toBe(true);
    // Rounding over 10.000 decimal operations stays far below a trillionth of a lira.
    expect(identityGap(v).abs().lt('1e-12')).toBe(true);
    // A realistic portfolio size, for the report.
    const small = reconcileAutoRecords(txns.slice(0, 1000), { autoDeposit: true });
    const t1 = performance.now();
    valuePortfolio(buildLedger(small), { BTC: { price: '98410.12', fx: '42.5' } });
    console.log(
      `T12: ${small.length} transactions replayed and valued in ${(performance.now() - t1).toFixed(0)} ms`,
    );
    // Reported in the test report; generous bound so slower CI machines don't flake.
    console.log(`T12: ${all.length} transactions replayed and valued in ${elapsed.toFixed(0)} ms`);
    expect(elapsed).toBeLessThan(3000);
  });

  it('buying one satoshi 10.000 times and selling it all leaves exactly zero', () => {
    const txns: Transaction[] = Array.from({ length: 10_000 }, (_, i) => ({
      id: `b${i}`,
      type: 'BUY',
      ts: new Date(Date.parse('2024-01-01T00:00:00Z') + i * 1000).toISOString(),
      assetId: 'BTC',
      quantity: '0.00000001',
      price: '97000.37',
    }));
    txns.push({
      id: 's',
      type: 'SELL',
      ts: '2025-01-01T00:00:00Z',
      assetId: 'BTC',
      quantity: '0.0001',
      price: '99000',
    });
    const l = buildLedger(reconcileAutoRecords(txns, { autoDeposit: true }));
    expect(l.positions.get('BTC')!.quantity.toFixed()).toBe('0');
    expect(l.positions.get('BTC')!.cost.toFixed()).toBe('0');
    expect(l.realizedTotal.toFixed()).toBe('0.199963'); // 9,9 − 9,700037
  });
});

describe('decimal helpers', () => {
  it('parse, sum and format exactly', () => {
    expect(toStr(sum(['0.1', '0.2']))).toBe('0.3');
    expect(toStr(dec(undefined))).toBe('0');
    expect(toStr(dec(null))).toBe('0');
    expect(toStr(dec(''))).toBe('0');
    expect(toNum(dec('12.5'))).toBe(12.5);
    expect(toStr(dec('1e-8'))).toBe('0.00000001');
  });
});

describe('a realistic year — every invariant at once', () => {
  it('balances for both cost methods with deposits, trades, dividends, fees, splits and FX', () => {
    const txns = reconcileAutoRecords(
      [
        { id: 'd1', type: 'DEPOSIT', ts: '2025-01-12T07:00:00Z', amount: '400000' },
        {
          id: 'b1',
          type: 'BUY',
          ts: '2025-01-13T08:00:00Z',
          assetId: 'THYAO',
          quantity: '500',
          price: '270',
          fee: '270',
          fxRate: '1',
        },
        {
          id: 'b2',
          type: 'BUY',
          ts: '2025-01-13T15:00:00Z',
          assetId: 'AAPL',
          quantity: '20',
          price: '196.5',
          fee: '1',
          fxRate: '35.4',
        },
        {
          id: 'b3',
          type: 'BUY',
          ts: '2025-02-01T10:00:00Z',
          assetId: 'BTC',
          quantity: '0.05214',
          price: '61250.5',
          fee: '3.2',
          fxRate: '36.1',
        },
        {
          id: 'b4',
          type: 'BUY',
          ts: '2025-03-03T08:00:00Z',
          assetId: 'THYAO',
          quantity: '500',
          price: '304.2',
          fee: '304.2',
          fxRate: '1',
        },
        {
          id: 'sp',
          type: 'SPLIT',
          ts: '2025-06-14T21:00:00Z',
          assetId: 'THYAO',
          splitRatio: '1.5',
        },
        {
          id: 'v1',
          type: 'DIVIDEND',
          ts: '2025-07-01T08:00:00Z',
          assetId: 'THYAO',
          amount: '1950',
          tax: '292.5',
          fxRate: '1',
        },
        {
          id: 's1',
          type: 'SELL',
          ts: '2025-08-01T08:00:00Z',
          assetId: 'BTC',
          quantity: '0.01',
          price: '98100',
          fee: '2',
          fxRate: '41.2',
          withdrawProceeds: true,
        },
        { id: 'f1', type: 'FEE', ts: '2025-09-01T08:00:00Z', amount: '120' },
        {
          id: 's2',
          type: 'SELL',
          ts: '2025-10-01T08:00:00Z',
          assetId: 'THYAO',
          quantity: '250',
          price: '210',
          fee: '52.5',
          fxRate: '1',
        },
        {
          id: 'v2',
          type: 'DIVIDEND',
          ts: '2025-11-14T15:00:00Z',
          assetId: 'AAPL',
          amount: '5.2',
          tax: '0.78',
          fxRate: '42.1',
        },
        { id: 'w1', type: 'WITHDRAW', ts: '2025-12-01T08:00:00Z', amount: '20000' },
      ],
      { autoDeposit: true },
    );
    const quotes = {
      THYAO: { price: '212.3', fx: '1' },
      AAPL: { price: '241.3', fx: '42.5' },
      BTC: { price: '98410', fx: '42.5' },
    };
    const totals: string[] = [];
    for (const method of ['average', 'fifo'] as const) {
      const l = buildLedger(txns, { method });
      const v = valuePortfolio(l, quotes);
      expect(l.issues).toEqual([]);
      expect(l.cash.gte(0)).toBe(true); // invariant 4
      expect(identityGap(v).toFixed()).toBe('0'); // invariant 1
      expect(l.positions.get('THYAO')!.quantity.toFixed()).toBe('1250'); // (500 + 500) × 1,5 − 250
      totals.push(v.netPnl.toFixed());
    }
    expect(totals[0]).toBe(totals[1]); // invariant 2
  });
});

import { describe, expect, it } from '@jest/globals';

import { cpiOnDate, inflationBetween, realReturn } from '../inflation';
import { lttbIndices } from '../lttb';
import {
  addDays,
  buildDailySeries,
  convertSeries,
  daysBetween,
  type PriceHistory,
} from '../series';
import { splitTransactionFor, suggestMissingSplits } from '../splits';
import { periodReturns, twrBetween, unitize } from '../twr';
import type { Asset, Transaction } from '../types';
import { simulateWhatIf } from '../whatIf';

const ASSETS = new Map<string, Asset>([
  ['X', { id: 'X', symbol: 'XXX', market: 'BIST', currency: 'TRY' }],
  ['U', { id: 'U', symbol: 'UUU', market: 'US', currency: 'USD' }],
]);

/** 10:00 Istanbul on a given day. */
const at = (day: string) => `${day}T07:00:00Z`;
const T = (t: Partial<Transaction> & Pick<Transaction, 'id' | 'type' | 'ts'>): Transaction => t;

describe('daily value series (doc §7)', () => {
  it('values holdings at each day’s close plus cash, with flows and net invested', () => {
    const txns = [
      T({ id: 'd', type: 'DEPOSIT', ts: at('2026-01-05'), amount: '2000' }),
      T({ id: 'b', type: 'BUY', ts: at('2026-01-05'), assetId: 'X', quantity: '100', price: '10' }),
      T({ id: 'w', type: 'WITHDRAW', ts: at('2026-01-07'), amount: '500' }),
    ];
    const prices: PriceHistory = { X: { '2026-01-05': 10.5, '2026-01-06': 11, '2026-01-07': 12 } };
    const s = buildDailySeries(txns, ASSETS, prices, {}, { to: '2026-01-07' });
    expect(s).toEqual([
      { date: '2026-01-05', value: 2050, cash: 1000, netInvested: 2000, flow: 2000 },
      { date: '2026-01-06', value: 2100, cash: 1000, netInvested: 2000, flow: 0 },
      { date: '2026-01-07', value: 1700, cash: 500, netInvested: 1500, flow: -500 },
    ]);
  });

  it('T13 — carries the last close over weekends and holidays', () => {
    const txns = [
      T({ id: 'd', type: 'DEPOSIT', ts: at('2026-01-09'), amount: '1000' }),
      T({ id: 'b', type: 'BUY', ts: at('2026-01-09'), assetId: 'X', quantity: '100', price: '10' }),
    ];
    const prices: PriceHistory = { X: { '2026-01-09': 10, '2026-01-12': 11 } };
    const s = buildDailySeries(txns, ASSETS, prices, {}, { to: '2026-01-12' });
    expect(s.map((p) => p.value)).toEqual([1000, 1000, 1000, 1100]);
  });

  it('uses the trade price until the first close is known, and converts foreign assets', () => {
    const txns = [
      T({ id: 'd', type: 'DEPOSIT', ts: at('2026-01-05'), amount: '100000' }),
      T({
        id: 'b',
        type: 'BUY',
        ts: at('2026-01-05'),
        assetId: 'U',
        quantity: '10',
        price: '200',
        fxRate: '40',
      }),
    ];
    const s = buildDailySeries(
      txns,
      ASSETS,
      { U: { '2026-01-06': 210 } },
      { USD: { '2026-01-06': 41 } },
      {
        to: '2026-01-06',
      },
    );
    expect(s.map((p) => p.value)).toEqual([100000, 20000 + 10 * 210 * 41]);
  });

  it('T9 — a 100% bonus issue causes no jump when the source adjusts its history', () => {
    const txns = [
      T({ id: 'd', type: 'DEPOSIT', ts: at('2026-06-10'), amount: '5000' }),
      T({ id: 'b', type: 'BUY', ts: at('2026-06-10'), assetId: 'X', quantity: '100', price: '50' }),
      splitTransactionFor({ assetId: 'X', date: '2026-06-15', ratio: '2' }, 'sp'),
    ];
    // The source shows split-adjusted closes: pre-split days are halved.
    const prices: PriceHistory = {
      X: {
        '2026-06-10': 25,
        '2026-06-11': 25,
        '2026-06-12': 25,
        '2026-06-15': 25,
        '2026-06-16': 26,
      },
    };
    const providerSplits = [{ assetId: 'X', date: '2026-06-15', ratio: '2' }];
    const s = buildDailySeries(txns, ASSETS, prices, {}, { to: '2026-06-16', providerSplits });
    expect(s.map((p) => p.value)).toEqual([5000, 5000, 5000, 5000, 5000, 5000, 5200]);

    // Without the adjustment the pre-split days would look halved.
    const naive = buildDailySeries(txns, ASSETS, prices, {}, { to: '2026-06-16' });
    expect(naive[0].value).toBe(2500);
  });

  it('can start before the first transaction and returns nothing for no data', () => {
    expect(buildDailySeries([], ASSETS, {}, {})).toEqual([]);
    const s = buildDailySeries([], ASSETS, {}, {}, { from: '2026-01-01', to: '2026-01-02' });
    expect(s.map((p) => p.value)).toEqual([0, 0]);
    expect(buildDailySeries([], ASSETS, {}, {}, { from: '2026-01-02', to: '2026-01-01' })).toEqual(
      [],
    );
  });

  it('has calendar helpers', () => {
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
    expect(daysBetween('2025-12-30', '2026-01-02')).toEqual([
      '2025-12-30',
      '2025-12-31',
      '2026-01-01',
      '2026-01-02',
    ]);
  });
});

describe('T14 — reporting in USD (doc §3)', () => {
  it('converts values daily and each flow at its own day’s rate', () => {
    const points = [
      { date: '2026-01-01', value: 4000, cash: 0, netInvested: 4000, flow: 4000 },
      { date: '2026-01-02', value: 4100, cash: 0, netInvested: 4000, flow: 0 },
      { date: '2026-01-03', value: 8500, cash: 0, netInvested: 8250, flow: 4250 },
    ];
    const usd = convertSeries(points, { '2026-01-01': 40, '2026-01-03': 42.5 });
    expect(usd.map((p) => p.value)).toEqual([100, 102.5, 200]);
    // 100 + 100 USD, not 8250 / 42,5
    expect(usd[2].netInvested).toBe(200);
  });
});

describe('time-weighted return (doc §8)', () => {
  it('T2 — matches the documented example (3,125%)', () => {
    const u = unitize([
      { date: 'd0', value: 1000, flow: 1000 },
      { date: 'd1', value: 1600, flow: 500 },
      { date: 'd2', value: 1500, flow: 0 },
    ]);
    expect(u.map((x) => x.unitValue)).toEqual([1, 1.1, expect.closeTo(1.03125, 12)]);
    expect(twrBetween(u, 'd0', 'd2')).toBeCloseTo(0.03125, 12);
  });

  it('credits the first day’s move to the first deposit', () => {
    const u = unitize([
      { date: 'd0', value: 1010, flow: 1000 },
      { date: 'd1', value: 1111, flow: 0 },
    ]);
    expect(u[0].unitValue).toBeCloseTo(1.01, 12);
    expect(u[1].unitValue).toBeCloseTo(1.111, 12);
  });

  it('T10 — stays continuous after withdrawing everything and coming back later', () => {
    const u = unitize([
      { date: 'd0', value: 1000, flow: 1000 },
      { date: 'd1', value: 1100, flow: 0 },
      { date: 'd2', value: 0, flow: -1100 },
      { date: 'd3', value: 0, flow: 0 },
      { date: 'd4', value: 500, flow: 500 },
      { date: 'd5', value: 550, flow: 0 },
    ]);
    expect(u.map((x) => x.unitValue)).toEqual([
      1,
      1.1,
      expect.closeTo(1.1, 12),
      expect.closeTo(1.1, 12),
      expect.closeTo(1.1, 12),
      expect.closeTo(1.21, 12),
    ]);
    expect(u[3].units).toBe(0);
  });

  it('survives a total loss', () => {
    const u = unitize([
      { date: 'd0', value: 100, flow: 100 },
      { date: 'd1', value: 0, flow: 0 },
      { date: 'd2', value: 50, flow: 50 },
    ]);
    expect(u[1].units).toBe(0);
    expect(u[2].units).toBeGreaterThan(0);
  });

  it('builds the period table with null for periods longer than the history', () => {
    const days = daysBetween('2025-11-01', '2026-11-09');
    const u = unitize(
      days.map((date, i) => ({ date, value: 1000 * (1 + i / 1000), flow: i === 0 ? 1000 : 0 })),
    );
    const r = periodReturns(u, '2026-11-09');
    expect(r['1Y']).toBeCloseTo(
      u[u.length - 1].unitValue / u[days.indexOf('2025-11-09')].unitValue - 1,
      12,
    );
    expect(r.YB).toBeCloseTo(
      u[u.length - 1].unitValue / u[days.indexOf('2025-12-31')].unitValue - 1,
      12,
    );
    expect(r.Tümü).toBeCloseTo(u[u.length - 1].unitValue - 1, 12);
    expect(r['1A']).toBeCloseTo(
      u[u.length - 1].unitValue / u[days.indexOf('2026-10-09')].unitValue - 1,
      12,
    );

    const short = unitize(
      daysBetween('2026-09-01', '2026-11-09').map((date, i) => ({
        date,
        value: 100 + i,
        flow: i ? 0 : 100,
      })),
    );
    const rs = periodReturns(short, '2026-11-09');
    expect(rs['6A']).toBeNull();
    expect(rs['1Y']).toBeNull();
    expect(rs.YB).toBeCloseTo(short[short.length - 1].unitValue - 1, 12); // started this year
    expect(periodReturns([], '2026-11-09').Tümü).toBeNull();
    expect(twrBetween(short, '2020-01-01', '2026-11-09')).toBeNull();
  });

  it('clamps month-end dates when going back a month (31 Mar → 28 Feb)', () => {
    const days = daysBetween('2026-01-01', '2026-03-31');
    const u = unitize(days.map((date, i) => ({ date, value: 100 + i, flow: i ? 0 : 100 })));
    const r = periodReturns(u, '2026-03-31');
    expect(r['1A']).toBeCloseTo(
      u[u.length - 1].unitValue / u[days.indexOf('2026-02-28')].unitValue - 1,
      12,
    );
  });
});

describe('invariant 5 — a portfolio that is 100% one asset equals that benchmark', () => {
  it('has the same values as the what-if replay and the asset’s own TWR', () => {
    const days = daysBetween('2026-01-01', '2026-01-07');
    const closes = [10, 11, 9, 12.5, 12, 8, 11];
    const prices: PriceHistory = { X: Object.fromEntries(days.map((d, i) => [d, closes[i]])) };
    // Every deposit is fully invested at that day's close; the withdrawal sells exactly enough.
    const txns = [
      T({ id: 'd1', type: 'DEPOSIT', ts: at(days[0]), amount: '1000' }),
      T({ id: 'b1', type: 'BUY', ts: at(days[0]), assetId: 'X', quantity: '100', price: '10' }),
      T({ id: 'd2', type: 'DEPOSIT', ts: at(days[3]), amount: '500' }),
      T({ id: 'b2', type: 'BUY', ts: at(days[3]), assetId: 'X', quantity: '40', price: '12.5' }),
      T({ id: 's', type: 'SELL', ts: at(days[5]), assetId: 'X', quantity: '37.5', price: '8' }),
      T({ id: 'w', type: 'WITHDRAW', ts: at(days[5]), amount: '300' }),
    ];
    const series = buildDailySeries(txns, ASSETS, prices, {}, { to: days[6] });
    const whatIf = simulateWhatIf(closes, [
      { index: 0, amount: 1000 },
      { index: 3, amount: 500 },
      { index: 5, amount: -300 },
    ]);
    series.forEach((p, i) => expect(p.value).toBeCloseTo(whatIf.values[i], 9));
    const u = unitize(series);
    expect(twrBetween(u, days[0], days[6])).toBeCloseTo(closes[6] / closes[0] - 1, 12);
  });
});

describe('inflation (doc §11)', () => {
  const cpi = { '2026-01': 100, '2026-02': 103, '2026-03': 106.09 };

  it('interpolates geometrically inside a month', () => {
    expect(cpiOnDate(cpi, '2026-02-28')!.value).toBeCloseTo(103, 9);
    const mid = cpiOnDate(cpi, '2026-02-14')!;
    expect(mid.value).toBeCloseTo(100 * Math.pow(1.03, 0.5), 9);
    expect(mid.estimated).toBe(false);
  });

  it('extrapolates unpublished months with the last monthly rate and flags it', () => {
    const v = cpiOnDate(cpi, '2026-04-30')!;
    expect(v.value).toBeCloseTo(106.09 * 1.03, 6);
    expect(v.estimated).toBe(true);
  });

  it('computes inflation between days and the real return', () => {
    const inf = inflationBetween(cpi, '2026-01-31', '2026-03-31')!;
    expect(inf.value).toBeCloseTo(0.0609, 9);
    expect(realReturn(0.1, 0.0609)).toBeCloseTo(1.1 / 1.0609 - 1, 12);
    expect(cpiOnDate(cpi, '2025-12-15')).toBeNull();
    expect(cpiOnDate({ '2026-01': 100 }, '2026-01-15')).toBeNull();
    expect(inflationBetween(cpi, '2025-01-01', '2026-03-31')).toBeNull();
  });
});

describe('LTTB downsampling', () => {
  it('keeps the first and last point and the requested count', () => {
    const values = Array.from({ length: 1000 }, (_, i) => Math.sin(i / 50) * 100 + i);
    const idx = lttbIndices(values, 120);
    expect(idx.length).toBe(120);
    expect(idx[0]).toBe(0);
    expect(idx[idx.length - 1]).toBe(999);
    expect([...idx].sort((a, b) => a - b)).toEqual(idx);
  });

  it('keeps a lone spike', () => {
    const values = Array.from({ length: 500 }, () => 10);
    values[237] = 500;
    expect(lttbIndices(values, 50)).toContain(237);
  });

  it('returns everything for short series', () => {
    expect(lttbIndices([1, 2, 3], 10)).toEqual([0, 1, 2]);
    expect(lttbIndices([1, 2, 3, 4], 2)).toEqual([0, 1, 2, 3]);
  });
});

describe('missing split suggestions (doc §13.1)', () => {
  const txns = [
    T({ id: 'd', type: 'DEPOSIT', ts: at('2026-06-01'), amount: '5000' }),
    T({ id: 'b', type: 'BUY', ts: at('2026-06-01'), assetId: 'X', quantity: '100', price: '50' }),
  ];
  const event = { assetId: 'X', date: '2026-06-15', ratio: '2' };

  it('suggests a split that happened while the asset was held', () => {
    expect(suggestMissingSplits(txns, [event])).toEqual([event]);
  });

  it('does not suggest a split that is already recorded', () => {
    expect(suggestMissingSplits([...txns, splitTransactionFor(event, 'sp')], [event])).toEqual([]);
  });

  it('does not suggest a split from before the asset was bought', () => {
    expect(suggestMissingSplits(txns, [{ ...event, date: '2026-05-01' }])).toEqual([]);
  });

  it('creates the split at Istanbul midnight of the ex-date', () => {
    expect(splitTransactionFor(event, 'sp').ts).toBe('2026-06-14T21:00:00.000Z');
  });
});

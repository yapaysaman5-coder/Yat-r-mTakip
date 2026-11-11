import { describe, expect, it } from '@jest/globals';

import type { Transaction } from '@/domain';

import { migrate } from '../db/migrations';
import { openNodeDriver } from '../db/nodeDriver';
import { upsertAssets } from '../repo/assets';
import { insertPortfolio } from '../repo/portfolios';
import { upsertCloses } from '../repo/prices';
import { loadPortfolioData } from '../service/load';
import { saveTransaction } from '../service/transactions';
import { buildAnalysis, periodGain, periodReturn } from '../view/analysisView';
import { rebasePercent } from '@/ui/charts/scale';

import { homeChart } from '../view/chart';
import { buildPortfolioView } from '../view/portfolioView';

const NOW = new Date('2026-11-11T13:00:00Z');

/**
 * Bought below the day's close (an execution price, not the close): the first day already
 * has a gain. Since the beginning: +₺1.000 on ₺10.000 = %10 everywhere.
 * 03.11: +10.000, 100 × ₺90. Closes: 03.11 ₺100 · 07.11 ₺95 · 11.11 ₺100.
 */
async function view() {
  const db = openNodeDriver();
  await migrate(db);
  await insertPortfolio(db, {
    id: 'p',
    name: 'Ana',
    kind: 'user',
    sortOrder: 0,
    seriesDirtyFrom: null,
    createdAt: NOW.toISOString(),
  });
  await upsertAssets(
    db,
    [{ id: 'BIST:THYAO', symbol: 'THYAO', market: 'BIST', currency: 'TRY' }],
    NOW.toISOString(),
  );
  await upsertCloses(db, [
    ['BIST:THYAO', '2026-11-03', 100],
    ['BIST:THYAO', '2026-11-07', 95],
    ['BIST:THYAO', '2026-11-11', 100],
  ]);
  const records: Omit<Transaction, 'id'>[] = [
    { type: 'DEPOSIT', ts: '2026-11-03T07:00:00Z', amount: '10000' },
    {
      type: 'BUY',
      ts: '2026-11-03T08:00:00Z',
      assetId: 'BIST:THYAO',
      quantity: '100',
      price: '90',
    },
  ];
  for (const r of records) {
    expect((await saveTransaction(db, 'p', { id: '', ...r } as Transaction, { now: NOW })).ok).toBe(
      true,
    );
  }
  return buildPortfolioView((await loadPortfolioData(db, 'p', { now: NOW }))!);
}

describe('returns since the first record include the first day', () => {
  it('home chart: a range reaching before the first record shows the return since the start', async () => {
    const v = await view();
    expect(v.summary.netPnl).toBeCloseTo(1000, 6);
    for (const r of ['1A', '3A', '1Y', 'YB', 'Tümü'] as const) {
      expect(homeChart(v, r, NOW.getTime()).changeRatio).toBeCloseTo(0.1, 10);
    }
    // A range inside the history starts from that day's close: the last 8 days start on 04.11
    // (100, carried from 03.11) and end at 100, so the week is flat; the 07.11 dip is inside.
    const week = homeChart(v, '1H', NOW.getTime());
    expect(week.values.length).toBe(8);
    expect(week.changeRatio).toBeCloseTo(0, 10);
    expect(Math.min(...week.values)).toBeCloseTo(100 * 95 + 1000, 6);
  });

  it('Analiz: TWR, the period table and the first month include the first day', async () => {
    const v = await view();
    const a = buildAnalysis(v);
    expect(a.metrics!.twr).toBeCloseTo(0.1, 10);
    expect(v.periodReturns['Tümü']).toBeCloseTo(0.1, 10);
    expect(periodReturn(a.series[0], a.periodStart['Tümü'], a.periodInception['Tümü'])).toBeCloseTo(
      0.1,
      10,
    );
    expect(periodReturn(a.series[0], a.periodStart['1A'], a.periodInception['1A'])).toBeCloseTo(
      0.1,
      10,
    );
    expect(a.metrics!.months).toEqual([{ month: '2026-11', ratio: expect.any(Number) }]);
    expect(a.metrics!.months[0].ratio).toBeCloseTo(0.1, 10);
  });

  it('Ya Olsaydı in %: the portfolio line since the start includes the first day', async () => {
    const v = await view();
    const a = buildAnalysis(v);
    const me = rebasePercent(a.series[0].values, a.netInvested, 0, a.periodInception['Tümü']);
    expect(me.at(-1)).toBeCloseTo(0.1, 10);
  });

  it('short history: no yearly figures and no risk statistics yet', async () => {
    const m = buildAnalysis(await view()).metrics!;
    expect(m.days).toBe(9);
    expect(m.annualized).toBe(false);
    expect(m.twrAnnual).toBeNull();
    expect(m.xirr).toBeNull();
    // All the money came in on the first day: money-weighted = time-weighted = %10.
    expect(m.mwr).toBeCloseTo(0.1, 6);
    expect([m.volatility, m.sharpe, m.sortino, m.riskLevel, m.beta, m.alpha]).toEqual([
      null,
      null,
      null,
      null,
      null,
      null,
    ]);
  });

  it('short periods: today (from yesterday’s close) and the last week, money in removed', async () => {
    const v = await view();
    const a = buildAnalysis(v);
    const n = a.dates.length;
    expect(a.periodStart['1G']).toBe(n - 2);
    expect(a.periodStart['1H']).toBe(n - 8);
    // 10.11 is still at 95 (last close 07.11), 11.11 at 100: 100 × 5 = +₺500 today.
    const me = a.series[0];
    expect(periodGain(me.values, a.netInvested, a.periodStart['1G'], false)).toBeCloseTo(500, 6);
    expect(periodGain(me.values, a.netInvested, 0, true)).toBeCloseTo(1000, 6);
  });
});

import { describe, expect, it } from '@jest/globals';

import type { Transaction } from '@/domain';

import { migrate } from '../db/migrations';
import { openNodeDriver } from '../db/nodeDriver';
import { DEMO_PORTFOLIO_ID, seedDemo } from '../demo/seed';
import { upsertAssets } from '../repo/assets';
import { insertPortfolio } from '../repo/portfolios';
import { upsertCloses } from '../repo/prices';
import { loadPortfolioData } from '../service/load';
import { saveTransaction } from '../service/transactions';
import {
  buildCash,
  buildRealized,
  buildStatement,
  holdingText,
  monthRecords,
} from '../view/historyView';
import { buildPortfolioView } from '../view/portfolioView';

const NOW = new Date('2026-11-09T13:00:00Z');
const at = (day: string) => `${day}T09:00:00Z`;

/**
 * Hand-checked portfolio (all TRY, no commissions):
 * - 01.09 +10.000; 02.09 buy 50 THYAO @100
 * - closes: 02.09 100 · 30.09 110 · 15.10 120 · 31.10 120 · 09.11 130
 * - 15.10 sell 20 @120 (+400); 20.10 dividend 300, tax 45 (+255)
 * - 03.11 withdraw 1.000; 04.11 account fee 50; 05.11 sell 10 @90 (−100)
 */
async function handView() {
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
    ['BIST:THYAO', '2026-09-02', 100],
    ['BIST:THYAO', '2026-09-30', 110],
    ['BIST:THYAO', '2026-10-15', 120],
    ['BIST:THYAO', '2026-10-31', 120],
    ['BIST:THYAO', '2026-11-09', 130],
  ]);
  const records: Omit<Transaction, 'id'>[] = [
    { type: 'DEPOSIT', ts: at('2026-09-01'), amount: '10000' },
    { type: 'BUY', ts: at('2026-09-02'), assetId: 'BIST:THYAO', quantity: '50', price: '100' },
    { type: 'SELL', ts: at('2026-10-15'), assetId: 'BIST:THYAO', quantity: '20', price: '120' },
    { type: 'DIVIDEND', ts: at('2026-10-20'), assetId: 'BIST:THYAO', amount: '300', tax: '45' },
    { type: 'WITHDRAW', ts: at('2026-11-03'), amount: '1000' },
    { type: 'FEE', ts: at('2026-11-04'), amount: '50' },
    { type: 'SELL', ts: at('2026-11-05'), assetId: 'BIST:THYAO', quantity: '10', price: '90' },
  ];
  for (const r of records) {
    const result = await saveTransaction(db, 'p', { id: '', ...r } as Transaction, { now: NOW });
    expect(result.ok).toBe(true);
  }
  return buildPortfolioView((await loadPortfolioData(db, 'p', { now: NOW }))!);
}

describe('realized profit and loss', () => {
  it('lists closed sales with cost, proceeds, holding period and the win rate', async () => {
    const r = buildRealized(await handView());
    expect(r.items.map((i) => [i.item.quantity, i.pnlTRY, i.costTRY, i.proceedsTRY])).toEqual([
      [10, -100, 1000, 900],
      [20, 400, 2000, 2400],
    ]);
    expect(r.items[1].ratio).toBeCloseTo(0.2, 10);
    expect(r.items[1].holdingDays).toBeCloseTo(43, 0);
    expect(r.total).toMatchObject({ pnl: 300, count: 2, wins: 1, losses: 1, winRate: 0.5 });
    expect(r.years).toEqual([expect.objectContaining({ year: '2026', pnl: 300 })]);
  });

  it('writes holding periods in words', () => {
    expect(holdingText(0.2)).toBe('aynı gün');
    expect(holdingText(12)).toBe('12 gün');
    expect(holdingText(92)).toBe('3 ay');
    expect(holdingText(400)).toBe('1 yıl 1 ay');
    expect(holdingText(730)).toBe('2 yıl');
  });
});

describe('cash movements', () => {
  it('adds up deposits, withdrawals, dividends (net and tax), fees and commissions', async () => {
    const c = buildCash(await handView());
    expect(c.total).toEqual({
      deposited: 10000,
      depositedAuto: 0,
      withdrawn: 1000,
      dividends: 255,
      dividendTax: 45,
      commissions: 0,
      accountFees: 50,
    });
    expect(c.items.map((i) => i.type)).toEqual(['FEE', 'WITHDRAW', 'DIVIDEND', 'DEPOSIT']);
    expect(c.netInvested.values.at(-1)).toBe(9000);
  });
});

describe('monthly statement', () => {
  it('gives open, money in and out, market result and close for each month', async () => {
    const s = buildStatement(await handView());
    expect(s.map((m) => m.month)).toEqual(['2026-11', '2026-10', '2026-09']);
    const [nov, oct, sep] = s;
    expect(sep).toMatchObject({ open: 0, inflow: 10000, outflow: 0, close: 10500, market: 500 });
    expect(sep.return).toBeCloseTo(0.05, 10);
    // October: the sale at 120 and the 255 dividend; 30 units at 120 + 7.655 cash.
    expect(oct).toMatchObject({ open: 10500, close: 11255, market: 755, dividends: 255 });
    expect(oct.realized).toBe(400);
    expect(oct.return).toBeCloseTo(11255 / 10500 - 1, 10);
    // November (running): withdrawal, fee and a sale at 90; 20 units at 130 + 7.505 cash.
    expect(nov).toMatchObject({
      open: 11255,
      outflow: 1000,
      accountFees: 50,
      close: 10105,
      market: -150,
      realized: -100,
      partial: true,
    });
    expect(nov.firstDay).toBe('2026-11-01');
    expect(monthRecords(await handView(), '2026-11').map((h) => h.type)).toEqual([
      'SELL',
      'FEE',
      'WITHDRAW',
    ]);
  });

  it('chains months and adds up to the whole history (example portfolio)', async () => {
    const db = openNodeDriver();
    await migrate(db);
    await seedDemo(db, { now: NOW });
    const view = buildPortfolioView(
      (await loadPortfolioData(db, DEMO_PORTFOLIO_ID, { now: NOW }))!,
    );
    const s = buildStatement(view);
    expect(s.length).toBeGreaterThan(12);
    for (let k = 0; k + 1 < s.length; k++) expect(s[k].open).toBeCloseTo(s[k + 1].close, 6);
    for (const m of s) {
      expect(m.close).toBeCloseTo(m.open + m.inflow - m.outflow + m.market, 6);
    }
    // Money in − out over all months is the net invested; the months' market results add up
    // to the net P/L.
    const flows = s.reduce((a, m) => a + m.inflow - m.outflow, 0);
    expect(flows).toBeCloseTo(view.summary.netInvested, 4);
    const market = s.reduce((a, m) => a + m.market, 0);
    expect(market).toBeCloseTo(view.summary.netPnl, 4);
    // Compounding the monthly returns gives the time-weighted return of the whole history.
    const twr = s.reduce((a, m) => a * (1 + (m.return ?? 0)), 1) - 1;
    const units = view.series.unitValues;
    expect(twr).toBeCloseTo(units[units.length - 1] - 1, 8);

    const r = buildRealized(view);
    expect(r.total.pnl).toBeCloseTo(view.summary.realized, 4);
    const c = buildCash(view);
    expect(c.total.deposited).toBeCloseTo(view.summary.deposited, 4);
    expect(c.total.withdrawn).toBeCloseTo(view.summary.withdrawn, 4);
    expect(c.total.dividends).toBeCloseTo(view.summary.dividends, 4);
    expect(c.total.commissions).toBeCloseTo(view.summary.commissions, 4);
    expect(c.total.accountFees).toBeCloseTo(view.summary.accountFees, 4);
  });
});

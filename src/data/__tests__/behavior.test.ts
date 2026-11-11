import { describe, expect, it } from '@jest/globals';

import type { Transaction } from '@/domain';

import { migrate } from '../db/migrations';
import { openNodeDriver } from '../db/nodeDriver';
import { DEMO_PORTFOLIO_ID, seedDemo } from '../demo/seed';
import { upsertAssets } from '../repo/assets';
import { insertPortfolio } from '../repo/portfolios';
import { upsertCloses } from '../repo/prices';
import { loadAssetHistory, tryReturns } from '../service/assetHistory';
import { loadPortfolioData } from '../service/load';
import { saveTransaction } from '../service/transactions';
import { buildAnalysis } from '../view/analysisView';
import { activity, afterSales, behaviorGap, disposition } from '../view/behaviorView';
import { buildPortfolioView } from '../view/portfolioView';

const NOW = new Date('2026-06-15T12:00:00Z');
const at = (day: string) => `${day}T09:00:00Z`;

/**
 * Two stocks bought at ₺100 on 05.01.
 * 02.02: A 120, B 80 → sell 50 A at 120 (a realized gain; B is a paper loss).
 * 02.03: A 130, B 70 → sell all B at 70 (a realized loss; A is a paper gain).
 * 01.05: A 150, B 90.
 */
async function setup() {
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
    [
      { id: 'BIST:AAA', symbol: 'AAA', market: 'BIST', currency: 'TRY' },
      { id: 'BIST:BBB', symbol: 'BBB', market: 'BIST', currency: 'TRY' },
    ],
    NOW.toISOString(),
  );
  await upsertCloses(db, [
    ['BIST:AAA', '2026-01-05', 100],
    ['BIST:BBB', '2026-01-05', 100],
    ['BIST:AAA', '2026-02-02', 120],
    ['BIST:BBB', '2026-02-02', 80],
    ['BIST:AAA', '2026-03-02', 130],
    ['BIST:BBB', '2026-03-02', 70],
    ['BIST:AAA', '2026-05-01', 150],
    ['BIST:BBB', '2026-05-01', 90],
  ]);
  const records: Omit<Transaction, 'id'>[] = [
    { type: 'DEPOSIT', ts: at('2026-01-05'), amount: '20000' },
    { type: 'BUY', ts: at('2026-01-05'), assetId: 'BIST:AAA', quantity: '100', price: '100' },
    { type: 'BUY', ts: at('2026-01-05'), assetId: 'BIST:BBB', quantity: '100', price: '100' },
    { type: 'SELL', ts: at('2026-02-02'), assetId: 'BIST:AAA', quantity: '50', price: '120' },
    { type: 'SELL', ts: at('2026-03-02'), assetId: 'BIST:BBB', quantity: '100', price: '70' },
  ];
  for (const r of records) {
    expect((await saveTransaction(db, 'p', { id: '', ...r } as Transaction, { now: NOW })).ok).toBe(
      true,
    );
  }
  const view = buildPortfolioView((await loadPortfolioData(db, 'p', { now: NOW }))!);
  return { view, history: await loadAssetHistory(db, view) };
}

describe('asset history', () => {
  it('lays every asset on one calendar, carrying closes, with TRY returns', async () => {
    const { history } = await setup();
    expect(history.dates[0]).toBe('2026-01-05');
    expect(history.dates.at(-1)).toBe('2026-06-15');
    const a = history.assets.get('BIST:AAA')!;
    const i = history.dates.indexOf('2026-02-10');
    expect(a.local[i]).toBe(120); // carried from 02.02
    const r = tryReturns(a);
    expect(r[history.dates.indexOf('2026-02-02')]).toBeCloseTo(0.2, 12);
    expect(r[history.dates.indexOf('2026-02-03')]).toBe(0);
  });
});

describe('disposition effect (Odean 1998)', () => {
  it('counts realized and paper gains and losses on sale days', async () => {
    const { view, history } = await setup();
    const d = disposition(view, history);
    expect(d).toMatchObject({
      saleDays: 2,
      realizedGains: 1,
      paperLosses: 1,
      realizedLosses: 1,
      paperGains: 1,
      pgr: 0.5,
      plr: 0.5,
      difference: 0,
      enough: false,
    });
  });
});

describe('after a sale', () => {
  it('follows the sold assets and what they would be worth today', async () => {
    const { view, history } = await setup();
    const s = afterSales(view, history);
    expect(s.sales).toHaveLength(2);
    const [b, a] = s.sales; // newest first
    expect(a.item.symbol).toBe('AAA');
    expect(a.after[30]).toBeCloseTo(130 / 120 - 1, 12); // 04.03: 130
    expect(a.after[91]).toBeCloseTo(150 / 120 - 1, 12); // 04.05: 150
    expect(a.after[365]).toBeNull();
    expect(a.valueToday).toBeCloseTo(50 * 150, 6);
    expect(a.proceeds).toBeCloseTo(6000, 6);
    expect(b.after[30]).toBeCloseTo(0, 12); // 01.04: still 70
    expect(b.after[91]).toBeCloseTo(90 / 70 - 1, 12); // 01.06: 90
    expect(s.heldDifference).toBeCloseTo(1500 + 2000, 6);
    expect(s.measured3m).toBe(2);
    expect(s.avg3m).toBeCloseTo((0.25 + 90 / 70 - 1) / 2, 12);
  });
});

describe('behaviour gap and activity', () => {
  it('compares money- and time-weighted returns and measures turnover and costs', async () => {
    const { view } = await setup();
    const m = buildAnalysis(view).metrics!;
    const g = behaviorGap(m);
    expect(g.yearly).toBe(false);
    expect(g.gap).toBeCloseTo(m.mwr! - m.twr, 12);
    const act = activity(view);
    expect(act.trades).toBe(4);
    expect(act.turnover).toBeCloseTo(13000 / act.averageValue / act.years, 10);
    expect(act.level).toBe('yüksek');
    expect(act.costRatio).toBe(0);
  });

  it('runs on the example portfolio', async () => {
    const db = openNodeDriver();
    await migrate(db);
    await seedDemo(db, { now: new Date('2026-11-09T12:00:00Z') });
    const view = buildPortfolioView(
      (await loadPortfolioData(db, DEMO_PORTFOLIO_ID, { now: new Date('2026-11-09T12:00:00Z') }))!,
    );
    const history = await loadAssetHistory(db, view);
    const d = disposition(view, history);
    expect(d.saleDays).toBeGreaterThan(0);
    const act = activity(view);
    expect(act.costRatio!).toBeGreaterThan(0);
    expect(act.cost20y!).toBeGreaterThan(act.costRatio!);
    expect(behaviorGap(buildAnalysis(view).metrics).yearly).toBe(true);
  });
});

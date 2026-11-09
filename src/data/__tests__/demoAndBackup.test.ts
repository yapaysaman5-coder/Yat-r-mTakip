import { describe, expect, it } from '@jest/globals';

import { buildLedger, identityGap, valuePortfolio } from '@/domain';

import { migrate } from '../db/migrations';
import { openNodeDriver } from '../db/nodeDriver';
import { DEMO_PORTFOLIO_ID, removeDemo, seedDemo } from '../demo/seed';
import { countCloses } from '../repo/prices';
import { insertPortfolio, listPortfolios } from '../repo/portfolios';
import { countTransactions } from '../repo/transactions';
import { exportBackup, importBackup, parseBackup, type BackupFile } from '../service/backup';
import { loadPortfolioData } from '../service/load';
import { saveTransaction } from '../service/transactions';
import { buildAnalysis } from '../view/analysisView';
import { homeChart } from '../view/chart';
import { buildPortfolioView } from '../view/portfolioView';

const NOW = new Date('2026-11-09T13:00:00Z'); // 16:00 Istanbul

async function openDb() {
  const db = openNodeDriver();
  await migrate(db);
  return db;
}

async function viewOf(db: Awaited<ReturnType<typeof openDb>>, id: string, now = NOW) {
  const data = await loadPortfolioData(db, id, { now });
  return buildPortfolioView(data!);
}

describe('example portfolio in the database', () => {
  it('runs cleanly through the engine and ends today', async () => {
    const db = await openDb();
    const p = await seedDemo(db, { now: NOW });
    expect(p.demoEnd).toBe('2026-11-09');
    const view = await viewOf(db, DEMO_PORTFOLIO_ID);
    const ledger = buildLedger(view.data.txns);
    expect(ledger.issues).toEqual([]);
    expect(ledger.cash.gte(0)).toBe(true);
    const valuation = valuePortfolio(ledger, view.data.quotes, {
      foreignCurrency: (a) => view.data.assets.get(a)?.currency !== 'TRY',
    });
    expect(identityGap(valuation).abs().lt('1e-20')).toBe(true);

    expect(view.series.dates).toHaveLength(666);
    expect(view.series.dates.at(-1)).toBe('2026-11-09');
    expect(view.series.values.at(-1)).toBeCloseTo(view.summary.totalValue, 6);
    expect(Object.fromEntries(view.holdings.map((h) => [h.symbol, h.quantity]))).toEqual({
      THYAO: 1000,
      ASELS: 1500,
      TUPRS: 750,
      AAPL: 20,
      NVDA: 30,
      BTC: 0.042,
      ETH: 0.35,
    });
    expect(view.holdings.every((h) => !h.stale && h.spark.length === 7)).toBe(true);
    // Today's purchase happened before "now", and today's change is real.
    expect(view.history[0].type).toBe('BUY');
    expect(view.history[0].ts <= NOW.toISOString()).toBe(true);
    expect(view.summary.dailyChange).not.toBe(0);
    expect(view.riskLevel).toBeGreaterThan(0);

    const analysis = buildAnalysis(view);
    expect(analysis.series.map((s) => s.key)).toEqual([
      'me',
      'gold',
      'btc',
      'deposit',
      'cpi',
      'ndx',
      'spx',
      'xu030',
      'xu100',
      'silver',
      'eur',
      'rut',
      'usd',
    ]);
    const m = analysis.metrics!;
    expect(m.alpha).not.toBeNull();
    expect(m.xirr).not.toBeNull();
    // The generated benchmarks end where they were tilted to (± replay rounding).
    const gold = analysis.series.find((s) => s.key === 'gold')!;
    expect(gold.values.at(-1)! / view.summary.netInvested).toBeCloseTo(1.3203, 3);

    console.log(
      JSON.stringify({
        total: view.summary.totalValue.toFixed(2),
        today: view.summary.dailyChange.toFixed(2),
        twr: m.twr.toFixed(4),
        xirr: m.xirr?.toFixed(4),
        alpha: m.alpha?.toFixed(4),
        beta: m.beta?.toFixed(2),
        risk: m.riskLevel,
      }),
    );
  });

  it('can be recreated and removed', async () => {
    const db = await openDb();
    await seedDemo(db, { now: NOW });
    await seedDemo(db, { now: new Date('2026-11-12T08:00:00Z') });
    const list = await listPortfolios(db);
    expect(list).toHaveLength(1);
    expect(list[0].demoEnd).toBe('2026-11-12');
    // Early in the morning today's purchase is clamped to "a little while ago".
    const view = await viewOf(db, DEMO_PORTFOLIO_ID, new Date('2026-11-12T08:00:00Z'));
    expect(view.history[0].ts <= '2026-11-12T08:00:00.000Z').toBe(true);
    await removeDemo(db);
    expect(await listPortfolios(db)).toEqual([]);
    expect(await countCloses(db)).toBe(0);
    expect(await db.first<{ n: number }>('SELECT COUNT(*) AS n FROM asset')).toEqual({ n: 0 });
  });

  it('a later day carries the last prices: no change "today", same value', async () => {
    const db = await openDb();
    await seedDemo(db, { now: NOW });
    const first = await viewOf(db, DEMO_PORTFOLIO_ID);
    const later = await viewOf(db, DEMO_PORTFOLIO_ID, new Date('2026-11-15T10:00:00Z'));
    expect(later.summary.totalValue).toBeCloseTo(first.summary.totalValue, 6);
    expect(later.summary.dailyChange).toBe(0);
    expect(later.series.dates.at(-1)).toBe('2026-11-15');
  });
});

describe('user portfolios', () => {
  it('an empty portfolio shows zeros, no chart and no metrics', async () => {
    const db = await openDb();
    await insertPortfolio(db, {
      id: 'main',
      name: 'Ana Portföy',
      kind: 'user',
      sortOrder: 0,
      seriesDirtyFrom: null,
      createdAt: NOW.toISOString(),
    });
    const view = await viewOf(db, 'main');
    expect(view.empty).toBe(true);
    expect(view.summary.totalValue).toBe(0);
    expect(view.summary.netPnlRatio).toBeNull();
    expect(view.summary.dailyChangeRatio).toBeNull();
    expect(view.riskLevel).toBeNull();
    expect(homeChart(view, '1A')).toEqual({
      values: [],
      labels: [],
      netInvested: [],
      changeRatio: null,
    });
    expect(homeChart(view, '1G').values).toEqual([0, 0]);
    const a = buildAnalysis(view);
    expect(a.metrics).toBeNull();
    expect(a.series.map((s) => s.key)).toEqual(['me']);
    expect(await loadPortfolioData(db, 'nope')).toBeNull();
  });

  it('cash only: deposits and withdrawals show in the budget and the history', async () => {
    const db = await openDb();
    await insertPortfolio(db, {
      id: 'main',
      name: 'Ana Portföy',
      kind: 'user',
      sortOrder: 0,
      seriesDirtyFrom: null,
      createdAt: NOW.toISOString(),
    });
    const save = (type: 'DEPOSIT' | 'WITHDRAW', ts: string, amount: string) =>
      saveTransaction(db, 'main', { id: '', type, ts, amount }, { now: NOW });
    await save('DEPOSIT', '2026-10-01T07:00:00Z', '25000');
    await save('WITHDRAW', '2026-10-20T07:00:00Z', '5000');
    await save('DEPOSIT', '2026-11-09T07:00:00Z', '1000');
    const view = await viewOf(db, 'main');
    expect(view.summary).toMatchObject({
      totalValue: 21000,
      cash: 21000,
      deposited: 26000,
      withdrawn: 5000,
      netInvested: 21000,
      netPnl: 0,
      dailyChange: 0,
    });
    expect(view.history.map((h) => [h.type, h.amountTRY])).toEqual([
      ['DEPOSIT', 1000],
      ['WITHDRAW', -5000],
      ['DEPOSIT', 25000],
    ]);
    expect(view.series.values.at(-1)).toBe(21000);
    expect(view.periodReturns['Tümü']).toBeCloseTo(0, 12);
    expect(homeChart(view, 'Tümü').changeRatio).toBeCloseTo(0, 12);
    expect(homeChart(view, '1G').values).toEqual([21000, 21000]);
  });
});

describe('backup', () => {
  async function filled() {
    const db = await openDb();
    await seedDemo(db, { now: NOW });
    await insertPortfolio(db, {
      id: 'main',
      name: 'Ana Portföy',
      kind: 'user',
      sortOrder: 0,
      seriesDirtyFrom: null,
      createdAt: NOW.toISOString(),
    });
    await saveTransaction(
      db,
      'main',
      { id: '', type: 'DEPOSIT', ts: '2026-10-01T07:00:00Z', amount: '1234.56', note: 'maaş' },
      { now: NOW },
    );
    // An edit in the example portfolio must survive the round trip too.
    await saveTransaction(
      db,
      DEMO_PORTFOLIO_ID,
      { id: '', type: 'WITHDRAW', ts: '2026-11-02T07:00:00Z', amount: '1000' },
      { now: NOW },
    );
    return db;
  }

  it('restoring a backup gives exactly the same figures', async () => {
    const a = await filled();
    const file = await exportBackup(a, { now: NOW, settings: { themePreference: 'gece' } });
    const text = JSON.stringify(file);
    const parsed = parseBackup(text);
    expect(parsed.ok && parsed.summary).toEqual({
      portfolios: 2,
      transactions: 29,
      assets: 7,
      exportedAt: NOW.toISOString(),
    });

    const b = await openDb();
    await seedDemo(b, { now: new Date('2026-01-01T10:00:00Z') }); // replaced by the import
    if (parsed.ok) await importBackup(b, parsed.backup, { now: NOW });
    for (const id of ['main', DEMO_PORTFOLIO_ID]) {
      const [va, vb] = [await viewOf(a, id), await viewOf(b, id)];
      expect(vb.summary).toEqual(va.summary);
      expect(vb.holdings).toEqual(va.holdings);
      expect(vb.history).toEqual(va.history);
      expect(vb.series).toEqual(va.series);
      expect(buildAnalysis(vb).metrics).toEqual(buildAnalysis(va).metrics);
    }
    expect(await exportBackup(b, { now: NOW, settings: { themePreference: 'gece' } })).toEqual(
      file,
    );
  });

  it('rejects files that are not a usable backup, changing nothing', async () => {
    const db = await filled();
    const file = await exportBackup(db, { now: NOW });
    const variant = (patch: (f: BackupFile) => unknown) => {
      const copy = JSON.parse(JSON.stringify(file));
      patch(copy);
      return parseBackup(JSON.stringify(copy));
    };
    expect(parseBackup('{oops')).toEqual({ ok: false, error: 'NOT_JSON' });
    expect(parseBackup('{"format":"x"}')).toEqual({ ok: false, error: 'NOT_A_BACKUP' });
    expect(variant((f) => (f.schemaVersion = 99))).toEqual({ ok: false, error: 'NEWER_VERSION' });
    expect(variant((f) => delete (f as Partial<BackupFile>).assets)).toEqual({
      ok: false,
      error: 'MALFORMED',
    });
    expect(variant((f) => (f.portfolios[0].kind = 'x' as never))).toMatchObject({
      error: 'MALFORMED',
    });
    expect(variant((f) => (f.portfolios[1] = f.portfolios[0]))).toMatchObject({
      error: 'MALFORMED',
    });
    expect(
      variant((f) => delete f.portfolios.find((p) => p.kind === 'demo')!.demoEnd),
    ).toMatchObject({ error: 'MALFORMED' });
    expect(variant((f) => (f.assets[0].currency = 'GBP' as never))).toMatchObject({
      error: 'MALFORMED',
    });
    expect(variant((f) => (f.transactions[0].portfolioId = 'nope'))).toMatchObject({
      error: 'MALFORMED',
    });
    expect(variant((f) => (f.transactions[1].id = f.transactions[0].id))).toMatchObject({
      error: 'MALFORMED',
    });
    expect(variant((f) => (f.transactions[0].isAuto = true))).toMatchObject({ error: 'MALFORMED' });
    expect(variant((f) => ((f.transactions[0] as { amount: unknown }).amount = 5))).toMatchObject({
      error: 'MALFORMED',
    });
    expect(variant((f) => (f.transactions[0].amount = 'abc'))).toMatchObject({
      error: 'INVALID_RECORDS',
    });
    // Selling more than held is refused as a whole file.
    const sell = file.transactions.findIndex((t) => t.type === 'SELL');
    expect(variant((f) => (f.transactions[sell].quantity = '999999'))).toMatchObject({
      error: 'INCONSISTENT',
    });
    expect(await countTransactions(db)).toBe(29);
  });
});

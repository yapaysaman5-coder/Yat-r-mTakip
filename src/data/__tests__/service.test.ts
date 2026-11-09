import { describe, expect, it } from '@jest/globals';

import { buildDailySeries, daysBetween, reconcileAutoRecords, type Transaction } from '@/domain';

import { migrate } from '../db/migrations';
import { openNodeDriver } from '../db/nodeDriver';
import { DEFAULT_ENGINE } from '../engine';
import { upsertAssets } from '../repo/assets';
import { getPortfolio, insertPortfolio } from '../repo/portfolios';
import { upsertCloses } from '../repo/prices';
import { loadSnapshots } from '../repo/snapshots';
import { listTransactions } from '../repo/transactions';
import { refreshSeries } from '../service/series';
import {
  deleteTransaction,
  deleteTransactions,
  restoreTransactions,
  saveTransaction,
} from '../service/transactions';

const NOW = new Date('2026-03-01T12:00:00Z');
/** 10:00 Istanbul. */
const at = (day: string) => `${day}T07:00:00.000Z`;

async function setup() {
  const db = openNodeDriver();
  await migrate(db);
  const stamp = NOW.toISOString();
  for (const id of ['p1', 'p2']) {
    await insertPortfolio(db, {
      id,
      name: id,
      kind: 'user',
      sortOrder: 0,
      seriesDirtyFrom: null,
      createdAt: stamp,
    });
  }
  await upsertAssets(
    db,
    [
      { id: 'BIST:THYAO', symbol: 'THYAO', market: 'BIST', currency: 'TRY' },
      { id: 'US:AAPL', symbol: 'AAPL', market: 'US', currency: 'USD' },
      { id: 'FX:USDTRY', symbol: 'USDTRY', market: 'FX', currency: 'TRY' },
    ],
    stamp,
  );
  const days = daysBetween('2026-01-01', '2026-03-01');
  await upsertCloses(db, [
    ...days.map((d, i) => ['BIST:THYAO', d, 300 + i] as const),
    ...days.filter((_, i) => i % 7 < 5).map((d, i) => ['US:AAPL', d, 200 + (i % 9)] as const),
    ...days.map((d, i) => ['FX:USDTRY', d, 36 + i / 100] as const),
  ]);
  const opts = { now: NOW };
  const save = (t: Partial<Transaction> & Pick<Transaction, 'type' | 'ts'>, p = 'p1') =>
    saveTransaction(db, p, { id: '', ...t }, opts);
  return { db, save, opts };
}

describe('saving records', () => {
  it('adds, edits and lists records; ids are generated', async () => {
    const { db, save } = await setup();
    const r = await save({ type: 'DEPOSIT', ts: at('2026-01-05'), amount: '10000' });
    expect(r.ok).toBe(true);
    const id = r.ok ? r.txn.id : '';
    expect(id).toMatch(/^t/);
    const edit = await saveTransaction(
      db,
      'p1',
      { id, type: 'DEPOSIT', ts: at('2026-01-05'), amount: '12000', note: '' },
      { now: NOW },
    );
    expect(edit.ok).toBe(true);
    expect(await listTransactions(db, 'p1')).toEqual([
      { id, type: 'DEPOSIT', ts: at('2026-01-05'), amount: '12000' },
    ]);
    expect((await getPortfolio(db, 'p1'))?.seriesDirtyFrom).toBe('2026-01-05');
  });

  it('refuses invalid fields, future dates and unknown assets', async () => {
    const { save } = await setup();
    const bad = await save({ type: 'DEPOSIT', ts: at('2026-01-05'), amount: '-5' });
    expect(bad).toEqual({
      ok: false,
      rejection: { code: 'INVALID', issues: [{ field: 'amount', code: 'MUST_BE_POSITIVE' }] },
    });
    const future = await save({ type: 'DEPOSIT', ts: at('2026-04-01'), amount: '5' });
    expect(!future.ok && future.rejection.code).toBe('INVALID');
    const unknown = await save({
      type: 'BUY',
      ts: at('2026-01-05'),
      assetId: 'BIST:NOPE',
      quantity: '1',
      price: '1',
    });
    expect(!unknown.ok && unknown.rejection).toEqual({
      code: 'INVALID',
      issues: [{ field: 'assetId', code: 'UNKNOWN_ASSET' }],
    });
  });

  it('T7 — refuses a sale larger than the units held at that moment', async () => {
    const { save } = await setup();
    await save({
      type: 'BUY',
      ts: at('2026-01-05'),
      assetId: 'BIST:THYAO',
      quantity: '10',
      price: '300',
    });
    const r = await save({
      type: 'SELL',
      ts: at('2026-01-04'),
      assetId: 'BIST:THYAO',
      quantity: '5',
      price: '300',
    });
    expect(!r.ok && r.rejection.code).toBe('OVERSELL');
    const ok = await save({
      type: 'SELL',
      ts: at('2026-01-06'),
      assetId: 'BIST:THYAO',
      quantity: '10',
      price: '305',
    });
    expect(ok.ok).toBe(true);
  });

  it('T8 — refuses deleting or shrinking a purchase a later sale depends on, naming the sale', async () => {
    const { db, save, opts } = await setup();
    const buy = await save({
      type: 'BUY',
      ts: at('2026-01-05'),
      assetId: 'BIST:THYAO',
      quantity: '10',
      price: '300',
    });
    const sell = await save({
      type: 'SELL',
      ts: at('2026-02-05'),
      assetId: 'BIST:THYAO',
      quantity: '8',
      price: '320',
    });
    const buyId = buy.ok ? buy.txn.id : '';
    const sellId = sell.ok ? sell.txn.id : '';
    const del = await deleteTransaction(db, 'p1', buyId, opts);
    expect(del).toEqual({
      ok: false,
      rejection: {
        code: 'OVERSELL',
        issues: [{ code: 'OVERSELL', txnId: sellId, available: '0', requested: '8' }],
      },
    });
    const shrink = await saveTransaction(
      db,
      'p1',
      { ...(buy.ok ? buy.txn : ({} as Transaction)), quantity: '5' },
      opts,
    );
    expect(!shrink.ok && shrink.rejection.code).toBe('OVERSELL');
    expect(await listTransactions(db, 'p1')).toHaveLength(2); // nothing changed
  });

  it('refuses a withdrawal larger than the cash, now or after an older change', async () => {
    const { db, save, opts } = await setup();
    const dep = await save({ type: 'DEPOSIT', ts: at('2026-01-05'), amount: '1000' });
    const tooMuch = await save({ type: 'WITHDRAW', ts: at('2026-01-06'), amount: '1500' });
    expect(!tooMuch.ok && tooMuch.rejection.code).toBe('NEGATIVE_CASH');
    expect((await save({ type: 'WITHDRAW', ts: at('2026-01-06'), amount: '1000' })).ok).toBe(true);
    const delDeposit = await deleteTransaction(db, 'p1', dep.ok ? dep.txn.id : '', opts);
    expect(!delDeposit.ok && delDeposit.rejection.code).toBe('NEGATIVE_CASH');
  });

  it('a purchase without cash gets a derived automatic deposit, rounded up to kuruş', async () => {
    const { db, save } = await setup();
    await save({
      type: 'BUY',
      ts: at('2026-01-05'),
      assetId: 'US:AAPL',
      quantity: '3',
      price: '201.333',
      fxRate: '36.1234',
    });
    const all = reconcileAutoRecords(await listTransactions(db, 'p1'), DEFAULT_ENGINE);
    expect(all.map((t) => t.type)).toEqual(['DEPOSIT', 'BUY']);
    expect(all[0]).toMatchObject({ isAuto: true, amount: '21818.5' }); // 603.999 × 36.1234 = 21818.4974… ↑
  });

  it('deletes and restores (undo) a record; automatic and foreign records are refused', async () => {
    const { db, save, opts } = await setup();
    const dep = await save({ type: 'DEPOSIT', ts: at('2026-01-05'), amount: '1000' });
    const other = await save({ type: 'DEPOSIT', ts: at('2026-01-05'), amount: '5' }, 'p2');
    const id = dep.ok ? dep.txn.id : '';
    const del = await deleteTransaction(db, 'p1', id, opts);
    expect(del.ok).toBe(true);
    expect(await listTransactions(db, 'p1')).toEqual([]);
    if (del.ok) expect((await saveTransaction(db, 'p1', del.txn, opts)).ok).toBe(true);
    expect((await listTransactions(db, 'p1')).map((t) => t.id)).toEqual([id]);

    const auto = await deleteTransaction(db, 'p1', 'auto-dep-x', opts);
    expect(!auto.ok && auto.rejection.code).toBe('AUTO_RECORD');
    expect(
      await saveTransaction(db, 'p1', {
        id: 'a',
        type: 'DEPOSIT',
        ts: at('2026-01-05'),
        amount: '1',
        isAuto: true,
      }),
    ).toEqual({ ok: false, rejection: { code: 'AUTO_RECORD' } });
    const foreign = await deleteTransaction(db, 'p1', other.ok ? other.txn.id : '', opts);
    expect(!foreign.ok && foreign.rejection.code).toBe('NOT_FOUND');
    const foreignEdit = await saveTransaction(
      db,
      'p1',
      other.ok ? other.txn : dep.ok ? dep.txn : ({} as Transaction),
      opts,
    );
    expect(!foreignEdit.ok && foreignEdit.rejection.code).toBe('NOT_FOUND');
    const noPortfolio = await saveTransaction(
      db,
      'p9',
      { id: '', type: 'DEPOSIT', ts: at('2026-01-05'), amount: '1' },
      opts,
    );
    expect(!noPortfolio.ok && noPortfolio.rejection.code).toBe('NOT_FOUND');
  });
});

describe('daily value cache', () => {
  it('matches a full rebuild after every change, recomputing only from the changed day', async () => {
    const { db, save, opts } = await setup();
    const today = '2026-03-01';
    const fullSeries = async () => {
      const txns = reconcileAutoRecords(await listTransactions(db, 'p1'), DEFAULT_ENGINE);
      const closes = (
        await db.all<{ asset_id: string; date: string; close: number }>(
          'SELECT asset_id, date, close FROM price_daily',
        )
      ).reduce<Record<string, Record<string, number>>>((acc, r) => {
        (acc[r.asset_id] ??= {})[r.date] = r.close;
        return acc;
      }, {});
      const assets = new Map([
        [
          'BIST:THYAO',
          { id: 'BIST:THYAO', symbol: 'THYAO', market: 'BIST' as const, currency: 'TRY' as const },
        ],
        [
          'US:AAPL',
          { id: 'US:AAPL', symbol: 'AAPL', market: 'US' as const, currency: 'USD' as const },
        ],
      ]);
      return buildDailySeries(
        txns,
        assets,
        { 'BIST:THYAO': closes['BIST:THYAO'], 'US:AAPL': closes['US:AAPL'] },
        { USD: closes['FX:USDTRY'] },
        { to: today },
      );
    };

    expect((await refreshSeries(db, 'p1', { today })).points).toEqual([]);

    await save({ type: 'DEPOSIT', ts: at('2026-01-05'), amount: '50000' });
    await save({
      type: 'BUY',
      ts: at('2026-01-06'),
      assetId: 'BIST:THYAO',
      quantity: '50',
      price: '305',
    });
    await save({
      type: 'BUY',
      ts: at('2026-01-20'),
      assetId: 'US:AAPL',
      quantity: '10',
      price: '201',
      fee: '1',
      fxRate: '36.15',
    });
    let r = await refreshSeries(db, 'p1', { today });
    expect(r.from).toBe('2026-01-05');
    expect(r.points).toEqual(await fullSeries());
    expect((await getPortfolio(db, 'p1'))?.seriesDirtyFrom).toBeNull();

    // Nothing changed: only the last day is refreshed.
    r = await refreshSeries(db, 'p1', { today });
    expect(r.days).toBe(1);

    // A change in February recomputes from that day only.
    const sell = await save({
      type: 'SELL',
      ts: at('2026-02-10'),
      assetId: 'BIST:THYAO',
      quantity: '20',
      price: '340',
    });
    r = await refreshSeries(db, 'p1', { today });
    expect(r.from).toBe('2026-02-10');
    expect(r.points).toEqual(await fullSeries());

    await save({ type: 'WITHDRAW', ts: at('2026-02-20'), amount: '1000' });
    // Deleting the sale would leave the withdrawal without cash: refused, cache untouched.
    if (sell.ok) {
      const del = await deleteTransaction(db, 'p1', sell.txn.id, opts);
      expect(!del.ok && del.rejection.code).toBe('NEGATIVE_CASH');
      expect((await saveTransaction(db, 'p1', { ...sell.txn, quantity: '10' }, opts)).ok).toBe(
        true,
      );
    }
    r = await refreshSeries(db, 'p1', { today });
    expect(r.from).toBe('2026-02-10');
    expect(r.points).toEqual(await fullSeries());

    // A record before the first day forces a full rebuild.
    await save({ type: 'DEPOSIT', ts: at('2026-01-02'), amount: '100' });
    r = await refreshSeries(db, 'p1', { today });
    expect(r.from).toBe('2026-01-02');
    expect(r.points).toEqual(await fullSeries());
    expect(await loadSnapshots(db, 'p1')).toHaveLength(59);

    // Next day: the cache grows by appending.
    r = await refreshSeries(db, 'p1', { today: '2026-03-02' });
    expect(r.from).toBe('2026-03-01');
    expect(r.points.at(-1)?.date).toBe('2026-03-02');

    expect((await refreshSeries(db, 'nope', { today })).points).toEqual([]);
  });
});

describe('deleting all records of an asset', () => {
  it('removes them as one change, refuses when the rest would break, and restores (undo)', async () => {
    const { db, save, opts } = await setup();
    await save({ type: 'DEPOSIT', ts: at('2026-01-05'), amount: '10000' });
    const b = await save({
      type: 'BUY',
      ts: at('2026-01-06'),
      assetId: 'BIST:THYAO',
      quantity: '10',
      price: '300',
    });
    const s = await save({
      type: 'SELL',
      ts: at('2026-02-06'),
      assetId: 'BIST:THYAO',
      quantity: '10',
      price: '400',
    });
    const w = await save({ type: 'WITHDRAW', ts: at('2026-02-07'), amount: '10500' });
    const ids = [b, s].map((r) => (r.ok ? r.txn.id : ''));
    // Without the sale's proceeds the later withdrawal has no cash: refused, nothing deleted.
    const refused = await deleteTransactions(db, 'p1', ids, opts);
    expect(!refused.ok && refused.rejection.code).toBe('NEGATIVE_CASH');
    expect(await listTransactions(db, 'p1')).toHaveLength(4);
    if (w.ok) await deleteTransaction(db, 'p1', w.txn.id, opts);
    const done = await deleteTransactions(db, 'p1', ids, opts);
    expect(done.ok && done.txns.map((t) => t.type)).toEqual(['BUY', 'SELL']);
    expect((await listTransactions(db, 'p1')).map((t) => t.type)).toEqual(['DEPOSIT']);
    if (done.ok) expect((await restoreTransactions(db, 'p1', done.txns, opts)).ok).toBe(true);
    expect(await listTransactions(db, 'p1')).toHaveLength(3);
    expect((await deleteTransactions(db, 'p1', ['nope'], opts)).ok).toBe(false);
  });
});

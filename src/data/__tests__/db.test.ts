import { describe, expect, it } from '@jest/globals';

import type { Transaction } from '@/domain';

import { createDriver, insertMany } from '../db/driver';
import {
  migrate,
  MIGRATIONS,
  NewerSchemaError,
  schemaVersion,
  SCHEMA_VERSION,
} from '../db/migrations';
import { openNodeDriver } from '../db/nodeDriver';
import { getAssets, upsertAssets } from '../repo/assets';
import {
  clearSeriesDirty,
  deletePortfolio,
  getPortfolio,
  insertPortfolio,
  listPortfolios,
  markSeriesDirty,
} from '../repo/portfolios';
import { latestCloses, loadCloses, upsertCloses } from '../repo/prices';
import { loadSnapshots, replaceSnapshotsFrom } from '../repo/snapshots';
import {
  countTransactions,
  getTransaction,
  insertTransactions,
  listTransactions,
  updateTransaction,
} from '../repo/transactions';

const NOW = '2026-11-09T10:00:00.000Z';

async function freshDb() {
  const db = openNodeDriver();
  await migrate(db);
  await insertPortfolio(db, {
    id: 'p1',
    name: 'Ana Portföy',
    kind: 'user',
    sortOrder: 0,
    seriesDirtyFrom: null,
    createdAt: NOW,
  });
  return db;
}

describe('migrations', () => {
  it('creates the schema once and records its version', async () => {
    const db = openNodeDriver();
    expect(await schemaVersion(db)).toBe(0);
    expect(await migrate(db)).toBe(SCHEMA_VERSION);
    expect(await migrate(db)).toBe(SCHEMA_VERSION); // idempotent
    const tables = await db.all<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
    );
    expect(tables.map((t) => t.name)).toEqual([
      'asset',
      'portfolio',
      'portfolio_snapshot',
      'price_daily',
      'txn',
    ]);
  });

  it('applies later migrations on top of existing data', async () => {
    const db = await freshDb();
    const next = [
      ...MIGRATIONS,
      { version: 2, description: 'test', sql: 'ALTER TABLE portfolio ADD COLUMN icon TEXT;' },
    ];
    expect(await migrate(db, next)).toBe(2);
    expect((await listPortfolios(db)).map((p) => p.name)).toEqual(['Ana Portföy']);
  });

  it('rolls a failing migration back completely', async () => {
    const db = await freshDb();
    const broken = [
      ...MIGRATIONS,
      {
        version: 2,
        description: 'broken',
        sql: 'ALTER TABLE portfolio ADD COLUMN icon TEXT; SELECT * FROM missing_table;',
      },
    ];
    await expect(migrate(db, broken)).rejects.toThrow();
    expect(await schemaVersion(db)).toBe(1);
    const cols = await db.all<{ name: string }>('PRAGMA table_info(portfolio)');
    expect(cols.map((c) => c.name)).not.toContain('icon');
  });

  it('refuses a database written by a newer app version', async () => {
    const db = openNodeDriver();
    await db.exec('PRAGMA user_version = 99');
    await expect(migrate(db)).rejects.toBeInstanceOf(NewerSchemaError);
  });
});

describe('driver', () => {
  it('runs queued calls in order and rolls back failed transactions', async () => {
    const db = await freshDb();
    await expect(
      db.transaction(async (tx) => {
        await tx.run("UPDATE portfolio SET name = 'X' WHERE id = 'p1'");
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
    expect((await getPortfolio(db, 'p1'))?.name).toBe('Ana Portföy');
    // Calls made while a transaction runs wait for it.
    const order: string[] = [];
    const t = db.transaction(async (tx) => {
      await tx.run("UPDATE portfolio SET name = 'A' WHERE id = 'p1'");
      order.push('tx');
    });
    const read = db
      .first<{ name: string }>("SELECT name FROM portfolio WHERE id = 'p1'")
      .then((r) => {
        order.push('read');
        return r?.name;
      });
    await t;
    expect(await read).toBe('A');
    expect(order).toEqual(['tx', 'read']);
  });

  it('a failed call does not block the queue', async () => {
    const db = await freshDb();
    await expect(db.run('SELECT * FROM nope')).rejects.toThrow();
    expect(await db.first<{ n: number }>('SELECT 1 AS n')).toEqual({ n: 1 });
  });

  it('inserts many rows in chunks', async () => {
    const db = openNodeDriver();
    await db.exec('CREATE TABLE t (a INTEGER, b TEXT, c TEXT)');
    const rows = Array.from({ length: 1000 }, (_, i) => [i, `b${i}`, null]);
    await insertMany(db, 't', ['a', 'b', 'c'], rows);
    await insertMany(db, 't', ['a', 'b', 'c'], []);
    expect(await db.first<{ n: number }>('SELECT COUNT(*) AS n FROM t')).toEqual({ n: 1000 });
  });

  it('closes', async () => {
    const raw = openNodeDriver();
    await raw.close();
    const wrapped = createDriver({
      run: async () => ({ changes: 0 }),
      all: async () => [],
      first: async () => null,
      exec: async () => undefined,
      close: async () => undefined,
    });
    await expect(wrapped.all('x')).resolves.toEqual([]);
  });
});

describe('repositories', () => {
  it('stores transactions with every field as exact text', async () => {
    const db = await freshDb();
    await upsertAssets(
      db,
      [{ id: 'BIST:THYAO', symbol: 'THYAO', market: 'BIST', currency: 'TRY' }],
      NOW,
    );
    const txns: Transaction[] = [
      { id: 'd1', type: 'DEPOSIT', ts: '2026-01-02T07:00:00.000Z', amount: '10000.10' },
      {
        id: 'b1',
        type: 'BUY',
        ts: '2026-01-02T08:00:00.000Z',
        assetId: 'BIST:THYAO',
        quantity: '0.12345678',
        price: '312.40',
        fee: '0.07',
        fxRate: '1',
        note: 'ilk alım',
      },
      {
        id: 's1',
        type: 'SELL',
        ts: '2026-02-02T08:00:00.000Z',
        assetId: 'BIST:THYAO',
        quantity: '0.1',
        price: '320',
        withdrawProceeds: true,
      },
    ];
    await insertTransactions(db, 'p1', txns, NOW);
    expect(await listTransactions(db, 'p1')).toEqual(txns);
    expect(await countTransactions(db)).toBe(3);
    expect(await countTransactions(db, 'p1')).toBe(3);

    const edited = { ...txns[1], quantity: '1', note: undefined };
    await updateTransaction(db, 'p1', edited, '2026-11-09T11:00:00.000Z');
    const got = await getTransaction(db, 'b1');
    expect(got).toEqual({ portfolioId: 'p1', txn: { ...edited } });
    expect(got?.txn.note).toBeUndefined();
    expect(await getTransaction(db, 'none')).toBeNull();
  });

  it('rejects an unknown asset through the foreign key', async () => {
    const db = await freshDb();
    await expect(
      insertTransactions(
        db,
        'p1',
        [{ id: 'x', type: 'BUY', ts: NOW, assetId: 'NOPE', quantity: '1', price: '1' }],
        NOW,
      ),
    ).rejects.toThrow();
  });

  it('keeps the earliest dirty day and clears it', async () => {
    const db = await freshDb();
    await markSeriesDirty(db, 'p1', '2026-03-01');
    await markSeriesDirty(db, 'p1', '2026-05-01');
    expect((await getPortfolio(db, 'p1'))?.seriesDirtyFrom).toBe('2026-03-01');
    await markSeriesDirty(db, 'p1', '2026-01-15');
    expect((await getPortfolio(db, 'p1'))?.seriesDirtyFrom).toBe('2026-01-15');
    await clearSeriesDirty(db, 'p1');
    expect((await getPortfolio(db, 'p1'))?.seriesDirtyFrom).toBeNull();
  });

  it('loads closes from a day with the previous close carried in', async () => {
    const db = await freshDb();
    await upsertCloses(db, [
      ['A', '2026-01-01', 10],
      ['A', '2026-01-05', 11],
      ['A', '2026-01-09', 12],
      ['B', '2026-01-02', 5],
    ]);
    expect(await loadCloses(db, ['A', 'B', 'C'], '2026-01-06')).toEqual({
      A: { '2026-01-05': 11, '2026-01-09': 12 },
      B: { '2026-01-02': 5 },
      C: {},
    });
    expect((await loadCloses(db, ['A'])).A).toEqual({
      '2026-01-01': 10,
      '2026-01-05': 11,
      '2026-01-09': 12,
    });
    expect(await loadCloses(db, [])).toEqual({});
    expect(await latestCloses(db, ['A', 'B'], 2)).toEqual({
      A: [
        { date: '2026-01-05', close: 11 },
        { date: '2026-01-09', close: 12 },
      ],
      B: [{ date: '2026-01-02', close: 5 }],
    });
    // Re-writing a day replaces it.
    await upsertCloses(db, [['A', '2026-01-09', 13]]);
    expect((await latestCloses(db, ['A'], 1)).A).toEqual([{ date: '2026-01-09', close: 13 }]);
    expect(await latestCloses(db, [], 1)).toEqual({});
  });

  it('replaces cached days and deletes them with the portfolio', async () => {
    const db = await freshDb();
    const pt = (date: string, value: number) => ({ date, value, cash: 0, netInvested: 0, flow: 0 });
    await replaceSnapshotsFrom(db, 'p1', '2026-01-01', [pt('2026-01-01', 1), pt('2026-01-02', 2)]);
    await replaceSnapshotsFrom(db, 'p1', '2026-01-02', [pt('2026-01-02', 3), pt('2026-01-03', 4)]);
    expect((await loadSnapshots(db, 'p1')).map((p) => p.value)).toEqual([1, 3, 4]);
    await upsertAssets(db, [{ id: 'X', symbol: 'X', market: 'US', currency: 'USD' }], NOW);
    expect((await getAssets(db, ['X', 'Y'])).get('X')?.currency).toBe('USD');
    expect((await getAssets(db, [])).size).toBe(0);
    await insertTransactions(db, 'p1', [{ id: 'd', type: 'DEPOSIT', ts: NOW, amount: '1' }], NOW);
    await deletePortfolio(db, 'p1');
    expect(await loadSnapshots(db, 'p1')).toEqual([]);
    expect(await countTransactions(db)).toBe(0);
  });
});

import { describe, expect, it } from '@jest/globals';

import { migrate } from '../db/migrations';
import { openNodeDriver } from '../db/nodeDriver';
import { seedDemo, DEMO_PORTFOLIO_ID } from '../demo/seed';
import { listPortfolios, insertPortfolio } from '../repo/portfolios';
import { listTransactions } from '../repo/transactions';
import {
  createPortfolio,
  deleteOwnPortfolio,
  hasOwnRecords,
  renameOwnPortfolio,
} from '../service/portfolios';
import { saveTransaction } from '../service/transactions';

const NOW = new Date('2026-11-09T12:00:00Z');

async function setup() {
  const db = openNodeDriver();
  await migrate(db);
  await insertPortfolio(db, {
    id: 'main',
    name: 'Ana Portföy',
    kind: 'user',
    sortOrder: 0,
    seriesDirtyFrom: null,
    createdAt: NOW.toISOString(),
  });
  return db;
}

describe('own portfolios', () => {
  it('adds with a clean, unique name at the end of the list', async () => {
    const db = await setup();
    const r = await createPortfolio(db, '  Emeklilik   Fonu ', { now: NOW });
    expect(r.ok && r.portfolio).toMatchObject({
      name: 'Emeklilik Fonu',
      kind: 'user',
      sortOrder: 1,
    });
    expect(await createPortfolio(db, 'emeklilik fonu')).toEqual({
      ok: false,
      reason: 'NAME_TAKEN',
    });
    expect(await createPortfolio(db, '   ')).toEqual({ ok: false, reason: 'EMPTY_NAME' });
    expect((await listPortfolios(db)).map((p) => p.name)).toEqual([
      'Ana Portföy',
      'Emeklilik Fonu',
    ]);
  });

  it('renames, refusing an empty or taken name', async () => {
    const db = await setup();
    await createPortfolio(db, 'Kripto');
    expect(await renameOwnPortfolio(db, 'main', 'Uzun Vade')).toEqual({ ok: true });
    expect(await renameOwnPortfolio(db, 'main', 'KRİPTO')).toEqual({
      ok: false,
      reason: 'NAME_TAKEN',
    });
    expect(await renameOwnPortfolio(db, 'nope', 'X')).toEqual({ ok: false, reason: 'NOT_FOUND' });
    expect((await listPortfolios(db))[0].name).toBe('Uzun Vade');
  });

  it('deletes with its records, but never the last own portfolio', async () => {
    const db = await setup();
    await seedDemo(db, { now: NOW });
    const extra = await createPortfolio(db, 'Deneme');
    const id = extra.ok ? extra.portfolio!.id : '';
    await saveTransaction(
      db,
      id,
      { id: '', type: 'DEPOSIT', ts: '2026-11-02T09:00:00Z', amount: '100' },
      { now: NOW },
    );
    expect(await listTransactions(db, id)).toHaveLength(1);
    expect(await deleteOwnPortfolio(db, id)).toEqual({ ok: true });
    expect(await listTransactions(db, id)).toHaveLength(0);
    // The example portfolio does not count as an own portfolio.
    expect(await deleteOwnPortfolio(db, 'main')).toEqual({ ok: false, reason: 'LAST_PORTFOLIO' });
    expect(await deleteOwnPortfolio(db, DEMO_PORTFOLIO_ID)).toEqual({ ok: true });
  });
});

describe('first run', () => {
  it('knows whether there are own records (the example does not count)', async () => {
    const db = await setup();
    await seedDemo(db, { now: NOW });
    expect(await hasOwnRecords(db)).toBe(false);
    await saveTransaction(
      db,
      'main',
      { id: '', type: 'DEPOSIT', ts: '2026-11-02T09:00:00Z', amount: '100' },
      { now: NOW },
    );
    expect(await hasOwnRecords(db)).toBe(true);
  });
});

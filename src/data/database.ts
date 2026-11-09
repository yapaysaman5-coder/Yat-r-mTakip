import type { SqlDriver } from './db/driver';
import { openExpoDriver } from './db/expoDriver';
import { migrate } from './db/migrations';
import { seedDemo } from './demo/seed';
import { insertPortfolio, listPortfolios } from './repo/portfolios';

import { DATABASE_NAME, MAIN_PORTFOLIO_ID } from './constants';

export { DATABASE_NAME, MAIN_PORTFOLIO_ID };

let opening: Promise<SqlDriver> | null = null;

/** The app database, opened and migrated once. */
export function getDatabase(): Promise<SqlDriver> {
  opening ??= (async () => {
    const db = await openExpoDriver(DATABASE_NAME);
    await migrate(db);
    return db;
  })().catch((error) => {
    opening = null;
    throw error;
  });
  return opening;
}

/**
 * First start: an empty "Ana Portföy" for the person's own records and the example
 * portfolio to explore the app with (removable in Ayarlar › Veri ve Yedekleme).
 */
export async function ensureStarterData(db: SqlDriver, now = new Date()): Promise<void> {
  if ((await listPortfolios(db)).length > 0) return;
  await insertPortfolio(db, {
    id: MAIN_PORTFOLIO_ID,
    name: 'Ana Portföy',
    kind: 'user',
    sortOrder: 0,
    seriesDirtyFrom: null,
    createdAt: now.toISOString(),
  });
  await seedDemo(db, { now });
}

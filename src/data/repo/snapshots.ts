import type { SeriesPoint } from '@/domain';

import { insertMany, type SqlExecutor } from '../db/driver';

export async function loadSnapshots(db: SqlExecutor, portfolioId: string): Promise<SeriesPoint[]> {
  return db.all<SeriesPoint>(
    `SELECT date, value, cash, net_invested AS netInvested, flow
     FROM portfolio_snapshot WHERE portfolio_id = ? ORDER BY date`,
    [portfolioId],
  );
}

export async function lastSnapshotDate(
  db: SqlExecutor,
  portfolioId: string,
): Promise<string | null> {
  const row = await db.first<{ d: string | null }>(
    'SELECT MAX(date) AS d FROM portfolio_snapshot WHERE portfolio_id = ?',
    [portfolioId],
  );
  return row?.d ?? null;
}

/** Replaces the cached days from `from` on with `points`. */
export async function replaceSnapshotsFrom(
  db: SqlExecutor,
  portfolioId: string,
  from: string,
  points: readonly SeriesPoint[],
): Promise<void> {
  await db.run('DELETE FROM portfolio_snapshot WHERE portfolio_id = ? AND date >= ?', [
    portfolioId,
    from,
  ]);
  await insertMany(
    db,
    'portfolio_snapshot',
    ['portfolio_id', 'date', 'value', 'cash', 'net_invested', 'flow'],
    points.map((p) => [portfolioId, p.date, p.value, p.cash, p.netInvested, p.flow]),
  );
}

export async function deleteSnapshots(db: SqlExecutor, portfolioId: string): Promise<void> {
  await db.run('DELETE FROM portfolio_snapshot WHERE portfolio_id = ?', [portfolioId]);
}

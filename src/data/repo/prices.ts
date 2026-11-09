import { insertMany, placeholders, type SqlExecutor } from '../db/driver';
import type { CloseHistory } from '../types';

export async function upsertCloses(
  db: SqlExecutor,
  rows: readonly (readonly [assetId: string, date: string, close: number])[],
): Promise<void> {
  await insertMany(db, 'price_daily', ['asset_id', 'date', 'close'], rows, { orReplace: true });
}

/**
 * Closes from `from` (inclusive) on, plus the last close before `from` for each asset, so a
 * series that starts at `from` can carry the previous close into its first days.
 */
export async function loadCloses(
  db: SqlExecutor,
  assetIds: readonly string[],
  from?: string,
): Promise<CloseHistory> {
  const out: CloseHistory = Object.fromEntries(assetIds.map((id) => [id, {}]));
  if (assetIds.length === 0) return out;
  const ids = placeholders(assetIds.length);
  const rows = from
    ? await db.all<{ asset_id: string; date: string; close: number }>(
        `SELECT asset_id, date, close FROM price_daily WHERE asset_id IN (${ids}) AND date >= ?
         UNION ALL
         SELECT p.asset_id, p.date, p.close FROM price_daily p
         JOIN (SELECT asset_id, MAX(date) AS d FROM price_daily
               WHERE asset_id IN (${ids}) AND date < ? GROUP BY asset_id) m
           ON p.asset_id = m.asset_id AND p.date = m.d`,
        [...assetIds, from, ...assetIds, from],
      )
    : await db.all<{ asset_id: string; date: string; close: number }>(
        `SELECT asset_id, date, close FROM price_daily WHERE asset_id IN (${ids})`,
        [...assetIds],
      );
  for (const r of rows) out[r.asset_id][r.date] = r.close;
  return out;
}

/** The last `n` closes of each asset, oldest first. */
export async function latestCloses(
  db: SqlExecutor,
  assetIds: readonly string[],
  n: number,
): Promise<Record<string, { date: string; close: number }[]>> {
  const out: Record<string, { date: string; close: number }[]> = Object.fromEntries(
    assetIds.map((id) => [id, []]),
  );
  if (assetIds.length === 0) return out;
  const rows = await db.all<{ asset_id: string; date: string; close: number }>(
    `SELECT asset_id, date, close FROM (
       SELECT asset_id, date, close,
              ROW_NUMBER() OVER (PARTITION BY asset_id ORDER BY date DESC) AS rn
       FROM price_daily WHERE asset_id IN (${placeholders(assetIds.length)})
     ) WHERE rn <= ? ORDER BY asset_id, date`,
    [...assetIds, n],
  );
  for (const r of rows) out[r.asset_id].push({ date: r.date, close: r.close });
  return out;
}

export async function deleteCloses(db: SqlExecutor, idPrefix: string): Promise<void> {
  await db.run('DELETE FROM price_daily WHERE asset_id LIKE ?', [`${idPrefix}%`]);
}

export async function countCloses(db: SqlExecutor): Promise<number> {
  const row = await db.first<{ n: number }>('SELECT COUNT(*) AS n FROM price_daily');
  return row?.n ?? 0;
}

import { insertMany, placeholders, type SqlExecutor } from '../db/driver';

export interface StoredQuote {
  assetId: string;
  price: number;
  prevClose: number | null;
  /** When the price was set at the source (epoch ms). */
  time: number;
  source: string;
  delayMinutes: number;
  endOfDay: boolean;
  /** When this device received it (epoch ms). */
  fetchedAt: number;
}

interface QuoteRow {
  asset_id: string;
  price: number;
  prev_close: number | null;
  time: number;
  source: string;
  delay_minutes: number;
  end_of_day: number;
  fetched_at: number;
}

const fromRow = (r: QuoteRow): StoredQuote => ({
  assetId: r.asset_id,
  price: r.price,
  prevClose: r.prev_close,
  time: r.time,
  source: r.source,
  delayMinutes: r.delay_minutes,
  endOfDay: r.end_of_day === 1,
  fetchedAt: r.fetched_at,
});

export async function upsertQuotes(db: SqlExecutor, quotes: readonly StoredQuote[]): Promise<void> {
  await insertMany(
    db,
    'quote',
    [
      'asset_id',
      'price',
      'prev_close',
      'time',
      'source',
      'delay_minutes',
      'end_of_day',
      'fetched_at',
    ],
    quotes.map((q) => [
      q.assetId,
      q.price,
      q.prevClose,
      q.time,
      q.source,
      q.delayMinutes,
      q.endOfDay ? 1 : 0,
      q.fetchedAt,
    ]),
    { orReplace: true },
  );
}

export async function loadQuotes(
  db: SqlExecutor,
  assetIds?: readonly string[],
): Promise<Map<string, StoredQuote>> {
  const rows = assetIds
    ? assetIds.length
      ? await db.all<QuoteRow>(
          `SELECT * FROM quote WHERE asset_id IN (${placeholders(assetIds.length)})`,
          assetIds,
        )
      : []
    : await db.all<QuoteRow>('SELECT * FROM quote');
  return new Map(rows.map((r) => [r.asset_id, fromRow(r)]));
}

export interface SyncState {
  assetId: string;
  firstDate: string | null;
  lastDate: string | null;
  source: string | null;
  syncedAt: number;
  error: string | null;
}

export async function loadSyncStates(db: SqlExecutor): Promise<Map<string, SyncState>> {
  const rows = await db.all<{
    asset_id: string;
    first_date: string | null;
    last_date: string | null;
    source: string | null;
    synced_at: number;
    error: string | null;
  }>('SELECT * FROM price_sync');
  return new Map(
    rows.map((r) => [
      r.asset_id,
      {
        assetId: r.asset_id,
        firstDate: r.first_date,
        lastDate: r.last_date,
        source: r.source,
        syncedAt: r.synced_at,
        error: r.error,
      },
    ]),
  );
}

export async function saveSyncState(db: SqlExecutor, s: SyncState): Promise<void> {
  await db.run(
    `INSERT OR REPLACE INTO price_sync (asset_id, first_date, last_date, source, synced_at, error)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [s.assetId, s.firstDate, s.lastDate, s.source, s.syncedAt, s.error],
  );
}

export async function upsertSplits(
  db: SqlExecutor,
  assetId: string,
  splits: readonly { date: string; ratio: string }[],
  source: string,
): Promise<void> {
  await insertMany(
    db,
    'corporate_action',
    ['asset_id', 'date', 'type', 'value', 'source'],
    splits.map((s) => [assetId, s.date, 'SPLIT', s.ratio, source]),
    { orReplace: true },
  );
}

export async function loadSplits(
  db: SqlExecutor,
  assetIds: readonly string[],
): Promise<{ assetId: string; date: string; ratio: string }[]> {
  if (assetIds.length === 0) return [];
  const rows = await db.all<{ asset_id: string; date: string; value: string }>(
    `SELECT asset_id, date, value FROM corporate_action
     WHERE type = 'SPLIT' AND asset_id IN (${placeholders(assetIds.length)}) ORDER BY date`,
    assetIds,
  );
  return rows.map((r) => ({ assetId: r.asset_id, date: r.date, ratio: r.value }));
}

export async function loadWatchlist(db: SqlExecutor): Promise<string[]> {
  const rows = await db.all<{ asset_id: string }>(
    'SELECT asset_id FROM watchlist ORDER BY sort_order, asset_id',
  );
  return rows.map((r) => r.asset_id);
}

export async function addToWatchlist(db: SqlExecutor, assetId: string): Promise<void> {
  await db.run(
    `INSERT OR IGNORE INTO watchlist (asset_id, sort_order)
     VALUES (?, (SELECT COALESCE(MAX(sort_order), -1) + 1 FROM watchlist))`,
    [assetId],
  );
}

export async function removeFromWatchlist(db: SqlExecutor, assetId: string): Promise<void> {
  await db.run('DELETE FROM watchlist WHERE asset_id = ?', [assetId]);
}

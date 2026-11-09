import { addDays, trDay } from '@/domain';

import type { SqlDriver } from '../db/driver';
import { instrumentFor, pinSources, providerSymbolOf } from '../market/instruments';
import type { MarketRouter } from '../market/router';
import { getAssets, upsertAssets } from '../repo/assets';
import { markSeriesDirty } from '../repo/portfolios';
import { upsertCloses } from '../repo/prices';
import type { StoredAsset } from '../types';

/**
 * Database side of the trade form: the asset row a record needs, the closing price of a
 * chosen day ("Seçilen gün kapanışı"), and the assets used last.
 */

/**
 * Creates (or refreshes) the asset a new record refers to. When the person matches a coin to
 * another source, prices from the old source are dropped and its history is fetched anew.
 */
export async function ensureAsset(db: SqlDriver, asset: StoredAsset): Promise<void> {
  // A coin matched to CoinGecko by the person: priced from there from now on.
  pinSources([asset]);
  const inst = instrumentFor(asset.id, asset.name);
  const providerSymbol = asset.providerSymbol ?? (inst ? providerSymbolOf(inst) : undefined);
  const before = (await getAssets(db, [asset.id])).get(asset.id);
  await db.transaction(async (tx) => {
    await upsertAssets(tx, [{ ...asset, providerSymbol }], new Date().toISOString());
    if (!before || before.providerSymbol === providerSymbol) return;
    for (const table of ['price_daily', 'quote', 'price_sync', 'corporate_action']) {
      await tx.run(`DELETE FROM ${table} WHERE asset_id = ?`, [asset.id]);
    }
    const uses = await tx.all<{ portfolio_id: string; first: string }>(
      'SELECT portfolio_id, MIN(ts) AS first FROM txn WHERE asset_id = ? GROUP BY portfolio_id',
      [asset.id],
    );
    for (const u of uses) await markSeriesDirty(tx, u.portfolio_id, trDay(u.first));
  });
}

export interface DayClose {
  close: number;
  /** The day the close is from (the last trading day on or before the asked day). */
  date: string;
}

async function storedClose(db: SqlDriver, assetId: string, day: string): Promise<DayClose | null> {
  const row = await db.first<{ date: string; close: number }>(
    'SELECT date, close FROM price_daily WHERE asset_id = ? AND date <= ? ORDER BY date DESC LIMIT 1',
    [assetId, day],
  );
  return row ? { date: row.date, close: row.close } : null;
}

/**
 * The close on `day` (or the last trading day before it). Missing locally, the week up to
 * that day is downloaded once and kept, so the next look is instant and works offline.
 */
export async function closeOnDay(
  db: SqlDriver,
  router: MarketRouter | null,
  assetId: string,
  day: string,
): Promise<DayClose | null> {
  const stored = await storedClose(db, assetId, day);
  // A stored close older than a long weekend may hide missing days: ask the source.
  if (stored && stored.date >= addDays(day, -4)) return stored;
  const inst = instrumentFor(assetId);
  if (!router || !inst) return stored;
  try {
    const h = await router.history(inst, addDays(day, -10), day);
    await upsertCloses(
      db,
      h.closes.map((c) => [assetId, c.date, c.close] as const),
    );
  } catch {
    return stored;
  }
  return storedClose(db, assetId, day);
}

/** Assets of the person's own records, most recently traded first. */
export async function recentAssetIds(db: SqlDriver, limit = 8): Promise<string[]> {
  const rows = await db.all<{ asset_id: string }>(
    `SELECT t.asset_id FROM txn t JOIN portfolio p ON p.id = t.portfolio_id
     WHERE p.kind = 'user' AND t.asset_id IS NOT NULL
     GROUP BY t.asset_id ORDER BY MAX(t.ts) DESC LIMIT ?`,
    [limit],
  );
  return rows.map((r) => r.asset_id);
}

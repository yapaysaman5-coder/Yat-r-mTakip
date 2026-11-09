import type { Currency, Market } from '@/domain';

import { insertMany, placeholders, type SqlExecutor } from '../db/driver';
import type { StoredAsset } from '../types';

interface AssetRow {
  id: string;
  market: Market;
  symbol: string;
  provider_symbol: string | null;
  name: string | null;
  currency: Currency;
}

const fromRow = (r: AssetRow): StoredAsset => ({
  id: r.id,
  market: r.market,
  symbol: r.symbol,
  currency: r.currency,
  name: r.name ?? undefined,
  providerSymbol: r.provider_symbol ?? undefined,
});

/** Inserts new assets and refreshes the name / symbols of existing ones. */
export async function upsertAssets(
  db: SqlExecutor,
  assets: readonly StoredAsset[],
  now: string,
): Promise<void> {
  await insertMany(
    db,
    'asset',
    ['id', 'market', 'symbol', 'provider_symbol', 'name', 'currency', 'created_at'],
    assets.map((a) => [
      a.id,
      a.market,
      a.symbol,
      a.providerSymbol ?? null,
      a.name ?? null,
      a.currency,
      now,
    ]),
    { orReplace: true },
  );
}

export async function listAssets(db: SqlExecutor): Promise<StoredAsset[]> {
  const rows = await db.all<AssetRow>('SELECT * FROM asset ORDER BY id');
  return rows.map(fromRow);
}

export async function getAssets(
  db: SqlExecutor,
  ids: readonly string[],
): Promise<Map<string, StoredAsset>> {
  if (ids.length === 0) return new Map();
  const rows = await db.all<AssetRow>(
    `SELECT * FROM asset WHERE id IN (${placeholders(ids.length)})`,
    ids,
  );
  return new Map(rows.map((r) => [r.id, fromRow(r)]));
}

/** Removes assets no transaction refers to and that match the prefix (e.g. "demo:"). */
export async function deleteUnusedAssets(db: SqlExecutor, idPrefix: string): Promise<void> {
  await db.run(
    `DELETE FROM asset WHERE id LIKE ? AND id NOT IN (SELECT DISTINCT asset_id FROM txn WHERE asset_id IS NOT NULL)`,
    [`${idPrefix}%`],
  );
}

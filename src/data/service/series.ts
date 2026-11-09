import {
  buildDailySeries,
  reconcileAutoRecords,
  trDay,
  type Currency,
  type FxHistory,
  type SeriesPoint,
  type Transaction,
} from '@/domain';

import type { SqlDriver } from '../db/driver';
import { DEFAULT_ENGINE, fxAssetId, type EngineOptions } from '../engine';
import { getAssets } from '../repo/assets';
import { clearSeriesDirty, getPortfolio } from '../repo/portfolios';
import { loadCloses } from '../repo/prices';
import {
  deleteSnapshots,
  lastSnapshotDate,
  loadSnapshots,
  replaceSnapshotsFrom,
} from '../repo/snapshots';
import { listTransactions } from '../repo/transactions';

/**
 * The daily value cache (portfolio_snapshot). After a change only the days from the first
 * affected day on are recomputed; the last cached day is always refreshed because it may
 * have been "today" with a price that has moved since.
 */

export interface SeriesRefresh {
  points: SeriesPoint[];
  /** First recomputed day (null: nothing to compute). */
  from: string | null;
  /** Days recomputed. */
  days: number;
  /** All records including the automatic ones, in processing order. */
  txns: Transaction[];
}

export async function refreshSeries(
  db: SqlDriver,
  portfolioId: string,
  { today, engine = DEFAULT_ENGINE }: { today: string; engine?: EngineOptions },
): Promise<SeriesRefresh> {
  return db.transaction(async (tx) => {
    const portfolio = await getPortfolio(tx, portfolioId);
    if (!portfolio) return { points: [], from: null, days: 0, txns: [] };
    const txns = reconcileAutoRecords(await listTransactions(tx, portfolioId), engine);
    if (txns.length === 0) {
      await deleteSnapshots(tx, portfolioId);
      await clearSeriesDirty(tx, portfolioId);
      return { points: [], from: null, days: 0, txns };
    }

    const firstDay = trDay(txns[0].ts);
    const lastTxnDay = trDay(txns[txns.length - 1].ts);
    const to = today > lastTxnDay ? today : lastTxnDay;
    const saved = await lastSnapshotDate(tx, portfolioId);
    const firstSaved = saved
      ? (await tx.first<{ d: string }>(
          'SELECT MIN(date) AS d FROM portfolio_snapshot WHERE portfolio_id = ?',
          [portfolioId],
        ))!.d
      : null;

    let from = saved ?? firstDay;
    if (portfolio.seriesDirtyFrom && portfolio.seriesDirtyFrom < from) {
      from = portfolio.seriesDirtyFrom;
    }
    const rebuild = !saved || from <= firstDay || firstSaved !== firstDay;
    if (rebuild) from = firstDay;

    const assetIds = [...new Set(txns.flatMap((t) => (t.assetId ? [t.assetId] : [])))];
    const assets = await getAssets(tx, assetIds);
    const currencies = [...new Set([...assets.values()].map((a) => a.currency))].filter(
      (c) => c !== 'TRY',
    ) as Currency[];
    const fxIds = currencies.map((c) => fxAssetId(portfolio.kind, c));
    const closes = await loadCloses(tx, [...assetIds, ...fxIds], from);
    const fx: FxHistory = Object.fromEntries(currencies.map((c, i) => [c, closes[fxIds[i]]]));
    for (const id of fxIds) delete closes[id];

    const points = buildDailySeries(txns, assets, closes, fx, { from, to, method: engine.method });
    if (rebuild) await deleteSnapshots(tx, portfolioId);
    await replaceSnapshotsFrom(tx, portfolioId, from, points);
    await clearSeriesDirty(tx, portfolioId);
    return { points: await loadSnapshots(tx, portfolioId), from, days: points.length, txns };
  });
}

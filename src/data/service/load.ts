import { trDay, type Quote } from '@/domain';

import { BENCHMARKS, benchmarkAssetId } from '../benchmarks';
import type { SqlDriver } from '../db/driver';
import { DEFAULT_ENGINE, fxAssetId, type EngineOptions } from '../engine';
import { getAssets } from '../repo/assets';
import { getPortfolio } from '../repo/portfolios';
import { latestCloses, loadCloses } from '../repo/prices';
import type { BenchmarkSeries, PortfolioData } from '../view/portfolioView';
import { refreshSeries } from './series';

/**
 * Reads everything a portfolio's screens need: records (with derived automatic ones), the
 * daily value cache (refreshed from the first stale day), today's prices and benchmarks.
 *
 * Until live quotes arrive (Phase 4) "today's price" is the latest stored close, and the
 * previous close is the one before it, only when the latest close is from today.
 */
export async function loadPortfolioData(
  db: SqlDriver,
  portfolioId: string,
  { now = new Date(), engine = DEFAULT_ENGINE }: { now?: Date; engine?: EngineOptions } = {},
): Promise<PortfolioData | null> {
  const portfolio = await getPortfolio(db, portfolioId);
  if (!portfolio) return null;
  const today = trDay(now);
  const { points, txns } = await refreshSeries(db, portfolioId, { today, engine });

  const assetIds = [...new Set(txns.flatMap((t) => (t.assetId ? [t.assetId] : [])))];
  const assets = await getAssets(db, assetIds);
  const currencies = [...new Set([...assets.values()].map((a) => a.currency))].filter(
    (c) => c !== 'TRY',
  );
  const fxIds = currencies.map((c) => fxAssetId(portfolio.kind, c));
  const recent = await latestCloses(db, [...assetIds, ...fxIds], 8);

  const lastTwo = (id: string) => {
    const list = recent[id] ?? [];
    const latest = list[list.length - 1];
    if (!latest) return null;
    const prev = latest.date === today && list.length > 1 ? list[list.length - 2] : latest;
    return { now: latest.close, prev: prev.close };
  };

  const quotes: Record<string, Quote> = {};
  const sparks: Record<string, number[]> = {};
  for (const id of assetIds) {
    const asset = assets.get(id);
    const p = lastTwo(id);
    if (!asset || !p) continue;
    const fx = asset.currency === 'TRY' ? null : lastTwo(fxAssetId(portfolio.kind, asset.currency));
    if (asset.currency !== 'TRY' && !fx) continue; // no rate yet: fall back to the trade rate
    quotes[id] = {
      price: p.now,
      prevClose: p.prev,
      fx: fx ? fx.now : 1,
      fxPrev: fx ? fx.prev : 1,
    };
    sparks[id] = (recent[id] ?? []).slice(-7).map((c) => c.close);
  }

  const benchmarks: BenchmarkSeries[] = [];
  if (points.length) {
    const dates = points.map((p) => p.date);
    const ids = BENCHMARKS.map((b) => benchmarkAssetId(portfolio.kind, b.key));
    const closes = await loadCloses(db, ids, dates[0]);
    BENCHMARKS.forEach((b, k) => {
      const byDay = closes[ids[k]];
      const known = Object.keys(byDay).sort();
      if (known.length === 0) return;
      // Carry the last close forward; before the first close use the first one.
      let last = byDay[known[0]];
      benchmarks.push({
        key: b.key,
        name: b.name,
        prices: dates.map((d) => (last = byDay[d] ?? last)),
      });
    });
  }

  return { portfolio, txns, assets, quotes, sparks, series: points, benchmarks, today, engine };
}

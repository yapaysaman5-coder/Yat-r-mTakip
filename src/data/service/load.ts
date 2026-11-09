import { trDay, type Quote } from '@/domain';

import { BENCHMARKS, benchmarkAssetId } from '../benchmarks';
import type { SqlDriver } from '../db/driver';
import { DEFAULT_ENGINE, fxAssetId, type EngineOptions } from '../engine';
import { getAssets } from '../repo/assets';
import { loadQuotes } from '../repo/market';
import { getPortfolio } from '../repo/portfolios';
import { latestCloses, loadCloses } from '../repo/prices';
import type { BenchmarkSeries, PortfolioData } from '../view/portfolioView';
import { refreshSeries } from './series';

/** Default yearly net deposit rate; the person sets their own in Analiz › Ya Olsaydı. */
export const DEFAULT_DEPOSIT_RATE = 0.4;

/**
 * A deposit account at a yearly net rate, compounded daily: 1 on the first day.
 * (Real deposits pay at term; daily compounding is the smooth equivalent.)
 */
export function depositPrices(dates: readonly string[], yearlyRate: number): number[] {
  if (dates.length === 0) return [];
  const daily = (1 + yearlyRate) ** (1 / 365);
  const t0 = Date.parse(`${dates[0]}T00:00:00Z`);
  return dates.map((d) => daily ** Math.round((Date.parse(`${d}T00:00:00Z`) - t0) / 86_400_000));
}

/**
 * Reads everything a portfolio's screens need: records (with derived automatic ones), the
 * daily value cache (refreshed from the first stale day), today's prices and benchmarks.
 *
 * "Today's price" is the latest stored close (a live quote is stored as that day's close).
 * The previous close is the source's own figure when the live quote is from today, else the
 * close before; when the latest close is not from today, today's change is zero.
 */
export async function loadPortfolioData(
  db: SqlDriver,
  portfolioId: string,
  {
    now = new Date(),
    engine = DEFAULT_ENGINE,
    depositRate = DEFAULT_DEPOSIT_RATE,
  }: {
    now?: Date;
    engine?: EngineOptions;
    /** Yearly net deposit rate for the "Mevduat" comparison (own portfolios). */
    depositRate?: number;
  } = {},
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
  const live = await loadQuotes(db, [...assetIds, ...fxIds]);

  const lastTwo = (id: string) => {
    const list = recent[id] ?? [];
    const latest = list[list.length - 1];
    if (!latest) return null;
    if (latest.date !== today) return { now: latest.close, prev: latest.close };
    const q = live.get(id);
    if (q && q.prevClose !== null && trDay(q.time) === today) {
      return { now: latest.close, prev: q.prevClose };
    }
    return { now: latest.close, prev: (list.length > 1 ? list[list.length - 2] : latest).close };
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
    const wanted = BENCHMARKS.flatMap((b) => {
      const id = benchmarkAssetId(portfolio.kind, b.key);
      return id ? [{ ...b, id }] : [];
    });
    const benchAssets = await getAssets(
      db,
      wanted.map((w) => w.id),
    );
    const fxFor = (currency: string) => fxAssetId(portfolio.kind, currency);
    const extraFx = [
      ...new Set(
        [...benchAssets.values()].filter((a) => a.currency !== 'TRY').map((a) => fxFor(a.currency)),
      ),
    ];
    const closes = await loadCloses(db, [...wanted.map((w) => w.id), ...extraFx], dates[0]);
    /** Daily values on the portfolio's days, carrying the last close (first one before it). */
    const align = (byDay: Record<string, number>) => {
      const known = Object.keys(byDay).sort();
      if (known.length === 0) return null;
      let last = byDay[known[0]];
      return dates.map((d) => (last = byDay[d] ?? last));
    };
    for (const w of wanted) {
      if (w.key === 'deposit' && portfolio.kind !== 'demo') continue;
      const prices = align(closes[w.id] ?? {});
      if (!prices) continue;
      const currency = benchAssets.get(w.id)?.currency ?? 'TRY';
      if (currency !== 'TRY') {
        // A USD index is what a TRY saver would have had: converted at each day's rate.
        const fx = align(closes[fxFor(currency)] ?? {});
        if (!fx) continue;
        benchmarks.push({ key: w.key, name: w.name, prices: prices.map((p, i) => p * fx[i]) });
      } else {
        benchmarks.push({ key: w.key, name: w.name, prices });
      }
    }
    if (portfolio.kind !== 'demo') {
      const def = BENCHMARKS.find((b) => b.key === 'deposit');
      if (def)
        benchmarks.push({
          key: def.key,
          name: def.name,
          prices: depositPrices(dates, depositRate),
        });
    }
  }

  const quoteInfo: PortfolioData['quoteInfo'] = {};
  for (const [id, q] of live) {
    quoteInfo[id] = {
      time: q.time,
      source: q.source,
      delayMinutes: q.delayMinutes,
      endOfDay: q.endOfDay,
    };
  }

  return {
    portfolio,
    txns,
    assets,
    quotes,
    quoteInfo,
    sparks,
    series: points,
    benchmarks,
    today,
    engine,
  };
}

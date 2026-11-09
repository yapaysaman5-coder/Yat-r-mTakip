import { reconcileAutoRecords, trDay, trDayStart } from '@/domain';

import { BENCHMARKS, benchmarkAssetId } from '../benchmarks';
import type { SqlDriver, SqlExecutor } from '../db/driver';
import { DEFAULT_ENGINE, fxAssetId } from '../engine';
import { deleteUnusedAssets, upsertAssets } from '../repo/assets';
import { deletePortfolio, insertPortfolio, listPortfolios } from '../repo/portfolios';
import { deleteCloses, upsertCloses } from '../repo/prices';
import { insertTransactions } from '../repo/transactions';
import type { Portfolio, StoredAsset } from '../types';
import { demoBenchmarks } from './benchmarks';
import { demoTransactions } from './history';
import { DEMO_ASSET_DEFS, demoMarket } from './market';

/**
 * The example portfolio (docs/04-YOL-HARITASI.md, Faz 3): written into the database like any
 * other portfolio, with its own fictional prices under "demo:" ids so it never mixes with
 * real market data. It can be removed or recreated at any time from Ayarlar › Veri.
 */

export const DEMO_PORTFOLIO_ID = 'demo';
export const DEMO_NAME = 'Örnek Portföy';

const BENCHMARK_ASSET: Record<string, Omit<StoredAsset, 'id'>> = {
  gold: { symbol: 'GAU', name: 'Gram Altın', market: 'COMMODITY', currency: 'TRY' },
  btc: { symbol: 'BTC/TL', name: 'Bitcoin', market: 'CRYPTO', currency: 'TRY' },
  deposit: { symbol: 'MEVDUAT', name: 'Mevduat', market: 'CUSTOM', currency: 'TRY' },
  cpi: { symbol: 'TÜFE', name: 'TÜFE', market: 'CUSTOM', currency: 'TRY' },
  ndx: { symbol: 'NDX', name: 'Nasdaq 100', market: 'INDEX', currency: 'TRY' },
  spx: { symbol: 'SPX', name: 'S&P 500', market: 'INDEX', currency: 'TRY' },
  xu030: { symbol: 'XU030', name: 'BIST 30', market: 'INDEX', currency: 'TRY' },
  xu100: { symbol: 'XU100', name: 'BIST 100', market: 'INDEX', currency: 'TRY' },
  silver: { symbol: 'XAG', name: 'Gram Gümüş', market: 'COMMODITY', currency: 'TRY' },
  eur: { symbol: 'EUR/TL', name: 'Euro/TL', market: 'FX', currency: 'TRY' },
  rut: { symbol: 'RUT', name: 'Russell 2000', market: 'INDEX', currency: 'TRY' },
  usd: { symbol: 'USD/TL', name: 'Dolar/TL', market: 'FX', currency: 'TRY' },
};

export interface SeedOptions {
  now: Date;
  id?: string;
  name?: string;
  sortOrder?: number;
}

/**
 * The example's fictional assets and daily closes ending on `end`. Deterministic: the same
 * end day always gives the same prices (a restored backup gets exactly the same market).
 */
export function demoPrices(end: string): {
  assets: StoredAsset[];
  closes: [string, string, number][];
} {
  const market = demoMarket(end);
  // Benchmarks are tilted to the generated history's cash flows (not to later edits).
  const generated = demoTransactions(market, new Date(trDayStart(end) + 86_399_000));
  const dayIndex = new Map(market.dates.map((d, i) => [d, i]));
  const flows = new Map<number, number>();
  for (const t of reconcileAutoRecords(generated, DEFAULT_ENGINE)) {
    const sign = t.type === 'DEPOSIT' ? 1 : t.type === 'WITHDRAW' ? -1 : 0;
    if (!sign) continue;
    const i = dayIndex.get(trDay(t.ts))!;
    flows.set(i, (flows.get(i) ?? 0) + sign * Number(t.amount));
  }
  const bench = demoBenchmarks(market, flows);

  const assets: StoredAsset[] = [
    ...DEMO_ASSET_DEFS.map((d) => d.asset),
    ...BENCHMARKS.map((b) => ({ id: benchmarkAssetId('demo', b.key)!, ...BENCHMARK_ASSET[b.key] })),
  ];
  const closes: [string, string, number][] = [];
  for (const d of DEMO_ASSET_DEFS) {
    market.closes[d.asset.symbol].forEach((c, i) => closes.push([d.asset.id, market.dates[i], c]));
  }
  const usd = fxAssetId('demo', 'USD');
  for (const b of BENCHMARKS) {
    const assetId = benchmarkAssetId('demo', b.key)!;
    if (assetId === usd) continue; // the rate itself, written below
    bench[b.key].forEach((c, i) => closes.push([assetId, market.dates[i], c]));
  }
  market.usdtry.forEach((c, i) => closes.push([usd, market.dates[i], c]));
  return { assets, closes };
}

/** Writes the example's prices for `end` (replacing any earlier example prices). */
export async function writeDemoPrices(tx: SqlExecutor, end: string, stamp: string): Promise<void> {
  const { assets, closes } = demoPrices(end);
  await upsertAssets(tx, assets, stamp);
  await deleteCloses(tx, 'demo:');
  await upsertCloses(tx, closes);
}

/** Writes (or rewrites) the example portfolio ending today. */
export async function seedDemo(db: SqlDriver, opts: SeedOptions): Promise<Portfolio> {
  const { now, id = DEMO_PORTFOLIO_ID, name = DEMO_NAME, sortOrder = 1 } = opts;
  const end = trDay(now);
  const txns = demoTransactions(demoMarket(end), now);
  const portfolio: Portfolio = {
    id,
    name,
    kind: 'demo',
    sortOrder,
    demoEnd: end,
    seriesDirtyFrom: null,
    createdAt: now.toISOString(),
  };
  const stamp = now.toISOString();
  await db.transaction(async (tx) => {
    await deletePortfolio(tx, id);
    await insertPortfolio(tx, portfolio);
    await writeDemoPrices(tx, end, stamp);
    await insertTransactions(tx, id, txns, stamp);
  });
  return portfolio;
}

/** Removes every example portfolio and its fictional prices. */
export async function removeDemo(db: SqlDriver): Promise<void> {
  await db.transaction(async (tx) => {
    for (const p of await listPortfolios(tx))
      if (p.kind === 'demo') await deletePortfolio(tx, p.id);
    await deleteCloses(tx, 'demo:');
    await deleteUnusedAssets(tx, 'demo:');
  });
}

import { addDays, trDay } from '@/domain';

import type { SqlExecutor } from '../db/driver';
import { fxAssetId } from '../engine';
import { loadSplits } from '../repo/market';
import { loadCloses } from '../repo/prices';
import type { PortfolioView } from '../view/portfolioView';

/**
 * Daily prices of every asset a portfolio has held, on one calendar grid, for the science
 * features (behaviour, risk, factors). Closes are carried over weekends and holidays.
 */
export interface AssetPrices {
  assetId: string;
  currency: string;
  /** As traded, in the asset's currency; null before the first known close. */
  local: (number | null)[];
  /** Split-adjusted to today's units (for returns across a split). */
  adjusted: (number | null)[];
  /** TRY per unit of the asset's currency (1 for TRY assets). */
  fx: (number | null)[];
}

export interface AssetHistory {
  dates: string[];
  assets: Map<string, AssetPrices>;
  /** Splits per asset (date, new units per old unit), from records and from the source. */
  splits: Map<string, { date: string; ratio: number }[]>;
}

export async function loadAssetHistory(
  db: SqlExecutor,
  view: PortfolioView,
  { from }: { from?: string } = {},
): Promise<AssetHistory> {
  const ids = [...view.data.assets.keys()];
  const start = from ?? view.series.dates[0] ?? view.today;
  const dates: string[] = [];
  for (let d = start; d <= view.today; d = addDays(d, 1)) dates.push(d);

  const currencies = [
    ...new Set([...view.data.assets.values()].map((a) => a.currency).filter((c) => c !== 'TRY')),
  ];
  const fxIds = new Map(currencies.map((c) => [c, fxAssetId(view.portfolio.kind, c)]));
  const closes = await loadCloses(db, [...ids, ...fxIds.values()], start);

  const splits = new Map<string, { date: string; ratio: number }[]>();
  const addSplit = (assetId: string, date: string, ratio: number) => {
    if (!(ratio > 0) || ratio === 1) return;
    const list = splits.get(assetId) ?? [];
    if (!list.some((s) => s.date === date)) list.push({ date, ratio });
    splits.set(assetId, list);
  };
  for (const t of view.data.txns) {
    if (t.type === 'SPLIT' && t.assetId && t.splitRatio)
      addSplit(t.assetId, trDay(t.ts), Number(t.splitRatio));
  }
  for (const s of await loadSplits(db, ids)) addSplit(s.assetId, s.date, Number(s.ratio));
  for (const list of splits.values()) list.sort((a, b) => (a.date < b.date ? -1 : 1));

  const carry = (byDay: Record<string, number> | undefined) => {
    const known = Object.keys(byDay ?? {}).sort();
    let k = 0;
    let last: number | null = null;
    return dates.map((d) => {
      while (k < known.length && known[k] <= d) last = byDay![known[k++]];
      return last;
    });
  };

  const assets = new Map<string, AssetPrices>();
  for (const id of ids) {
    const asset = view.data.assets.get(id)!;
    const local = carry(closes[id]);
    const assetSplits = splits.get(id) ?? [];
    // Before a split, one old unit is `ratio` of today's units: divide the old price by it.
    const adjusted = local.map((p, i) => {
      if (p === null) return null;
      const factor = assetSplits.filter((s) => s.date > dates[i]).reduce((f, s) => f * s.ratio, 1);
      return p / factor;
    });
    const fx =
      asset.currency === 'TRY' ? dates.map(() => 1) : carry(closes[fxIds.get(asset.currency)!]);
    assets.set(id, { assetId: id, currency: asset.currency, local, adjusted, fx });
  }
  return { dates, assets, splits };
}

/** Daily returns in TRY of an asset's split-adjusted price (null where a day is unknown). */
export function tryReturns(a: AssetPrices): (number | null)[] {
  return a.adjusted.map((p, i) => {
    if (i === 0) return null;
    const prev = a.adjusted[i - 1];
    const fx = a.fx[i];
    const fxPrev = a.fx[i - 1];
    if (p === null || prev === null || fx === null || fxPrev === null || prev <= 0 || fxPrev <= 0) {
      return null;
    }
    return (p * fx) / (prev * fxPrev) - 1;
  });
}

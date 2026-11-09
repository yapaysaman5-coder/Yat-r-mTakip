import { dec, ONE, ZERO, type Dec } from './decimal';
import { applyTransaction, createLedger } from './ledger';
import { sortTransactions, trDay } from './order';
import type { Asset, CostMethod, Currency, Transaction } from './types';

/**
 * Daily portfolio value series (docs/02-HESAPLAMA-MOTORU.md §7).
 * Days are Istanbul calendar days (yyyy-mm-dd); a day includes every transaction up to
 * its end. Missing prices (weekends, holidays) carry the last close forward.
 */

/** Daily closes in the asset's currency, per asset: { assetId: { 'yyyy-mm-dd': close } }. */
export type PriceHistory = Readonly<Record<string, Readonly<Record<string, number | string>>>>;
/** Daily TRY value of 1 unit of a currency: { USD: { 'yyyy-mm-dd': 42.5 } }. */
export type FxHistory = Readonly<
  Partial<Record<Currency, Readonly<Record<string, number | string>>>>
>;

/** A split / bonus issue reported by the data source (its prices are adjusted for it). */
export interface SplitEvent {
  assetId: string;
  /** First trading day after the split (ex-date), yyyy-mm-dd. */
  date: string;
  /** Units after ÷ units before. */
  ratio: string;
}

export interface SeriesPoint {
  date: string;
  /** Positions at market value + cash, TRY. */
  value: number;
  cash: number;
  /** Deposits − withdrawals up to and including this day. */
  netInvested: number;
  /** External money in (+) or out (−) on this day. */
  flow: number;
}

export interface SeriesOptions {
  /** Last day to include (default: the last transaction's day). */
  to?: string;
  /** First day to include (default: the first transaction's day). */
  from?: string;
  method?: CostMethod;
  /** Splits the price source has already adjusted its history for. */
  providerSplits?: readonly SplitEvent[];
}

export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

export function buildDailySeries(
  txns: readonly Transaction[],
  assets: ReadonlyMap<string, Asset>,
  prices: PriceHistory,
  fx: FxHistory,
  options: SeriesOptions = {},
): SeriesPoint[] {
  const sorted = sortTransactions(txns);
  if (sorted.length === 0 && !options.from) return [];
  const first = options.from ?? trDay(sorted[0].ts);
  const last = options.to ?? (sorted.length ? trDay(sorted[sorted.length - 1].ts) : first);
  if (last < first) return [];

  const state = createLedger(options.method ?? 'average');
  const lastClose = new Map<string, Dec>();
  const lastFx = new Map<Currency, Dec>();
  const splitsByAsset = new Map<string, SplitEvent[]>();
  for (const s of options.providerSplits ?? []) {
    splitsByAsset.set(s.assetId, [...(splitsByAsset.get(s.assetId) ?? []), s]);
  }

  /**
   * Source prices before a split are divided by the split ratio, while the user's unit count
   * only grows on the split date. Multiply by the splits still ahead to compare like with like.
   */
  const splitFactor = (assetId: string, day: string): Dec => {
    let f = ONE;
    for (const s of splitsByAsset.get(assetId) ?? []) if (s.date > day) f = f.times(dec(s.ratio));
    return f;
  };

  let i = 0;
  let netInvested = ZERO;
  const out: SeriesPoint[] = [];
  // Seed closes from history before `first` so the first point is valued correctly.
  for (const day of daysBetween(first, last)) {
    let flow = ZERO;
    while (i < sorted.length && trDay(sorted[i].ts) <= day) {
      const t = sorted[i];
      applyTransaction(state, t);
      if (t.type === 'DEPOSIT') flow = flow.plus(dec(t.amount));
      if (t.type === 'WITHDRAW') flow = flow.minus(dec(t.amount));
      // Trades give a price (and rate) to fall back on until a close is known.
      if ((t.type === 'BUY' || t.type === 'SELL') && t.assetId && !lastClose.has(t.assetId)) {
        lastClose.set(t.assetId, dec(t.price).div(splitFactor(t.assetId, day)));
      }
      const cur = t.assetId ? assets.get(t.assetId)?.currency : undefined;
      if (cur && cur !== 'TRY' && t.fxRate && !lastFx.has(cur)) lastFx.set(cur, dec(t.fxRate));
      i++;
    }
    for (const [assetId, closes] of Object.entries(prices)) {
      const c = closes[day];
      if (c !== undefined) lastClose.set(assetId, dec(c));
    }
    for (const [cur, rates] of Object.entries(fx) as [
      Currency,
      Record<string, number | string>,
    ][]) {
      const r = rates?.[day];
      if (r !== undefined) lastFx.set(cur, dec(r));
    }
    netInvested = netInvested.plus(flow);

    let positions = ZERO;
    for (const p of state.positions.values()) {
      if (!p.quantity.gt(0)) continue;
      const asset = assets.get(p.assetId);
      const close = lastClose.get(p.assetId) ?? p.lastTradePrice;
      const rate =
        !asset || asset.currency === 'TRY' ? ONE : (lastFx.get(asset.currency) ?? p.lastTradeFx);
      positions = positions.plus(
        p.quantity.times(close).times(splitFactor(p.assetId, day)).times(rate),
      );
    }

    out.push({
      date: day,
      value: positions.plus(state.cash).toNumber(),
      cash: state.cash.toNumber(),
      netInvested: netInvested.toNumber(),
      flow: flow.toNumber(),
    });
  }
  return out;
}

/**
 * Re-expresses a TRY series in another currency (doc §3, T14). Values use that day's rate;
 * each flow is converted at the rate of its own day, so net invested in USD is the sum of
 * the converted flows (not today's TRY total divided by today's rate).
 */
export function convertSeries(
  points: readonly SeriesPoint[],
  rates: Readonly<Record<string, number | string>>,
): SeriesPoint[] {
  let last: number | undefined;
  let netInvested = 0;
  return points.map((p) => {
    const r = rates[p.date];
    if (r !== undefined) last = Number(r);
    const rate = last ?? Number.NaN;
    const flow = p.flow / rate;
    netInvested += flow;
    return { date: p.date, value: p.value / rate, cash: p.cash / rate, netInvested, flow };
  });
}

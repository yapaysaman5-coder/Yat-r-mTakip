import { addDays, trDay, type Currency } from '@/domain';

import { BENCHMARKS, benchmarkAssetId } from '../benchmarks';
import type { SqlDriver, SqlExecutor } from '../db/driver';
import {
  fxInstrumentId,
  instrumentFor,
  providerSymbolOf,
  type Instrument,
} from '../market/instruments';
import type { MarketRouter, Quote, QuoteResult } from '../market/router';
import { getAssets, upsertAssets } from '../repo/assets';
import {
  loadQuotes,
  loadSyncStates,
  loadWatchlist,
  saveSyncState,
  upsertQuotes,
  upsertSplits,
  type SyncState,
} from '../repo/market';
import { listPortfolios, markSeriesDirty } from '../repo/portfolios';
import { upsertCloses } from '../repo/prices';

/**
 * Keeps the stored prices current (docs/03-TEKNIK-MIMARI.md §6–7):
 * - which instruments the app needs, and from which day,
 * - downloading missing daily history (only the missing part),
 * - storing live quotes; a live price is also that day's close, so the daily value cache,
 *   the charts and "today" all read one set of prices.
 * Every price change marks the affected portfolios' cached values stale from that day.
 * The example portfolio has its own fictional prices and is never touched here.
 */

export interface MarketNeeds {
  instruments: Map<string, Instrument>;
  /** Instrument id → first day history is needed for. */
  historyFrom: Map<string, string>;
  /** Instruments to keep live (held assets, their currencies, the watchlist). */
  live: string[];
}

/** Days of history kept for watchlist items (30-day change, mini charts). */
const WATCH_DAYS = 40;
/**
 * Risk and factor analyses look back from today, before the first record: a year (and a bit)
 * for every traded asset, three years for US stocks (Fama–French regression).
 */
export const RISK_LOOKBACK_DAYS = 400;
export const FACTOR_LOOKBACK_DAYS = 1100;
/** Recent closes are fetched again after this long (late corrections, missed days). */
const REFRESH_MS = 6 * 3_600_000;
/** After a failure, history is tried again after this long. */
const RETRY_MS = 10 * 60_000;

export async function marketNeeds(db: SqlExecutor, now: Date): Promise<MarketNeeds> {
  const today = trDay(now);
  const instruments = new Map<string, Instrument>();
  const historyFrom = new Map<string, string>();
  const live = new Set<string>();
  const need = (id: string, from: string, isLive: boolean, name?: string) => {
    const inst = instruments.get(id) ?? instrumentFor(id, name);
    if (!inst) return;
    instruments.set(id, inst);
    const prev = historyFrom.get(id);
    if (!prev || from < prev) historyFrom.set(id, from);
    if (isLive) live.add(id);
  };

  const users = new Set(
    (await listPortfolios(db)).filter((p) => p.kind === 'user').map((p) => p.id),
  );
  const rows = (
    await db.all<{ portfolio_id: string; asset_id: string | null; first: string }>(
      'SELECT portfolio_id, asset_id, MIN(ts) AS first FROM txn GROUP BY portfolio_id, asset_id',
    )
  ).filter((r) => users.has(r.portfolio_id));
  const assets = await getAssets(db, [
    ...new Set(rows.flatMap((r) => (r.asset_id ? [r.asset_id] : []))),
  ]);

  let portfoliosStart: string | null = null;
  for (const r of rows) {
    const day = trDay(r.first);
    if (!portfoliosStart || day < portfoliosStart) portfoliosStart = day;
    if (!r.asset_id) continue;
    const asset = assets.get(r.asset_id);
    const back = addDays(
      today,
      -(asset?.market === 'US' ? FACTOR_LOOKBACK_DAYS : RISK_LOOKBACK_DAYS),
    );
    const from = back < day ? back : day;
    need(r.asset_id, from, true, asset?.name);
    if (asset && asset.currency !== 'TRY') need(fxInstrumentId(asset.currency), from, true);
  }
  // "Ya Olsaydı?" compares from the first record on; USD series also need USD/TRY.
  if (portfoliosStart) {
    for (const b of BENCHMARKS) {
      const id = benchmarkAssetId('user', b.key);
      if (!id) continue;
      need(id, portfoliosStart, false);
      const inst = instruments.get(id);
      if (inst && inst.currency !== 'TRY')
        need(fxInstrumentId(inst.currency), portfoliosStart, false);
    }
  }
  for (const id of await loadWatchlist(db)) need(id, addDays(today, -WATCH_DAYS), true);
  return { instruments, historyFrom, live: [...live] };
}

/** Marks the user portfolios whose value depends on these prices (day by asset). */
async function markDirty(tx: SqlExecutor, changed: Map<string, string>): Promise<void> {
  if (changed.size === 0) return;
  const rows = await tx.all<{ portfolio_id: string; asset_id: string; currency: string | null }>(
    `SELECT DISTINCT t.portfolio_id, t.asset_id, a.currency
     FROM txn t JOIN portfolio p ON p.id = t.portfolio_id LEFT JOIN asset a ON a.id = t.asset_id
     WHERE p.kind = 'user' AND t.asset_id IS NOT NULL`,
  );
  const earliest = new Map<string, string>();
  for (const r of rows) {
    const days = [changed.get(r.asset_id)];
    if (r.currency && r.currency !== 'TRY')
      days.push(changed.get(fxInstrumentId(r.currency as Currency)));
    for (const d of days) {
      if (!d) continue;
      const prev = earliest.get(r.portfolio_id);
      if (!prev || d < prev) earliest.set(r.portfolio_id, d);
    }
  }
  for (const [id, day] of earliest) await markSeriesDirty(tx, id, day);
}

async function storeInstrument(tx: SqlExecutor, inst: Instrument, stamp: string) {
  await upsertAssets(
    tx,
    [
      {
        id: inst.id,
        symbol: inst.symbol,
        name: inst.name,
        market: inst.market,
        currency: inst.currency,
        providerSymbol: providerSymbolOf(inst),
      },
    ],
    stamp,
  );
}

export interface SyncReport {
  synced: string[];
  failed: Map<string, string>;
  skipped: number;
}

/**
 * Downloads the daily closes each instrument is missing: older days when an earlier record
 * appears, and the last few days when the stored history is older than a few hours.
 */
export async function syncHistory(
  db: SqlDriver,
  router: MarketRouter,
  needs: MarketNeeds,
  { now = new Date() }: { now?: Date } = {},
): Promise<SyncReport> {
  const today = trDay(now);
  const t = now.getTime();
  const states = await loadSyncStates(db);
  const report: SyncReport = { synced: [], failed: new Map(), skipped: 0 };

  for (const [id, from] of needs.historyFrom) {
    const inst = needs.instruments.get(id)!;
    const s = states.get(id);
    const ranges: [string, string][] = [];
    if (!s?.firstDate || !s.lastDate) {
      if (s?.error && t - s.syncedAt < RETRY_MS) {
        report.skipped++;
        continue;
      }
      ranges.push([from, today]);
    } else {
      if (from < s.firstDate) ranges.push([from, addDays(s.firstDate, -1)]);
      const stale = t - s.syncedAt > (s.error ? RETRY_MS : REFRESH_MS) || s.lastDate < today;
      if (stale) {
        const back = inst.refreshDays ?? 5;
        ranges.push([addDays(s.lastDate < today ? s.lastDate : today, -back), today]);
      }
    }
    if (ranges.length === 0) {
      report.skipped++;
      continue;
    }

    try {
      const changed = new Map<string, string>();
      let source = s?.source ?? null;
      const rows: [string, string, number][] = [];
      const splits: { date: string; ratio: string }[] = [];
      for (const [a, b] of ranges) {
        const h = await router.history(inst, a, b);
        source = h.source;
        for (const c of h.closes) if (c.date >= a && c.date <= b) rows.push([id, c.date, c.close]);
        splits.push(...h.splits);
      }
      const first = rows.reduce<string | null>((m, r) => (!m || r[1] < m ? r[1] : m), null);
      if (first) changed.set(id, first);
      const state: SyncState = {
        assetId: id,
        firstDate: s?.firstDate && s.firstDate < from ? s.firstDate : from,
        lastDate: today,
        source,
        syncedAt: t,
        error: null,
      };
      await db.transaction(async (tx) => {
        await storeInstrument(tx, inst, now.toISOString());
        await upsertCloses(tx, rows);
        if (splits.length && source) await upsertSplits(tx, id, splits, source);
        await saveSyncState(tx, state);
        await markDirty(tx, changed);
      });
      report.synced.push(id);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      report.failed.set(id, message);
      await saveSyncState(db, {
        assetId: id,
        firstDate: s?.firstDate ?? null,
        lastDate: s?.lastDate ?? null,
        source: s?.source ?? null,
        syncedAt: t,
        error: message,
      });
    }
  }
  return report;
}

/** Fetches live quotes and stores them (quote table + that day's close). */
export async function refreshQuotes(
  db: SqlDriver,
  router: MarketRouter,
  instruments: readonly Instrument[],
  { now = new Date() }: { now?: Date } = {},
): Promise<QuoteResult> {
  const result = await router.quotes(instruments);
  if (result.quotes.size === 0) return result;
  await storeQuotes(db, instruments, result.quotes, now);
  return result;
}

/**
 * Prices from the live crypto stream (instrument id → last price and its time). The day's
 * reference price (prevClose) is kept from the stored quote, since the stream's own open is a
 * rolling 24-hour one.
 */
export async function storeStreamPrices(
  db: SqlDriver,
  instruments: readonly Instrument[],
  prices: ReadonlyMap<string, { price: number; time: number }>,
  { now = new Date() }: { now?: Date } = {},
): Promise<void> {
  if (prices.size === 0) return;
  const stored = await loadQuotes(db, [...prices.keys()]);
  const quotes = new Map<string, Quote>();
  for (const [id, p] of prices) {
    const prev = stored.get(id);
    // A stored quote from an earlier day has yesterday's reference: its price is the best
    // "start of today" we have until the next poll.
    const sameDay = prev && trDay(prev.time) === trDay(p.time || now.getTime());
    quotes.set(id, {
      price: p.price,
      prevClose: prev ? (sameDay ? prev.prevClose : prev.price) : null,
      time: p.time,
      source: 'binance',
      delayMinutes: 0,
    });
  }
  await storeQuotes(db, instruments, quotes, now);
}

async function storeQuotes(
  db: SqlDriver,
  instruments: readonly Instrument[],
  quotes: ReadonlyMap<string, Quote>,
  now: Date,
): Promise<void> {
  const fetchedAt = now.getTime();
  const byId = new Map(instruments.map((i) => [i.id, i]));
  await db.transaction(async (tx) => {
    const changed = new Map<string, string>();
    const closes: [string, string, number][] = [];
    for (const [id, q] of quotes) {
      const inst = byId.get(id);
      if (inst) await storeInstrument(tx, inst, now.toISOString());
      // A price is that day's close so far; never a day in the future.
      const day = trDay(Math.min(q.time || fetchedAt, fetchedAt));
      closes.push([id, day, q.price]);
      changed.set(id, day);
    }
    await upsertQuotes(
      tx,
      [...quotes].map(([assetId, q]) => ({
        assetId,
        price: q.price,
        prevClose: q.prevClose,
        time: q.time || fetchedAt,
        source: q.source,
        delayMinutes: q.delayMinutes,
        endOfDay: !!q.endOfDay,
        fetchedAt,
      })),
    );
    await upsertCloses(tx, closes);
    await markDirty(tx, changed);
  });
}

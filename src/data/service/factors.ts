import { addDays, trDay } from '@/domain';

import type { SqlExecutor } from '../db/driver';
import {
  FACTOR_KEYS,
  frenchFactors,
  type FactorKey,
  type FactorRow,
  type FetchBytes,
} from '../market/providers/french';
import { loadSyncStates, saveSyncState } from '../repo/market';
import { deleteCloses, loadCloses, upsertCloses } from '../repo/prices';
import type { AssetHistory } from './assetHistory';

/**
 * Fama–French factor returns kept in the price table under FACTOR:* ids (decimal daily
 * returns, not prices). The library is updated monthly, so a weekly check is plenty.
 */
export const FACTOR_SYNC_ID = 'FACTOR:FF';
const ID = (k: FactorKey | 'RF') => `FACTOR:${k}`;
const COLUMNS = [...FACTOR_KEYS, 'RF'] as const;
/** Years of factor history kept on the phone. */
export const FACTOR_YEARS = 5;
const REFRESH_MS = 7 * 86_400_000;
const RETRY_MS = 6 * 3_600_000;

export async function storeFactors(db: SqlExecutor, rows: readonly FactorRow[]): Promise<void> {
  const out: [string, string, number][] = [];
  for (const r of rows) {
    for (const k of FACTOR_KEYS) out.push([ID(k), r.date, r.values[k]]);
    out.push([ID('RF'), r.date, r.rf]);
  }
  await upsertCloses(db, out);
}

export async function loadFactors(db: SqlExecutor, from?: string): Promise<FactorRow[]> {
  const closes = await loadCloses(
    db,
    COLUMNS.map((k) => ID(k)),
    from,
  );
  const dates = Object.keys(closes[ID('Mkt-RF')] ?? {})
    .filter((d) => !from || d >= from)
    .sort();
  const rows: FactorRow[] = [];
  for (const date of dates) {
    const v = Object.fromEntries(FACTOR_KEYS.map((k) => [k, closes[ID(k)][date]])) as Record<
      FactorKey,
      number
    >;
    const rf = closes[ID('RF')][date];
    if (rf === undefined || FACTOR_KEYS.some((k) => v[k] === undefined)) continue;
    rows.push({ date, values: v, rf });
  }
  return rows;
}

export interface FactorSyncResult {
  status: 'fresh' | 'synced' | 'failed';
  lastDate: string | null;
  error?: string;
}

export async function syncFactors(
  db: SqlExecutor,
  get: FetchBytes,
  { now = new Date(), force = false }: { now?: Date; force?: boolean } = {},
): Promise<FactorSyncResult> {
  const state = (await loadSyncStates(db)).get(FACTOR_SYNC_ID);
  const t = now.getTime();
  if (
    !force &&
    state &&
    t - state.syncedAt < (state.error ? RETRY_MS : REFRESH_MS) &&
    (state.lastDate || state.error)
  ) {
    return { status: 'fresh', lastDate: state.lastDate, error: state.error ?? undefined };
  }
  const from = addDays(trDay(now), -Math.round(FACTOR_YEARS * 365.25));
  try {
    const rows = await frenchFactors(get, from);
    if (rows.length === 0) throw new Error('Faktör verisi boş');
    await deleteCloses(db, 'FACTOR:');
    await storeFactors(db, rows);
    const lastDate = rows[rows.length - 1].date;
    await saveSyncState(db, {
      assetId: FACTOR_SYNC_ID,
      firstDate: rows[0].date,
      lastDate,
      source: 'french',
      syncedAt: t,
      error: null,
    });
    return { status: 'synced', lastDate };
  } catch (e) {
    const error = (e as Error).message;
    await saveSyncState(db, {
      assetId: FACTOR_SYNC_ID,
      firstDate: state?.firstDate ?? null,
      lastDate: state?.lastDate ?? null,
      source: 'french',
      syncedAt: t,
      error,
    });
    return { status: 'failed', lastDate: state?.lastDate ?? null, error };
  }
}

/**
 * Fictional factor returns for the example portfolio and the web preview, whose prices are
 * fictional too: the market factor follows the US positions' own average move, the value
 * factor leans against the most volatile one, the rest is noise. Deterministic.
 */
export function demoFactors(history: AssetHistory, usAssetIds: readonly string[]): FactorRow[] {
  let seed = 977;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const noise = (sd: number) => (rand() + rand() + rand() - 1.5) * 2 * sd;
  const series = usAssetIds
    .map((id) => history.assets.get(id)?.adjusted)
    .filter((x): x is (number | null)[] => !!x);
  const rows: FactorRow[] = [];
  for (let i = 1; i < history.dates.length; i++) {
    const date = history.dates[i];
    const wd = new Date(`${date}T12:00:00Z`).getUTCDay();
    if (wd === 0 || wd === 6) continue;
    const r = series.map((p) => (p[i] !== null && p[i - 1] ? p[i]! / p[i - 1]! - 1 : 0));
    const avg = r.length ? r.reduce((a, b) => a + b, 0) / r.length : 0;
    const spread = r.length > 1 ? r[r.length - 1] - r[0] : 0;
    const rf = 0.00017;
    rows.push({
      date,
      rf,
      values: {
        'Mkt-RF': 0.8 * avg + noise(0.004) - rf,
        SMB: noise(0.005),
        HML: -0.25 * spread + noise(0.004),
        RMW: noise(0.003),
        CMA: noise(0.003),
        MOM: noise(0.006),
      },
    });
  }
  return rows;
}

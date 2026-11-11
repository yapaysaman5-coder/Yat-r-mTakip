import { strFromU8, unzipSync } from 'fflate';

import { MarketError } from '../types';

/**
 * Fama–French five factors and momentum, daily, from Kenneth R. French's data library at
 * Dartmouth (free, public, updated about once a month). Each file is a zip with one CSV.
 */
export const FACTOR_KEYS = ['Mkt-RF', 'SMB', 'HML', 'RMW', 'CMA', 'MOM'] as const;
export type FactorKey = (typeof FACTOR_KEYS)[number];

export interface FactorRow {
  date: string;
  values: Record<FactorKey, number>;
  rf: number;
}

const toDay = (yyyymmdd: string) =>
  `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;

/** Reads a French library daily CSV (percent values) into decimals by date. */
export function parseFrenchCsv(text: string): { header: string[]; rows: Map<string, number[]> } {
  const lines = text.split(/\r?\n/);
  const h = lines.findIndex((l) => /^\s*,/.test(l));
  if (h < 0) throw new Error('Faktör dosyası: başlık yok');
  const header = lines[h]
    .split(',')
    .slice(1)
    .map((s) => s.trim());
  const rows = new Map<string, number[]>();
  for (let i = h + 1; i < lines.length; i++) {
    const cells = lines[i].split(',').map((s) => s.trim());
    if (!/^\d{8}$/.test(cells[0] ?? '')) {
      if (rows.size > 0) break; // the daily block ended
      continue;
    }
    const v = cells.slice(1).map((c) => Number(c) / 100);
    if (v.length !== header.length || v.some((x) => !Number.isFinite(x))) continue;
    rows.set(toDay(cells[0]), v);
  }
  return { header, rows };
}

/** Joins the five-factor and momentum files on their common dates. */
export function joinFactors(fiveFactor: string, momentum: string, from?: string): FactorRow[] {
  const five = parseFrenchCsv(fiveFactor);
  const mom = parseFrenchCsv(momentum);
  const col = (name: string) => five.header.indexOf(name);
  const [mkt, smb, hml, rmw, cma, rf] = ['Mkt-RF', 'SMB', 'HML', 'RMW', 'CMA', 'RF'].map(col);
  if ([mkt, smb, hml, rmw, cma, rf].some((i) => i < 0))
    throw new Error('Faktör dosyası: sütun eksik');
  const out: FactorRow[] = [];
  for (const [date, v] of five.rows) {
    if (from && date < from) continue;
    const m = mom.rows.get(date);
    if (!m) continue;
    out.push({
      date,
      rf: v[rf],
      values: { 'Mkt-RF': v[mkt], SMB: v[smb], HML: v[hml], RMW: v[rmw], CMA: v[cma], MOM: m[0] },
    });
  }
  return out.sort((a, b) => (a.date < b.date ? -1 : 1));
}

const BASE = 'https://mba.tuck.dartmouth.edu/pages/faculty/ken.french/ftp';
export const FRENCH_FILES = {
  five: `${BASE}/F-F_Research_Data_5_Factors_2x3_daily_CSV.zip`,
  momentum: `${BASE}/F-F_Momentum_Factor_daily_CSV.zip`,
};
export const FRENCH_HOST = 'mba.tuck.dartmouth.edu';

export type FetchBytes = (url: string) => Promise<Uint8Array>;

/** fetch for binary files, with a timeout and the app's error kinds. */
export const fetchBytes: FetchBytes = async (url) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new MarketError('http', `${FRENCH_HOST} ${response.status}`, response.status);
    }
    return new Uint8Array(await response.arrayBuffer());
  } catch (e) {
    if (e instanceof MarketError) throw e;
    const aborted = controller.signal.aborted;
    throw new MarketError(
      aborted ? 'timeout' : 'network',
      aborted ? `Zaman aşımı: ${FRENCH_HOST}` : `Bağlantı yok: ${FRENCH_HOST}`,
    );
  } finally {
    clearTimeout(timer);
  }
};

/** The first CSV inside a zip, as text. */
export function unzipCsv(bytes: Uint8Array): string {
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(bytes);
  } catch {
    throw new MarketError('format', 'Faktör dosyası açılamadı');
  }
  const name = Object.keys(files).find((n) => /\.csv$/i.test(n));
  if (!name) throw new MarketError('format', 'Faktör dosyasında CSV yok');
  return strFromU8(files[name]);
}

/** Downloads both files and joins them from `from` on. */
export async function frenchFactors(get: FetchBytes, from?: string): Promise<FactorRow[]> {
  const [five, momentum] = await Promise.all([get(FRENCH_FILES.five), get(FRENCH_FILES.momentum)]);
  try {
    return joinFactors(unzipCsv(five), unzipCsv(momentum), from);
  } catch (e) {
    if (e instanceof MarketError) throw e;
    throw new MarketError('format', (e as Error).message);
  }
}

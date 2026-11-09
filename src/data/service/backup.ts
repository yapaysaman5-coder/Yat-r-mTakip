import {
  buildLedger,
  reconcileAutoRecords,
  validateTransaction,
  type Currency,
  type Market,
  type Transaction,
  type TxnType,
} from '@/domain';

import type { SqlDriver } from '../db/driver';
import { SCHEMA_VERSION } from '../db/migrations';
import { writeDemoPrices } from '../demo/seed';
import { DEFAULT_ENGINE } from '../engine';
import { listAssets, upsertAssets } from '../repo/assets';
import { deletePortfolio, insertPortfolio, listPortfolios } from '../repo/portfolios';
import { pinSources } from '../market/instruments';
import { deleteCloses } from '../repo/prices';
import { insertTransactions, listTransactions } from '../repo/transactions';
import type { Portfolio, PortfolioKind, StoredAsset } from '../types';

/**
 * Backup file (docs/03-TEKNIK-MIMARI.md §5): one JSON file with every portfolio, asset and
 * record, plus the app settings. Price history is not included: it is downloaded again (and
 * the example portfolio's fictional prices are regenerated exactly from its end day).
 * Automatic records are not included either: they are derived from the manual ones.
 */

export const BACKUP_FORMAT = 'yatirim-takip-yedek';

export interface BackupPortfolio {
  id: string;
  name: string;
  kind: PortfolioKind;
  color?: string;
  sortOrder: number;
  demoEnd?: string;
  createdAt: string;
}

export interface BackupFile {
  format: typeof BACKUP_FORMAT;
  schemaVersion: number;
  exportedAt: string;
  portfolios: BackupPortfolio[];
  assets: StoredAsset[];
  transactions: (Transaction & { portfolioId: string })[];
  settings?: Record<string, unknown>;
}

export interface BackupSummary {
  portfolios: number;
  transactions: number;
  assets: number;
  exportedAt: string;
}

export async function exportBackup(
  db: SqlDriver,
  { now = new Date(), settings }: { now?: Date; settings?: Record<string, unknown> } = {},
): Promise<BackupFile> {
  const portfolios = await listPortfolios(db);
  const transactions: BackupFile['transactions'] = [];
  for (const p of portfolios) {
    for (const t of await listTransactions(db, p.id))
      transactions.push({ portfolioId: p.id, ...t });
  }
  const used = new Set(transactions.flatMap((t) => (t.assetId ? [t.assetId] : [])));
  const assets = (await listAssets(db)).filter((a) => used.has(a.id));
  return {
    format: BACKUP_FORMAT,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    portfolios: portfolios.map((p) => {
      const out: BackupPortfolio = {
        id: p.id,
        name: p.name,
        kind: p.kind,
        sortOrder: p.sortOrder,
        createdAt: p.createdAt,
      };
      if (p.color) out.color = p.color;
      if (p.demoEnd) out.demoEnd = p.demoEnd;
      return out;
    }),
    assets,
    transactions,
    ...(settings ? { settings } : {}),
  };
}

export const backupFileName = (now = new Date()) =>
  `yatirim-takip-yedek-${now.toISOString().slice(0, 10)}.json`;

export type BackupError =
  'NOT_JSON' | 'NOT_A_BACKUP' | 'NEWER_VERSION' | 'MALFORMED' | 'INVALID_RECORDS' | 'INCONSISTENT';

export type ParsedBackup =
  | { ok: true; backup: BackupFile; summary: BackupSummary }
  | { ok: false; error: BackupError; detail?: string };

const TYPES: readonly TxnType[] = [
  'BUY',
  'SELL',
  'DEPOSIT',
  'WITHDRAW',
  'DIVIDEND',
  'FEE',
  'SPLIT',
];
const MARKETS: readonly Market[] = ['BIST', 'US', 'CRYPTO', 'FX', 'COMMODITY', 'INDEX', 'CUSTOM'];
const CURRENCIES: readonly Currency[] = ['TRY', 'USD', 'EUR'];
const TEXT_FIELDS = ['quantity', 'price', 'fee', 'fxRate', 'amount', 'tax', 'splitRatio'] as const;

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string' && v.length > 0;
const optStr = (v: unknown) => v === undefined || typeof v === 'string';

/** Checks a backup file thoroughly before anything is replaced. */
export function parseBackup(text: string): ParsedBackup {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'NOT_JSON' };
  }
  if (!isObj(raw) || raw.format !== BACKUP_FORMAT) return { ok: false, error: 'NOT_A_BACKUP' };
  if (typeof raw.schemaVersion !== 'number' || raw.schemaVersion > SCHEMA_VERSION) {
    return { ok: false, error: 'NEWER_VERSION' };
  }
  const { portfolios, assets, transactions } = raw;
  if (!Array.isArray(portfolios) || !Array.isArray(assets) || !Array.isArray(transactions)) {
    return { ok: false, error: 'MALFORMED' };
  }

  const malformed = (detail: string): ParsedBackup => ({ ok: false, error: 'MALFORMED', detail });
  const portfolioIds = new Set<string>();
  for (const p of portfolios) {
    if (!isObj(p) || !isStr(p.id) || !isStr(p.name) || (p.kind !== 'user' && p.kind !== 'demo')) {
      return malformed('portfolio');
    }
    if (p.kind === 'demo' && !(isStr(p.demoEnd) && /^\d{4}-\d{2}-\d{2}$/.test(p.demoEnd))) {
      return malformed('portfolio');
    }
    if (portfolioIds.has(p.id)) return malformed('portfolio');
    portfolioIds.add(p.id);
  }
  const assetMap = new Map<string, StoredAsset>();
  for (const a of assets) {
    if (
      !isObj(a) ||
      !isStr(a.id) ||
      !isStr(a.symbol) ||
      !MARKETS.includes(a.market as Market) ||
      !CURRENCIES.includes(a.currency as Currency) ||
      !optStr(a.name) ||
      !optStr(a.providerSymbol)
    ) {
      return malformed('asset');
    }
    assetMap.set(a.id, a as unknown as StoredAsset);
  }
  const ids = new Set<string>();
  const byPortfolio = new Map<string, Transaction[]>();
  for (const t of transactions) {
    if (
      !isObj(t) ||
      !isStr(t.id) ||
      ids.has(t.id) ||
      !isStr(t.portfolioId) ||
      !portfolioIds.has(t.portfolioId) ||
      !TYPES.includes(t.type as TxnType) ||
      !isStr(t.ts) ||
      !optStr(t.assetId) ||
      !optStr(t.note) ||
      TEXT_FIELDS.some((f) => !optStr(t[f])) ||
      (t.withdrawProceeds !== undefined && typeof t.withdrawProceeds !== 'boolean') ||
      t.isAuto
    ) {
      return malformed('transaction');
    }
    ids.add(t.id);
    const list = byPortfolio.get(t.portfolioId) ?? [];
    list.push(t as unknown as Transaction);
    byPortfolio.set(t.portfolioId, list);
  }

  // Field rules (dates from a phone with a fast clock are tolerated) and a consistent ledger.
  for (const list of byPortfolio.values()) {
    for (const t of list) {
      const issues = validateTransaction(t, { now: Number.MAX_SAFE_INTEGER, assets: assetMap });
      if (issues.length) {
        return { ok: false, error: 'INVALID_RECORDS', detail: `${t.id}: ${issues[0].code}` };
      }
    }
    const ledger = buildLedger(reconcileAutoRecords(list, DEFAULT_ENGINE), {
      method: DEFAULT_ENGINE.method,
    });
    if (ledger.issues.length) {
      return { ok: false, error: 'INCONSISTENT', detail: ledger.issues[0].txnId };
    }
  }

  const backup = raw as unknown as BackupFile;
  return {
    ok: true,
    backup,
    summary: {
      portfolios: portfolios.length,
      transactions: transactions.length,
      assets: assets.length,
      exportedAt: typeof raw.exportedAt === 'string' ? raw.exportedAt : '',
    },
  };
}

/** Replaces all data with the backup's (one transaction: all or nothing). */
export async function importBackup(
  db: SqlDriver,
  backup: BackupFile,
  { now = new Date() }: { now?: Date } = {},
): Promise<void> {
  const stamp = now.toISOString();
  await db.transaction(async (tx) => {
    for (const p of await listPortfolios(tx)) await deletePortfolio(tx, p.id);
    await deleteCloses(tx, 'demo:');
    await tx.run(
      "DELETE FROM asset WHERE id LIKE 'demo:%' AND id NOT IN (SELECT DISTINCT asset_id FROM txn WHERE asset_id IS NOT NULL)",
    );
    await upsertAssets(tx, backup.assets, stamp);
    for (const p of backup.portfolios) {
      const portfolio: Portfolio = {
        id: p.id,
        name: p.name,
        kind: p.kind,
        color: p.color,
        sortOrder: p.sortOrder ?? 0,
        demoEnd: p.demoEnd,
        seriesDirtyFrom: null,
        createdAt: p.createdAt ?? stamp,
      };
      await insertPortfolio(tx, portfolio);
      if (p.kind === 'demo' && p.demoEnd) await writeDemoPrices(tx, p.demoEnd, stamp);
      const records = backup.transactions
        .filter((t) => t.portfolioId === p.id)
        .map(({ portfolioId: _, ...t }) => t);
      await insertTransactions(tx, p.id, records, stamp);
    }
  });
  pinSources(backup.assets);
}

import type { SqlDriver } from '../db/driver';
import { newId } from '../ids';
import {
  deletePortfolio,
  insertPortfolio,
  listPortfolios,
  renamePortfolio,
} from '../repo/portfolios';
import type { Portfolio } from '../types';

/**
 * Ayarlar › Portföyler: own portfolios can be added, renamed and deleted (with their records).
 * The last own portfolio stays, so there is always somewhere to record.
 */
export type PortfolioChange =
  | { ok: true; portfolio?: Portfolio }
  | { ok: false; reason: 'EMPTY_NAME' | 'NAME_TAKEN' | 'LAST_PORTFOLIO' | 'NOT_FOUND' };

const clean = (name: string) => name.trim().replace(/\s+/g, ' ').slice(0, 40);

async function nameTaken(db: SqlDriver, name: string, except?: string) {
  const all = await listPortfolios(db);
  const key = name.toLocaleLowerCase('tr');
  return all.some((p) => p.id !== except && p.name.toLocaleLowerCase('tr') === key);
}

export async function createPortfolio(
  db: SqlDriver,
  name: string,
  { now = new Date() }: { now?: Date } = {},
): Promise<PortfolioChange> {
  const n = clean(name);
  if (!n) return { ok: false, reason: 'EMPTY_NAME' };
  if (await nameTaken(db, n)) return { ok: false, reason: 'NAME_TAKEN' };
  const all = await listPortfolios(db);
  const portfolio: Portfolio = {
    id: `p:${newId()}`,
    name: n,
    kind: 'user',
    sortOrder: Math.max(-1, ...all.map((p) => p.sortOrder)) + 1,
    seriesDirtyFrom: null,
    createdAt: now.toISOString(),
  };
  await insertPortfolio(db, portfolio);
  return { ok: true, portfolio };
}

export async function renameOwnPortfolio(
  db: SqlDriver,
  id: string,
  name: string,
): Promise<PortfolioChange> {
  const n = clean(name);
  if (!n) return { ok: false, reason: 'EMPTY_NAME' };
  const all = await listPortfolios(db);
  if (!all.some((p) => p.id === id)) return { ok: false, reason: 'NOT_FOUND' };
  if (await nameTaken(db, n, id)) return { ok: false, reason: 'NAME_TAKEN' };
  await renamePortfolio(db, id, n);
  return { ok: true };
}

export async function deleteOwnPortfolio(db: SqlDriver, id: string): Promise<PortfolioChange> {
  const all = await listPortfolios(db);
  const p = all.find((x) => x.id === id);
  if (!p) return { ok: false, reason: 'NOT_FOUND' };
  if (p.kind === 'user' && all.filter((x) => x.kind === 'user').length === 1) {
    return { ok: false, reason: 'LAST_PORTFOLIO' };
  }
  await db.transaction(async (tx) => {
    // Records and cached values go with it (also where foreign keys are not enforced).
    await tx.run('DELETE FROM txn WHERE portfolio_id = ?', [id]);
    await tx.run('DELETE FROM portfolio_snapshot WHERE portfolio_id = ?', [id]);
    await deletePortfolio(tx, id);
  });
  return { ok: true };
}

export const PORTFOLIO_REASON: Record<Exclude<PortfolioChange, { ok: true }>['reason'], string> = {
  EMPTY_NAME: 'Bir ad yaz.',
  NAME_TAKEN: 'Bu adla bir portföy zaten var.',
  LAST_PORTFOLIO: 'Son kendi portföyün silinemez; önce yenisini ekle.',
  NOT_FOUND: 'Portföy bulunamadı.',
};

/** Someone already using the app (records in an own portfolio) skips the welcome. */
export async function hasOwnRecords(db: SqlDriver): Promise<boolean> {
  const row = await db.first<{ n: number }>(
    "SELECT COUNT(*) AS n FROM txn t JOIN portfolio p ON p.id = t.portfolio_id WHERE p.kind = 'user'",
  );
  return (row?.n ?? 0) > 0;
}

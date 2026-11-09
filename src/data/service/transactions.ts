import {
  buildLedger,
  reconcileAutoRecords,
  trDay,
  validateTransaction,
  type LedgerIssue,
  type Transaction,
  type ValidationIssue,
} from '@/domain';

import type { SqlDriver, SqlExecutor } from '../db/driver';
import { DEFAULT_ENGINE, type EngineOptions } from '../engine';
import { newId } from '../ids';
import { getAssets } from '../repo/assets';
import { getPortfolio, markSeriesDirty } from '../repo/portfolios';
import * as txnRepo from '../repo/transactions';

/**
 * Adding, editing and deleting records (docs/02-HESAPLAMA-MOTORU.md §2, §4.4).
 *
 * Every change is checked against the whole history before it is written:
 * - field rules (amounts, dates, asset),
 * - no sale larger than the units held at that moment (T7), also when an older purchase is
 *   edited or deleted (T8: the change is refused and the affected sale is named),
 * - no withdrawal or fee larger than the cash at that moment.
 * Automatic records (auto deposits, proceeds withdrawals) are not stored: they are derived
 * from the manual records each time, so they always match them.
 */

export type ChangeRejection =
  | { code: 'INVALID'; issues: ValidationIssue[] }
  | { code: 'NOT_FOUND' }
  | { code: 'AUTO_RECORD' }
  | { code: 'OVERSELL'; issues: LedgerIssue[] }
  | { code: 'NEGATIVE_CASH'; issues: LedgerIssue[] };

export type ChangeResult =
  { ok: true; txn: Transaction } | { ok: false; rejection: ChangeRejection };

interface ChangeOptions {
  now?: Date;
  engine?: EngineOptions;
}

const issueKey = (i: LedgerIssue) => `${i.code}:${i.txnId}`;

/** Ledger problems that `next` has and `current` did not (or that sit on `changedId`). */
export function newLedgerIssues(
  current: readonly Transaction[],
  next: readonly Transaction[],
  engine: EngineOptions,
  changedId?: string,
): LedgerIssue[] {
  const ledger = (txns: readonly Transaction[]) =>
    buildLedger(reconcileAutoRecords(txns, engine), { method: engine.method });
  const before = new Set(ledger(current).issues.map(issueKey));
  return ledger(next).issues.filter((i) => i.txnId === changedId || !before.has(issueKey(i)));
}

function rejectionFor(issues: LedgerIssue[]): ChangeRejection | null {
  const oversell = issues.filter((i) => i.code === 'OVERSELL');
  if (oversell.length) return { code: 'OVERSELL', issues: oversell };
  const cash = issues.filter((i) => i.code === 'NEGATIVE_CASH');
  if (cash.length) return { code: 'NEGATIVE_CASH', issues: cash };
  return null;
}

/** Only the fields a person enters; automatic flags are never stored. */
function clean(t: Transaction): Transaction {
  const out: Transaction = { ...t };
  delete out.isAuto;
  delete out.linkedTo;
  for (const k of Object.keys(out) as (keyof Transaction)[]) {
    if (out[k] === undefined || out[k] === '') delete out[k];
  }
  return out;
}

async function checkAndWrite(
  tx: SqlExecutor,
  portfolioId: string,
  change: { before?: Transaction; after?: Transaction },
  opts: ChangeOptions,
): Promise<ChangeResult> {
  const engine = opts.engine ?? DEFAULT_ENGINE;
  const now = opts.now ?? new Date();
  const current = await txnRepo.listTransactions(tx, portfolioId);
  const { before, after } = change;

  if (after) {
    const assets = await getAssets(tx, after.assetId ? [after.assetId] : []);
    const issues = validateTransaction(after, { now: now.getTime(), assets });
    if (issues.length) return { ok: false, rejection: { code: 'INVALID', issues } };
  }

  const next = current.filter((t) => t.id !== before?.id);
  if (after) next.push(after);
  const rejection = rejectionFor(newLedgerIssues(current, next, engine, after?.id));
  if (rejection) return { ok: false, rejection };

  const stamp = now.toISOString();
  if (before && after) await txnRepo.updateTransaction(tx, portfolioId, after, stamp);
  else if (after) await txnRepo.insertTransactions(tx, portfolioId, [after], stamp);
  else if (before) await txnRepo.deleteTransaction(tx, before.id);

  const days = [before, after].filter((t): t is Transaction => !!t).map((t) => trDay(t.ts));
  await markSeriesDirty(tx, portfolioId, days.sort()[0]);
  return { ok: true, txn: (after ?? before)! };
}

/** Adds a record (no id or an unknown id) or replaces an existing one. */
export function saveTransaction(
  db: SqlDriver,
  portfolioId: string,
  input: Transaction,
  opts: ChangeOptions = {},
): Promise<ChangeResult> {
  return db.transaction(async (tx) => {
    if (input.isAuto) return { ok: false, rejection: { code: 'AUTO_RECORD' } };
    if (!(await getPortfolio(tx, portfolioId))) {
      return { ok: false, rejection: { code: 'NOT_FOUND' } };
    }
    const after = clean({ ...input, id: input.id || newId('t') });
    const existing = await txnRepo.getTransaction(tx, after.id);
    if (existing && existing.portfolioId !== portfolioId) {
      return { ok: false, rejection: { code: 'NOT_FOUND' } };
    }
    return checkAndWrite(tx, portfolioId, { before: existing?.txn, after }, opts);
  });
}

/** Deletes a record; the result carries the deleted record so it can be restored (undo). */
export function deleteTransaction(
  db: SqlDriver,
  portfolioId: string,
  id: string,
  opts: ChangeOptions = {},
): Promise<ChangeResult> {
  return db.transaction(async (tx) => {
    const existing = await txnRepo.getTransaction(tx, id);
    if (!existing || existing.portfolioId !== portfolioId) {
      const derived = id.startsWith('auto-');
      return { ok: false, rejection: { code: derived ? 'AUTO_RECORD' : 'NOT_FOUND' } };
    }
    return checkAndWrite(tx, portfolioId, { before: existing.txn }, opts);
  });
}

export type BatchResult =
  { ok: true; txns: Transaction[] } | { ok: false; rejection: ChangeRejection };

/**
 * Deletes several records at once (e.g. every record of an asset), checked as one change:
 * the history without them must still be consistent. Returns them for undo.
 */
export function deleteTransactions(
  db: SqlDriver,
  portfolioId: string,
  ids: readonly string[],
  opts: ChangeOptions = {},
): Promise<BatchResult> {
  return db.transaction(async (tx) => {
    const engine = opts.engine ?? DEFAULT_ENGINE;
    const current = await txnRepo.listTransactions(tx, portfolioId);
    const remove = new Set(ids);
    const removed = current.filter((t) => remove.has(t.id));
    if (removed.length !== remove.size) return { ok: false, rejection: { code: 'NOT_FOUND' } };
    const next = current.filter((t) => !remove.has(t.id));
    const rejection = rejectionFor(newLedgerIssues(current, next, engine));
    if (rejection) return { ok: false, rejection };
    for (const t of removed) await txnRepo.deleteTransaction(tx, t.id);
    await markSeriesDirty(tx, portfolioId, removed.map((t) => trDay(t.ts)).sort()[0]);
    return { ok: true, txns: removed };
  });
}

/** Puts back records removed together (undo), checked as one change. */
export function restoreTransactions(
  db: SqlDriver,
  portfolioId: string,
  txns: readonly Transaction[],
  opts: ChangeOptions = {},
): Promise<BatchResult> {
  return db.transaction(async (tx) => {
    const engine = opts.engine ?? DEFAULT_ENGINE;
    const current = await txnRepo.listTransactions(tx, portfolioId);
    const next = [...current, ...txns.map(clean)];
    const rejection = rejectionFor(newLedgerIssues(current, next, engine));
    if (rejection) return { ok: false, rejection };
    await txnRepo.insertTransactions(
      tx,
      portfolioId,
      txns.map(clean),
      (opts.now ?? new Date()).toISOString(),
    );
    await markSeriesDirty(tx, portfolioId, txns.map((t) => trDay(t.ts)).sort()[0]);
    return { ok: true, txns: [...txns] };
  });
}

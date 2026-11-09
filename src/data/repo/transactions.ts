import type { Transaction, TxnType } from '@/domain';

import { insertMany, type SqlExecutor, type SqlValue } from '../db/driver';

interface TxnRow {
  id: string;
  portfolio_id: string;
  asset_id: string | null;
  type: TxnType;
  ts: string;
  quantity: string | null;
  price: string | null;
  fee: string | null;
  fx_rate: string | null;
  amount: string | null;
  tax: string | null;
  split_ratio: string | null;
  withdraw_proceeds: number;
  note: string | null;
}

const opt = <T>(v: T | null): T | undefined => (v === null ? undefined : v);

function fromRow(r: TxnRow): Transaction {
  const t: Transaction = { id: r.id, type: r.type, ts: r.ts };
  if (r.asset_id !== null) t.assetId = r.asset_id;
  if (r.quantity !== null) t.quantity = r.quantity;
  if (r.price !== null) t.price = r.price;
  if (r.fee !== null) t.fee = r.fee;
  if (r.fx_rate !== null) t.fxRate = r.fx_rate;
  if (r.amount !== null) t.amount = r.amount;
  if (r.tax !== null) t.tax = r.tax;
  if (r.split_ratio !== null) t.splitRatio = r.split_ratio;
  if (r.withdraw_proceeds) t.withdrawProceeds = true;
  const note = opt(r.note);
  if (note) t.note = note;
  return t;
}

const COLUMNS = [
  'id',
  'portfolio_id',
  'asset_id',
  'type',
  'ts',
  'quantity',
  'price',
  'fee',
  'fx_rate',
  'amount',
  'tax',
  'split_ratio',
  'withdraw_proceeds',
  'note',
  'created_at',
  'updated_at',
] as const;

function toRow(portfolioId: string, t: Transaction, now: string): SqlValue[] {
  return [
    t.id,
    portfolioId,
    t.assetId ?? null,
    t.type,
    t.ts,
    t.quantity ?? null,
    t.price ?? null,
    t.fee ?? null,
    t.fxRate ?? null,
    t.amount ?? null,
    t.tax ?? null,
    t.splitRatio ?? null,
    t.withdrawProceeds ? 1 : 0,
    t.note ?? null,
    now,
    now,
  ];
}

/** The portfolio's own (manual) records in time order. Automatic records are derived. */
export async function listTransactions(
  db: SqlExecutor,
  portfolioId: string,
): Promise<Transaction[]> {
  const rows = await db.all<TxnRow>('SELECT * FROM txn WHERE portfolio_id = ? ORDER BY ts, id', [
    portfolioId,
  ]);
  return rows.map(fromRow);
}

export async function getTransaction(
  db: SqlExecutor,
  id: string,
): Promise<{ portfolioId: string; txn: Transaction } | null> {
  const row = await db.first<TxnRow>('SELECT * FROM txn WHERE id = ?', [id]);
  return row ? { portfolioId: row.portfolio_id, txn: fromRow(row) } : null;
}

export async function insertTransactions(
  db: SqlExecutor,
  portfolioId: string,
  txns: readonly Transaction[],
  now: string,
): Promise<void> {
  await insertMany(
    db,
    'txn',
    COLUMNS,
    txns.map((t) => toRow(portfolioId, t, now)),
  );
}

/** Replaces a record's fields (keeps its creation time). */
export async function updateTransaction(
  db: SqlExecutor,
  portfolioId: string,
  t: Transaction,
  now: string,
): Promise<void> {
  const row = toRow(portfolioId, t, now);
  const sets = COLUMNS.slice(1, -2).map((c) => `${c} = ?`);
  await db.run(`UPDATE txn SET ${sets.join(', ')}, updated_at = ? WHERE id = ?`, [
    ...row.slice(1, -2),
    now,
    t.id,
  ]);
}

export async function deleteTransaction(db: SqlExecutor, id: string): Promise<void> {
  await db.run('DELETE FROM txn WHERE id = ?', [id]);
}

export async function countTransactions(db: SqlExecutor, portfolioId?: string): Promise<number> {
  const row = portfolioId
    ? await db.first<{ n: number }>('SELECT COUNT(*) AS n FROM txn WHERE portfolio_id = ?', [
        portfolioId,
      ])
    : await db.first<{ n: number }>('SELECT COUNT(*) AS n FROM txn');
  return row?.n ?? 0;
}

/** Asset ids the portfolio's records refer to. */
export async function assetIdsOf(db: SqlExecutor, portfolioId: string): Promise<string[]> {
  const rows = await db.all<{ asset_id: string }>(
    'SELECT DISTINCT asset_id FROM txn WHERE portfolio_id = ? AND asset_id IS NOT NULL',
    [portfolioId],
  );
  return rows.map((r) => r.asset_id);
}

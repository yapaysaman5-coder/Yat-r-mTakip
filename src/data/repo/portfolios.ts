import type { SqlExecutor } from '../db/driver';
import type { Portfolio, PortfolioKind } from '../types';

interface PortfolioRow {
  id: string;
  name: string;
  kind: PortfolioKind;
  color: string | null;
  sort_order: number;
  meta_json: string | null;
  series_dirty_from: string | null;
  created_at: string;
}

interface PortfolioMeta {
  demoEnd?: string;
}

function fromRow(r: PortfolioRow): Portfolio {
  const meta: PortfolioMeta = r.meta_json ? JSON.parse(r.meta_json) : {};
  return {
    id: r.id,
    name: r.name,
    kind: r.kind,
    color: r.color ?? undefined,
    sortOrder: r.sort_order,
    demoEnd: meta.demoEnd,
    seriesDirtyFrom: r.series_dirty_from,
    createdAt: r.created_at,
  };
}

export async function listPortfolios(db: SqlExecutor): Promise<Portfolio[]> {
  const rows = await db.all<PortfolioRow>(
    'SELECT * FROM portfolio ORDER BY sort_order, created_at, id',
  );
  return rows.map(fromRow);
}

export async function getPortfolio(db: SqlExecutor, id: string): Promise<Portfolio | null> {
  const row = await db.first<PortfolioRow>('SELECT * FROM portfolio WHERE id = ?', [id]);
  return row ? fromRow(row) : null;
}

export async function insertPortfolio(db: SqlExecutor, p: Portfolio): Promise<void> {
  const meta: PortfolioMeta = p.demoEnd ? { demoEnd: p.demoEnd } : {};
  await db.run(
    `INSERT INTO portfolio (id, name, kind, color, sort_order, meta_json, series_dirty_from, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      p.id,
      p.name,
      p.kind,
      p.color ?? null,
      p.sortOrder,
      Object.keys(meta).length ? JSON.stringify(meta) : null,
      p.seriesDirtyFrom,
      p.createdAt,
    ],
  );
}

export async function renamePortfolio(db: SqlExecutor, id: string, name: string): Promise<void> {
  await db.run('UPDATE portfolio SET name = ? WHERE id = ?', [name, id]);
}

/** Deletes the portfolio with its transactions and cached values. */
export async function deletePortfolio(db: SqlExecutor, id: string): Promise<void> {
  await db.run('DELETE FROM portfolio WHERE id = ?', [id]);
}

/** Marks the cached daily values from `day` on as stale (keeps the earliest such day). */
export async function markSeriesDirty(db: SqlExecutor, id: string, day: string): Promise<void> {
  await db.run(
    `UPDATE portfolio SET series_dirty_from =
       CASE WHEN series_dirty_from IS NULL OR series_dirty_from > ? THEN ? ELSE series_dirty_from END
     WHERE id = ?`,
    [day, day, id],
  );
}

export async function clearSeriesDirty(db: SqlExecutor, id: string): Promise<void> {
  await db.run('UPDATE portfolio SET series_dirty_from = NULL WHERE id = ?', [id]);
}

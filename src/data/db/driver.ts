/**
 * A small SQL interface the repositories are written against. The app uses expo-sqlite
 * (./expoDriver.ts); tests use Node's built-in SQLite with the same interface, so every query
 * runs against a real SQLite engine in CI.
 *
 * All calls go through one queue: a transaction always sees its own writes and nothing else
 * interleaves with it, on every platform.
 */

export type SqlValue = string | number | null;

export interface SqlExecutor {
  /** INSERT / UPDATE / DELETE. */
  run(sql: string, params?: readonly SqlValue[]): Promise<{ changes: number }>;
  all<T>(sql: string, params?: readonly SqlValue[]): Promise<T[]>;
  first<T>(sql: string, params?: readonly SqlValue[]): Promise<T | null>;
  /** One or more statements without parameters (schema changes). */
  exec(sql: string): Promise<void>;
}

export interface SqlDriver extends SqlExecutor {
  /** Runs `fn` inside BEGIN … COMMIT; any error rolls everything back. */
  transaction<T>(fn: (tx: SqlExecutor) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

/** The raw connection a platform provides; no concurrency control of its own. */
export interface RawConnection extends SqlExecutor {
  close(): Promise<void>;
}

export function createDriver(raw: RawConnection): SqlDriver {
  let tail: Promise<unknown> = Promise.resolve();

  const enqueue = <T>(task: () => Promise<T>): Promise<T> => {
    const result = tail.then(task, task);
    tail = result.catch(() => undefined);
    return result;
  };

  return {
    run: (sql, params) => enqueue(() => raw.run(sql, params)),
    all: <T>(sql: string, params?: readonly SqlValue[]) => enqueue(() => raw.all<T>(sql, params)),
    first: <T>(sql: string, params?: readonly SqlValue[]) =>
      enqueue(() => raw.first<T>(sql, params)),
    exec: (sql) => enqueue(() => raw.exec(sql)),
    transaction: <T>(fn: (tx: SqlExecutor) => Promise<T>) =>
      enqueue(async () => {
        await raw.exec('BEGIN');
        try {
          const value = await fn(raw);
          await raw.exec('COMMIT');
          return value;
        } catch (error) {
          await raw.exec('ROLLBACK');
          throw error;
        }
      }),
    close: () => enqueue(() => raw.close()),
  };
}

/**
 * Inserts many rows with multi-row INSERT statements (one bridge call per chunk instead of
 * per row; SQLite allows at most 999 parameters per statement on older builds).
 */
export async function insertMany(
  db: SqlExecutor,
  table: string,
  columns: readonly string[],
  rows: readonly (readonly SqlValue[])[],
  { orReplace = false }: { orReplace?: boolean } = {},
): Promise<void> {
  if (rows.length === 0) return;
  const perRow = `(${columns.map(() => '?').join(',')})`;
  const chunk = Math.max(1, Math.floor(999 / columns.length));
  const verb = orReplace ? 'INSERT OR REPLACE' : 'INSERT';
  for (let i = 0; i < rows.length; i += chunk) {
    const part = rows.slice(i, i + chunk);
    await db.run(
      `${verb} INTO ${table} (${columns.join(',')}) VALUES ${part.map(() => perRow).join(',')}`,
      part.flat(),
    );
  }
}

/** "?, ?, ?" for an IN (…) list. */
export const placeholders = (n: number) => Array.from({ length: n }, () => '?').join(',');

/**
 * Test-only driver on Node's built-in SQLite (never bundled into the app: only tests import
 * this file).
 */
import { DatabaseSync } from 'node:sqlite';

import { createDriver, type SqlDriver, type SqlValue } from './driver';

const plain = <T>(row: unknown): T => ({ ...(row as object) }) as T;

export function openNodeDriver(path = ':memory:'): SqlDriver {
  const db = new DatabaseSync(path);
  db.exec('PRAGMA foreign_keys = ON;');
  const params = (p?: readonly SqlValue[]) => (p ?? []) as SqlValue[];
  return createDriver({
    run: async (sql, p) => {
      const r = db.prepare(sql).run(...params(p));
      return { changes: Number(r.changes) };
    },
    all: async <T>(sql: string, p?: readonly SqlValue[]) =>
      db
        .prepare(sql)
        .all(...params(p))
        .map((row) => plain<T>(row)),
    first: async <T>(sql: string, p?: readonly SqlValue[]) => {
      const row = db.prepare(sql).get(...params(p));
      return row === undefined ? null : plain<T>(row);
    },
    exec: async (sql) => db.exec(sql),
    close: async () => db.close(),
  });
}

import { openDatabaseAsync } from 'expo-sqlite';

import { createDriver, type SqlDriver, type SqlValue } from './driver';

const args = (params?: readonly SqlValue[]) => (params ?? []) as SqlValue[];

/** Opens (or creates) the app database with expo-sqlite. */
export async function openExpoDriver(name: string): Promise<SqlDriver> {
  const db = await openDatabaseAsync(name);
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  return createDriver({
    run: async (sql, params) => {
      const r = await db.runAsync(sql, args(params));
      return { changes: r.changes };
    },
    all: <T>(sql: string, params?: readonly SqlValue[]) => db.getAllAsync<T>(sql, args(params)),
    first: <T>(sql: string, params?: readonly SqlValue[]) => db.getFirstAsync<T>(sql, args(params)),
    exec: (sql) => db.execAsync(sql),
    close: () => db.closeAsync(),
  });
}

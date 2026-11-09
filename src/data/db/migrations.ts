import type { SqlDriver } from './driver';

/**
 * Numbered schema migrations (docs/03-TEKNIK-MIMARI.md §5). The database records the last
 * one applied in `PRAGMA user_version`; on start, every newer migration runs once, each in
 * its own transaction. Never edit a released migration: add a new one.
 *
 * Money the user typed (quantity, price, fee, rate, amount, tax) is TEXT with full decimal
 * precision. Price history and the daily value cache are derived data and use REAL.
 */
export interface Migration {
  version: number;
  description: string;
  sql: string;
}

export const MIGRATIONS: readonly Migration[] = [
  {
    version: 1,
    description: 'Portfolios, assets, transactions, daily prices and the daily value cache',
    sql: `
      CREATE TABLE portfolio (
        id                TEXT PRIMARY KEY,
        name              TEXT NOT NULL,
        kind              TEXT NOT NULL DEFAULT 'user' CHECK (kind IN ('user', 'demo')),
        color             TEXT,
        sort_order        INTEGER NOT NULL DEFAULT 0,
        meta_json         TEXT,
        series_dirty_from TEXT,
        created_at        TEXT NOT NULL
      );

      CREATE TABLE asset (
        id              TEXT PRIMARY KEY,
        market          TEXT NOT NULL,
        symbol          TEXT NOT NULL,
        provider_symbol TEXT,
        name            TEXT,
        currency        TEXT NOT NULL,
        meta_json       TEXT,
        created_at      TEXT NOT NULL
      );

      CREATE TABLE txn (
        id                TEXT PRIMARY KEY,
        portfolio_id      TEXT NOT NULL REFERENCES portfolio(id) ON DELETE CASCADE,
        asset_id          TEXT REFERENCES asset(id),
        type              TEXT NOT NULL
                          CHECK (type IN ('BUY','SELL','DEPOSIT','WITHDRAW','DIVIDEND','FEE','SPLIT')),
        ts                TEXT NOT NULL,
        quantity          TEXT,
        price             TEXT,
        fee               TEXT,
        fx_rate           TEXT,
        amount            TEXT,
        tax               TEXT,
        split_ratio       TEXT,
        withdraw_proceeds INTEGER NOT NULL DEFAULT 0,
        note              TEXT,
        created_at        TEXT NOT NULL,
        updated_at        TEXT NOT NULL
      );
      CREATE INDEX txn_portfolio_ts ON txn (portfolio_id, ts);
      CREATE INDEX txn_asset_ts ON txn (asset_id, ts);

      CREATE TABLE price_daily (
        asset_id TEXT NOT NULL,
        date     TEXT NOT NULL,
        close    REAL NOT NULL,
        PRIMARY KEY (asset_id, date)
      ) WITHOUT ROWID;

      CREATE TABLE portfolio_snapshot (
        portfolio_id TEXT NOT NULL REFERENCES portfolio(id) ON DELETE CASCADE,
        date         TEXT NOT NULL,
        value        REAL NOT NULL,
        cash         REAL NOT NULL,
        net_invested REAL NOT NULL,
        flow         REAL NOT NULL,
        PRIMARY KEY (portfolio_id, date)
      ) WITHOUT ROWID;
    `,
  },
  {
    version: 2,
    description: 'Live quotes, price download state, corporate actions and the watchlist',
    sql: `
      CREATE TABLE quote (
        asset_id      TEXT PRIMARY KEY,
        price         REAL NOT NULL,
        prev_close    REAL,
        time          INTEGER NOT NULL,
        source        TEXT NOT NULL,
        delay_minutes INTEGER NOT NULL DEFAULT 0,
        end_of_day    INTEGER NOT NULL DEFAULT 0,
        fetched_at    INTEGER NOT NULL
      ) WITHOUT ROWID;

      CREATE TABLE price_sync (
        asset_id   TEXT PRIMARY KEY,
        first_date TEXT,
        last_date  TEXT,
        source     TEXT,
        synced_at  INTEGER NOT NULL,
        error      TEXT
      ) WITHOUT ROWID;

      CREATE TABLE corporate_action (
        asset_id TEXT NOT NULL,
        date     TEXT NOT NULL,
        type     TEXT NOT NULL CHECK (type IN ('SPLIT', 'DIVIDEND')),
        value    TEXT NOT NULL,
        source   TEXT,
        PRIMARY KEY (asset_id, date, type)
      ) WITHOUT ROWID;

      CREATE TABLE watchlist (
        asset_id   TEXT PRIMARY KEY,
        sort_order INTEGER NOT NULL
      ) WITHOUT ROWID;

      INSERT INTO watchlist (asset_id, sort_order) VALUES
        ('INDEX:XU100', 0), ('FX:USDTRY', 1), ('FX:EURTRY', 2), ('COMMODITY:GAU', 3),
        ('CRYPTO:BTC', 4), ('INDEX:SPX', 5), ('INDEX:NDX', 6), ('COMMODITY:XAG', 7),
        ('INDEX:XU030', 8), ('CRYPTO:ETH', 9);
    `,
  },
];

export const SCHEMA_VERSION = MIGRATIONS[MIGRATIONS.length - 1].version;

export class NewerSchemaError extends Error {
  constructor(readonly found: number) {
    super(`Database schema ${found} is newer than this app (${SCHEMA_VERSION}).`);
    this.name = 'NewerSchemaError';
  }
}

export async function schemaVersion(db: SqlDriver): Promise<number> {
  const row = await db.first<{ user_version: number }>('PRAGMA user_version');
  return row?.user_version ?? 0;
}

/** Applies every pending migration; returns the resulting schema version. */
export async function migrate(
  db: SqlDriver,
  migrations: readonly Migration[] = MIGRATIONS,
): Promise<number> {
  let version = await schemaVersion(db);
  const latest = migrations.length ? migrations[migrations.length - 1].version : 0;
  if (version > latest) throw new NewerSchemaError(version);
  for (const m of migrations) {
    if (m.version <= version) continue;
    await db.transaction(async (tx) => {
      await tx.exec(m.sql);
      await tx.exec(`PRAGMA user_version = ${m.version}`);
    });
    version = m.version;
  }
  return version;
}

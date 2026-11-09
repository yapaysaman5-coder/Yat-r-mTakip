import { buildLedger, reconcileAutoRecords, valuePortfolio, type Transaction } from '@/domain';

import { MAIN_PORTFOLIO_ID } from '../constants';
import type { SqlDriver } from '../db/driver';
import { schemaVersion } from '../db/migrations';
import { mulberry32 } from '../demo/market';
import { deletePortfolio, insertPortfolio, listPortfolios } from '../repo/portfolios';
import { countCloses } from '../repo/prices';
import { countTransactions } from '../repo/transactions';

export interface DataStats {
  portfolios: number;
  transactions: number;
  closes: number;
  schemaVersion: number;
}

export async function dataStats(db: SqlDriver): Promise<DataStats> {
  return {
    portfolios: (await listPortfolios(db)).length,
    transactions: await countTransactions(db),
    closes: await countCloses(db),
    schemaVersion: await schemaVersion(db),
  };
}

/** "Tüm verileri sil": everything goes; an empty Ana Portföy remains to start again. */
export async function wipeAll(db: SqlDriver, now = new Date()): Promise<void> {
  await db.transaction(async (tx) => {
    for (const p of await listPortfolios(tx)) await deletePortfolio(tx, p.id);
    await tx.run('DELETE FROM price_daily');
    await tx.run('DELETE FROM asset');
    await insertPortfolio(tx, {
      id: MAIN_PORTFOLIO_ID,
      name: 'Ana Portföy',
      kind: 'user',
      sortOrder: 0,
      seriesDirtyFrom: null,
      createdAt: now.toISOString(),
    });
  });
}

/** Test scenario T12: hourly crypto trades with 8-decimal quantities. */
export function speedTestTransactions(count: number): Transaction[] {
  const rand = mulberry32(42);
  const start = Date.parse('2024-01-01T00:00:00Z');
  const txns: Transaction[] = [];
  let held = 0;
  for (let i = 0; i < count; i++) {
    const sats = 1 + Math.floor(rand() * 5_000_000);
    const sell = held >= sats && rand() < 0.45;
    held += sell ? -sats : sats;
    txns.push({
      id: `t${i}`,
      type: sell ? 'SELL' : 'BUY',
      ts: new Date(start + i * 3_600_000).toISOString(),
      assetId: 'BTC',
      quantity: (sats / 1e8).toFixed(8),
      price: (60_000 + rand() * 40_000).toFixed(2),
      fee: '0.5',
      fxRate: (30 + i / 1000).toFixed(4),
    });
  }
  return txns;
}

/**
 * Times a full replay and valuation of `count` records on this device (the T12 target is
 * 10.000 records under 200 ms). The records are built before the clock starts.
 */
export function engineSpeedTest(count: number): { count: number; ms: number } {
  const all = reconcileAutoRecords(speedTestTransactions(count), { autoDeposit: true });
  const started = Date.now();
  valuePortfolio(buildLedger(all), { BTC: { price: '98410.12', fx: '42.5' } });
  return { count: all.length, ms: Date.now() - started };
}

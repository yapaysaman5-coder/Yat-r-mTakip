import { describe, expect, it } from '@jest/globals';

import { migrate, SCHEMA_VERSION } from '../db/migrations';
import { openNodeDriver } from '../db/nodeDriver';
import { seedDemo } from '../demo/seed';
import { listPortfolios } from '../repo/portfolios';
import { dataStats, engineSpeedTest, wipeAll } from '../service/maintenance';

describe('data maintenance', () => {
  it('counts what is stored and wipes everything but an empty main portfolio', async () => {
    const db = openNodeDriver();
    await migrate(db);
    await seedDemo(db, { now: new Date('2026-11-09T12:00:00Z') });
    const before = await dataStats(db);
    expect(before).toEqual({
      portfolios: 1,
      transactions: 27,
      closes: 666 * 19, // 7 assets, 11 benchmarks, USD/TRY (also a benchmark)
      schemaVersion: SCHEMA_VERSION,
    });
    await wipeAll(db);
    expect(await dataStats(db)).toMatchObject({ portfolios: 1, transactions: 0, closes: 0 });
    expect((await listPortfolios(db)).map((p) => [p.id, p.kind])).toEqual([['main', 'user']]);
  });

  it('times the engine on the T12 scenario', () => {
    const r = engineSpeedTest(1000);
    expect(r.count).toBeGreaterThanOrEqual(1000);
    expect(r.ms).toBeGreaterThanOrEqual(0);
  });
});

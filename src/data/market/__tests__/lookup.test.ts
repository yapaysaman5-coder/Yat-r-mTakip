import { afterEach, describe, expect, it } from '@jest/globals';

import { migrate } from '../../db/migrations';
import { openNodeDriver } from '../../db/nodeDriver';
import { exportBackup, importBackup } from '../../service/backup';
import { ensureAsset } from '../../service/trade';
import { clearPinnedSources, instrumentFor, pinSources } from '../instruments';
import { lookupCoins, mockLookup } from '../lookup';
import { parseTickerPrice } from '../providers/binance';
import { parseCoinSearch } from '../providers/coingecko';
import { MarketError } from '../types';
import { fakeHttp, fixture } from './fakeHttp';
import { getAssets } from '../../repo/assets';
import { getPortfolio, insertPortfolio } from '../../repo/portfolios';
import { saveTransaction } from '../../service/transactions';

const INVALID = new MarketError('http', 'Binance: Invalid symbol', 400);

afterEach(() => clearPinnedSources());

describe('parsers (recorded responses, 9 Nov 2026)', () => {
  it('reads CoinGecko search hits', () => {
    const hits = parseCoinSearch(fixture('coingecko-search-bob.json'));
    expect(hits).toHaveLength(25);
    expect(hits[0]).toEqual({
      id: 'bob-build-on-bitcoin',
      symbol: 'BOB',
      name: 'BOB (Build on Bitcoin)',
      rank: 853,
    });
    expect(hits.filter((h) => h.symbol === 'BOB')).toHaveLength(8);
    expect(() => parseCoinSearch('{"error":"x"}')).toThrow(MarketError);
  });

  it('reads a Binance ticker price', () => {
    expect(parseTickerPrice(fixture('binance-price-PEPEUSDT.json'))).toBe(0.00000513);
    expect(parseTickerPrice('{"symbol":"X","price":"0"}')).toBeNull();
  });
});

describe('lookupCoins', () => {
  it('lists every coin with that symbol, best ranked first, with prices', async () => {
    const http = fakeHttp([
      [/ticker\/price\?symbol=BOBUSDT/, INVALID],
      [/\/search\?query=bob/, fixture('coingecko-search-bob.json')],
      [/simple\/price/, fixture('coingecko-simple-bob.json')],
    ]);
    const r = await lookupCoins('bob', http);
    expect(r.reached).toEqual({ binance: true, coingecko: true });
    expect(r.candidates).toHaveLength(8);
    expect(r.candidates.every((c) => c.source === 'coingecko' && c.assetId === 'CRYPTO:BOB')).toBe(
      true,
    );
    expect(r.candidates.slice(0, 3).map((c) => [c.ref, c.rank, c.priceUSD])).toEqual([
      ['bob-build-on-bitcoin', 853, 0.00391565],
      ['build-on-bnb', 2189, 5.785e-9],
      ['bob-3', 3042, 0.04599663],
    ]);
    // One request for all the prices.
    expect(http.calls.filter((u) => u.includes('simple/price'))).toHaveLength(1);
  });

  it('offers the Binance pair when there is one', async () => {
    const http = fakeHttp([
      [/ticker\/price\?symbol=PEPEUSDT/, fixture('binance-price-PEPEUSDT.json')],
      [/\/search/, '{"coins":[]}'],
    ]);
    const r = await lookupCoins('pepe', http);
    expect(r.candidates).toEqual([
      {
        assetId: 'CRYPTO:PEPE',
        symbol: 'PEPE',
        name: 'PEPE',
        source: 'binance',
        ref: 'PEPEUSDT',
        rank: null,
        priceUSD: 0.00000513,
      },
    ]);
  });

  it('leaves out coins already in the catalog and says which sources did not answer', async () => {
    const http = fakeHttp([
      [/ticker\/price/, new MarketError('network', 'offline')],
      [
        /\/search/,
        '{"coins":[{"id":"bitcoin","symbol":"btc","name":"Bitcoin","market_cap_rank":1}]}',
      ],
    ]);
    const r = await lookupCoins('btc', http);
    expect(r.candidates).toEqual([]);
    expect(r.reached).toEqual({ binance: false, coingecko: true });
  });

  it('gives fictional results in the web preview', () => {
    const r = mockLookup('xyz');
    expect(r.candidates.map((c) => c.ref)).toEqual(['xyz-network', 'xyz', 'xyz-token']);
  });
});

describe('a coin matched to CoinGecko', () => {
  it('is priced from CoinGecko only, and keeps that after reopening and in backups', async () => {
    expect(instrumentFor('CRYPTO:BOB')!.sources).toEqual([{ source: 'binance', ref: 'BOBUSDT' }]);

    const db = openNodeDriver();
    await migrate(db);
    await ensureAsset(db, {
      id: 'CRYPTO:BOB',
      symbol: 'BOB',
      name: 'BOB (Build on Bitcoin)',
      market: 'CRYPTO',
      currency: 'USD',
      providerSymbol: 'coingecko:bob-build-on-bitcoin',
    });
    const pinned = instrumentFor('CRYPTO:BOB')!;
    expect(pinned.sources).toEqual([{ source: 'coingecko', ref: 'bob-build-on-bitcoin' }]);
    expect(pinned.name).toBe('BOB (Build on Bitcoin)');
    expect((await getAssets(db, ['CRYPTO:BOB'])).get('CRYPTO:BOB')?.providerSymbol).toBe(
      'coingecko:bob-build-on-bitcoin',
    );

    // App restart: read back from the asset rows.
    clearPinnedSources();
    pinSources((await getAssets(db, ['CRYPTO:BOB'])).values());
    expect(instrumentFor('CRYPTO:BOB')!.sources[0].source).toBe('coingecko');

    // Restored from a backup on another phone (assets go with the records that use them).
    await insertPortfolio(db, {
      id: 'main',
      name: 'Ana Portföy',
      kind: 'user',
      sortOrder: 0,
      seriesDirtyFrom: null,
      createdAt: '2026-11-01T00:00:00Z',
    });
    const now = new Date('2026-11-09T12:00:00Z');
    await saveTransaction(
      db,
      'main',
      { id: '', type: 'DEPOSIT', ts: '2026-11-02T09:00:00Z', amount: '1000' },
      { now },
    );
    const buy = await saveTransaction(
      db,
      'main',
      {
        id: '',
        type: 'BUY',
        ts: '2026-11-03T09:00:00Z',
        assetId: 'CRYPTO:BOB',
        quantity: '1000',
        price: '0.004',
        fxRate: '50',
      },
      { now },
    );
    expect(buy.ok).toBe(true);
    const backup = await exportBackup(db);

    // Matched again (here: back to the Binance pair): the old source's prices are dropped.
    await db.run('UPDATE portfolio SET series_dirty_from = NULL');
    await db.run(
      "INSERT INTO price_daily (asset_id, date, close) VALUES ('CRYPTO:BOB', '2026-11-05', 0.004)",
    );
    await db.run(
      "INSERT INTO price_sync (asset_id, first_date, last_date, source, synced_at, error) VALUES ('CRYPTO:BOB', '2026-11-03', '2026-11-09', 'coingecko', 1, NULL)",
    );
    await ensureAsset(db, {
      id: 'CRYPTO:BOB',
      symbol: 'BOB',
      name: 'BOB',
      market: 'CRYPTO',
      currency: 'USD',
      providerSymbol: 'BOBUSDT',
    });
    expect(instrumentFor('CRYPTO:BOB')!.sources[0].source).toBe('binance');
    expect(await db.all("SELECT * FROM price_daily WHERE asset_id = 'CRYPTO:BOB'")).toEqual([]);
    expect(await db.all("SELECT * FROM price_sync WHERE asset_id = 'CRYPTO:BOB'")).toEqual([]);
    expect((await getPortfolio(db, 'main'))?.seriesDirtyFrom).toBe('2026-11-03');
    clearPinnedSources();
    const other = openNodeDriver();
    await migrate(other);
    await importBackup(other, backup);
    expect(instrumentFor('CRYPTO:BOB')!.sources[0].ref).toBe('bob-build-on-bitcoin');
  });
});

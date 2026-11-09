import { describe, expect, it } from '@jest/globals';

import { daysBetween } from '@/domain';

import { migrate } from '../../db/migrations';
import { openNodeDriver } from '../../db/nodeDriver';
import { seedDemo } from '../../demo/seed';
import { upsertAssets } from '../../repo/assets';
import {
  addToWatchlist,
  loadQuotes,
  loadSplits,
  loadSyncStates,
  loadWatchlist,
  removeFromWatchlist,
  upsertQuotes,
  upsertSplits,
} from '../../repo/market';
import { getPortfolio, insertPortfolio } from '../../repo/portfolios';
import { latestCloses, loadCloses } from '../../repo/prices';
import { loadPortfolioData } from '../../service/load';
import { marketNeeds, refreshQuotes, storeStreamPrices, syncHistory } from '../../service/market';
import { saveTransaction } from '../../service/transactions';
import { buildAnalysis } from '../../view/analysisView';
import { buildPortfolioView } from '../../view/portfolioView';
import { instrumentFor } from '../instruments';
import { MarketRouter } from '../router';
import { MarketError, type MarketSource } from '../types';
import { fakeHttp } from './fakeHttp';

const NOW = new Date('2026-11-09T12:00:00Z'); // Monday 15:00 Istanbul

/** A source with a flat price per ref (or a failure), recording every request. */
function flatSource(
  id: MarketSource['id'],
  prices: Record<string, number>,
  opts: { fail?: MarketError } = {},
): MarketSource & { requests: string[] } {
  const requests: string[] = [];
  return {
    id,
    requests,
    async quotes(refs) {
      requests.push(`quotes ${refs.join(',')}`);
      if (opts.fail) throw opts.fail;
      return new Map(
        refs
          .filter((r) => r in prices)
          .map((r) => [
            r,
            {
              price: prices[r] * 1.01,
              prevClose: prices[r],
              time: NOW.getTime() - 60_000,
              delayMinutes: 0,
            },
          ]),
      );
    },
    async history(ref, from, to) {
      requests.push(`history ${ref} ${from} ${to}`);
      if (opts.fail) throw opts.fail;
      if (!(ref in prices)) throw new MarketError('not_found', ref);
      return {
        closes: daysBetween(from, to).map((date) => ({ date, close: prices[ref] })),
        splits: [],
        dividends: [],
      };
    },
  };
}

async function setup() {
  const db = openNodeDriver();
  await migrate(db);
  await seedDemo(db, { now: NOW }); // must never be touched by market data
  await insertPortfolio(db, {
    id: 'main',
    name: 'Ana Portföy',
    kind: 'user',
    sortOrder: 0,
    seriesDirtyFrom: null,
    createdAt: NOW.toISOString(),
  });
  await upsertAssets(
    db,
    [{ id: 'US:AAPL', symbol: 'AAPL', name: 'Apple', market: 'US', currency: 'USD' }],
    NOW.toISOString(),
  );
  const opts = { now: NOW };
  await saveTransaction(
    db,
    'main',
    { id: '', type: 'DEPOSIT', ts: '2026-10-01T07:00:00Z', amount: '100000' },
    opts,
  );
  await saveTransaction(
    db,
    'main',
    {
      id: '',
      type: 'BUY',
      ts: '2026-10-20T15:00:00Z',
      assetId: 'US:AAPL',
      quantity: '10',
      price: '240',
      fxRate: '42',
    },
    opts,
  );
  const yahoo = flatSource('yahoo', {
    AAPL: 250,
    'USDTRY=X': 50,
    '^GSPC': 6800,
    '^NDX': 25000,
    '^RUT': 2400,
    'XU100.IS': 11000,
    'XU030.IS': 12000,
    'EURTRY=X': 56,
    'GC=F': 4100,
    'SI=F': 48,
  });
  const binance = flatSource('binance', {
    BTCUSDT: 75000,
    ETHUSDT: 2100,
    PAXGTRY: 206000,
    USDTTRY: 50,
  });
  const tcmbcpi = flatSource('tcmbcpi', { TUFE: 2100 });
  const router = new MarketRouter({ yahoo, binance, tcmbcpi }, fakeHttp([]), () => NOW.getTime());
  return { db, router, yahoo, binance };
}

describe('what the app needs prices for', () => {
  it('covers held assets, their currency, benchmarks and the watchlist; never the example', async () => {
    const { db } = await setup();
    const needs = await marketNeeds(db, NOW);
    expect(needs.historyFrom.get('US:AAPL')).toBe('2026-10-20');
    expect(needs.historyFrom.get('FX:USDTRY')).toBe('2026-09-30'); // watchlist reaches further back
    // Benchmarks start at the first record (the watchlist ones reach 40 days back anyway).
    expect(needs.historyFrom.get('INDEX:RUT')).toBe('2026-10-01');
    expect(needs.historyFrom.get('INDEX:SPX')).toBe('2026-09-30');
    expect(needs.historyFrom.get('CRYPTO:ETH')).toBe('2026-09-30'); // watchlist: 40 days
    expect(needs.live).toEqual(expect.arrayContaining(['US:AAPL', 'FX:USDTRY', 'CRYPTO:BTC']));
    expect(needs.live).not.toContain('INDEX:RUT');
    expect([...needs.instruments.keys()].some((id) => id.startsWith('demo:'))).toBe(false);
  });
});

describe('history download', () => {
  it('downloads once, then only what is missing or old', async () => {
    const { db, router, yahoo } = await setup();
    const needs = await marketNeeds(db, NOW);
    const first = await syncHistory(db, router, needs, { now: NOW });
    expect(first.failed.size).toBe(0);
    expect(first.synced).toContain('US:AAPL');
    const aapl = (await loadCloses(db, ['US:AAPL']))['US:AAPL'];
    expect(Object.keys(aapl)).toHaveLength(21); // 20 Oct – 9 Nov
    expect((await getPortfolio(db, 'main'))?.seriesDirtyFrom).toBe('2026-09-30');
    expect((await getPortfolio(db, 'demo'))?.seriesDirtyFrom).toBeNull();

    // An hour later nothing is fetched again.
    yahoo.requests.length = 0;
    const again = await syncHistory(db, router, needs, {
      now: new Date(NOW.getTime() + 3_600_000),
    });
    expect(again.synced).toEqual([]);
    expect(yahoo.requests).toEqual([]);

    // An earlier record: only the older days are fetched.
    await saveTransaction(
      db,
      'main',
      {
        id: '',
        type: 'BUY',
        ts: '2026-10-05T15:00:00Z',
        assetId: 'US:AAPL',
        quantity: '1',
        price: '230',
        fxRate: '41',
      },
      { now: NOW },
    );
    yahoo.requests.length = 0;
    await syncHistory(db, router, await marketNeeds(db, NOW), {
      now: new Date(NOW.getTime() + 3_600_000),
    });
    expect(yahoo.requests).toEqual(['history AAPL 2026-10-05 2026-10-19']);

    // Next day: the last days are refreshed.
    yahoo.requests.length = 0;
    const tomorrow = new Date(NOW.getTime() + 86_400_000);
    await syncHistory(db, router, await marketNeeds(db, tomorrow), { now: tomorrow });
    expect(yahoo.requests).toContain('history AAPL 2026-11-04 2026-11-10');
  });

  it('records a failure and waits before trying again', async () => {
    const db = openNodeDriver();
    await migrate(db);
    const down = flatSource('binance', {}, { fail: new MarketError('network', 'offline') });
    const router = new MarketRouter({ binance: down }, fakeHttp([]), () => NOW.getTime());
    const needs = await marketNeeds(db, NOW); // the watchlist alone
    const r = await syncHistory(db, router, needs, { now: NOW });
    expect(r.failed.get('CRYPTO:BTC')).toBe('offline');
    expect((await loadSyncStates(db)).get('CRYPTO:BTC')?.error).toBe('offline');
    const soon = await syncHistory(db, router, needs, { now: new Date(NOW.getTime() + 60_000) });
    expect(soon.failed.size).toBe(0);
    expect(soon.skipped).toBe(needs.historyFrom.size);
  });
});

describe('live quotes', () => {
  it('stores the quote and today’s close; the portfolio values with them', async () => {
    const { db, router } = await setup();
    const needs = await marketNeeds(db, NOW);
    await syncHistory(db, router, needs, { now: NOW });
    const live = needs.live.map((id) => needs.instruments.get(id)!);
    const r = await refreshQuotes(db, router, live, { now: NOW });
    expect(r.offline).toBe(false);
    expect(r.quotes.get('US:AAPL')).toMatchObject({ price: 252.5, source: 'yahoo' });
    expect((await loadQuotes(db, ['US:AAPL'])).get('US:AAPL')).toMatchObject({
      price: 252.5,
      prevClose: 250,
      source: 'yahoo',
    });
    expect((await latestCloses(db, ['US:AAPL'], 1))['US:AAPL']).toEqual([
      { date: '2026-11-09', close: 252.5 },
    ]);

    const view = buildPortfolioView((await loadPortfolioData(db, 'main', { now: NOW }))!);
    const h = view.holdings[0];
    expect(h).toMatchObject({
      symbol: 'AAPL',
      price: 252.5,
      prevClose: 250,
      quote: { source: 'yahoo' },
    });
    expect(h.valueTRY).toBeCloseTo(10 * 252.5 * 50.5, 6);
    // Today's change: the price move (250 → 252,5) and the rate move (50 → 50,5).
    expect(view.summary.dailyChange).toBeCloseTo(10 * (252.5 * 50.5 - 250 * 50), 6);
    expect(view.series.values.at(-1)).toBeCloseTo(view.summary.totalValue, 6);

    // "Ya Olsaydı?" now has real comparisons; USD indices are converted to TRY.
    const analysis = buildAnalysis(view);
    const keys = analysis.series.map((s) => s.key);
    expect(keys).toEqual(
      expect.arrayContaining(['me', 'gold', 'btc', 'spx', 'xu100', 'usd', 'eur']),
    );
    // TÜFE from its source; the deposit from the default yearly rate (%40, compounded daily).
    expect(keys).toEqual(expect.arrayContaining(['cpi', 'deposit']));
    const dep = analysis.series.find((s) => s.key === 'deposit')!;
    const days = analysis.dates.length - 1;
    expect(dep.prices.at(-1)! / dep.prices[0]).toBeCloseTo(1.4 ** (days / 365), 10);
    const spx = analysis.series.find((s) => s.key === 'spx')!;
    expect(spx.prices[0]).toBeCloseTo(6800 * 50, 6);
  });

  it('reports being offline and keeps the stored prices', async () => {
    const { db, router } = await setup();
    const needs = await marketNeeds(db, NOW);
    await refreshQuotes(db, router, [needs.instruments.get('US:AAPL')!], { now: NOW });
    const offline = new MarketRouter(
      { yahoo: flatSource('yahoo', {}, { fail: new MarketError('network', 'offline') }) },
      fakeHttp([]),
    );
    const r = await refreshQuotes(db, offline, [needs.instruments.get('US:AAPL')!], { now: NOW });
    expect(r.offline).toBe(true);
    expect((await loadQuotes(db)).get('US:AAPL')?.price).toBe(252.5);
  });
});

describe('stream prices', () => {
  it('stores the price, keeps today’s reference and starts a new day from the last price', async () => {
    const db = openNodeDriver();
    await migrate(db);
    const btc = instrumentFor('CRYPTO:BTC')!;
    const at = (iso: string) => new Date(iso).getTime();

    // No earlier quote: no reference price yet (the next poll brings it).
    await storeStreamPrices(
      db,
      [btc],
      new Map([['CRYPTO:BTC', { price: 100, time: at('2026-11-09T10:00:00Z') }]]),
      { now: NOW },
    );
    expect((await loadQuotes(db, ['CRYPTO:BTC'])).get('CRYPTO:BTC')).toMatchObject({
      price: 100,
      prevClose: null,
      source: 'binance',
      delayMinutes: 0,
    });

    // Same day: the stored reference stays.
    await upsertQuote(db, 'CRYPTO:BTC', 101, 95, at('2026-11-09T10:30:00Z'));
    await storeStreamPrices(
      db,
      [btc],
      new Map([['CRYPTO:BTC', { price: 102, time: at('2026-11-09T11:00:00Z') }]]),
      { now: NOW },
    );
    expect((await loadQuotes(db, ['CRYPTO:BTC'])).get('CRYPTO:BTC')).toMatchObject({
      price: 102,
      prevClose: 95,
    });
    expect((await latestCloses(db, ['CRYPTO:BTC'], 1))['CRYPTO:BTC']).toEqual([
      { date: '2026-11-09', close: 102 },
    ]);

    // After Istanbul midnight (21:00 UTC): yesterday's last price becomes the reference.
    const late = new Date('2026-11-09T21:30:00Z');
    await storeStreamPrices(
      db,
      [btc],
      new Map([['CRYPTO:BTC', { price: 104, time: late.getTime() }]]),
      { now: late },
    );
    expect((await loadQuotes(db, ['CRYPTO:BTC'])).get('CRYPTO:BTC')).toMatchObject({
      price: 104,
      prevClose: 102,
    });
    expect((await latestCloses(db, ['CRYPTO:BTC'], 2))['CRYPTO:BTC']).toEqual([
      { date: '2026-11-09', close: 102 },
      { date: '2026-11-10', close: 104 },
    ]);
  });
});

async function upsertQuote(
  db: ReturnType<typeof openNodeDriver>,
  assetId: string,
  price: number,
  prevClose: number,
  time: number,
) {
  await upsertQuotes(db, [
    {
      assetId,
      price,
      prevClose,
      time,
      source: 'binance',
      delayMinutes: 0,
      endOfDay: false,
      fetchedAt: time,
    },
  ]);
}

describe('watchlist and corporate actions', () => {
  it('adds at the end, ignores duplicates and removes', async () => {
    const db = openNodeDriver();
    await migrate(db);
    const before = await loadWatchlist(db);
    expect(before[0]).toBe('INDEX:XU100');
    await addToWatchlist(db, 'BIST:THYAO');
    await addToWatchlist(db, 'BIST:THYAO');
    expect((await loadWatchlist(db)).slice(-1)).toEqual(['BIST:THYAO']);
    expect(await loadWatchlist(db)).toHaveLength(before.length + 1);
    await removeFromWatchlist(db, 'INDEX:XU100');
    expect(await loadWatchlist(db)).not.toContain('INDEX:XU100');
  });

  it('stores the splits a source reports', async () => {
    const db = openNodeDriver();
    await migrate(db);
    await upsertSplits(db, 'US:NVDA', [{ date: '2024-06-10', ratio: '10' }], 'yahoo');
    await upsertSplits(db, 'US:NVDA', [{ date: '2024-06-10', ratio: '10' }], 'yahoo');
    expect(await loadSplits(db, ['US:NVDA', 'US:AAPL'])).toEqual([
      { assetId: 'US:NVDA', date: '2024-06-10', ratio: '10' },
    ]);
    expect(await loadSplits(db, [])).toEqual([]);
  });
});

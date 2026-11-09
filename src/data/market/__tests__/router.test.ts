import { describe, expect, it } from '@jest/globals';

import { FIXED_INSTRUMENTS, instrumentFor } from '../instruments';
import { MarketRouter, multiply } from '../router';
import { searchInstruments, catalogSize } from '../search';
import { MarketError, type MarketSource, type SourceQuote } from '../types';
import { fakeHttp } from './fakeHttp';

const q = (price: number, prevClose: number | null = null): SourceQuote => ({
  price,
  prevClose,
  time: 1_000,
  delayMinutes: 0,
});

/** A source that answers from a table, or fails with the given error. */
function source(
  id: MarketSource['id'],
  prices: Record<string, number>,
  fail?: MarketError,
  history: Record<string, { date: string; close: number }[]> = {},
): MarketSource & { calls: string[][] } {
  const calls: string[][] = [];
  return {
    id,
    calls,
    async quotes(refs) {
      calls.push([...refs]);
      if (fail) throw fail;
      return new Map(
        refs.filter((r) => r in prices).map((r) => [r, q(prices[r], prices[r] * 0.99)]),
      );
    },
    async history(ref) {
      if (fail) throw fail;
      return { closes: history[ref] ?? [], splits: [], dividends: [] };
    },
  };
}

const inst = (id: string) => instrumentFor(id)!;

describe('instruments', () => {
  it('maps asset ids to sources in order of preference', () => {
    expect(inst('BIST:THYAO').sources.map((s) => `${s.source}:${s.ref}`)).toEqual([
      'yahoo:THYAO.IS',
      'isyatirim:THYAO',
    ]);
    expect(inst('US:AAPL').currency).toBe('USD');
    expect(inst('CRYPTO:BTC').sources.map((s) => s.ref)).toEqual(['BTCUSDT', 'bitcoin']);
    expect(inst('CRYPTO:USDT').sources.map((s) => s.source)).toEqual(['coingecko']);
    expect(inst('CRYPTO:NEWCOIN').sources.map((s) => s.ref)).toEqual(['NEWCOINUSDT']);
    expect(inst('FX:USDTRY').name).toBe('Dolar/TL');
    expect(instrumentFor('demo:THYAO')).toBeNull();
    expect(instrumentFor('XYZ:ABC')).toBeNull();
    expect(FIXED_INSTRUMENTS.length).toBeGreaterThan(5);
  });
});

describe('source router', () => {
  it('batches by source and falls back when a source fails or lacks a symbol', async () => {
    const yahoo = source('yahoo', {}, new MarketError('http', '429', 429));
    const isy = source('isyatirim', { THYAO: 299.25 });
    const binance = source('binance', { BTCUSDT: 74_600, USDTTRY: 50.1 });
    const router = new MarketRouter({ yahoo, isyatirim: isy, binance }, fakeHttp([]), () => 0);
    const r = await router.quotes([
      inst('BIST:THYAO'),
      inst('CRYPTO:BTC'),
      inst('FX:USDTRY'),
      inst('US:AAPL'),
    ]);
    expect(r.quotes.get('BIST:THYAO')).toMatchObject({ price: 299.25, source: 'isyatirim' });
    expect(r.quotes.get('CRYPTO:BTC')).toMatchObject({ price: 74_600, source: 'binance' });
    expect(r.quotes.get('FX:USDTRY')).toMatchObject({ price: 50.1, source: 'binance' });
    expect(r.failed.get('US:AAPL')).toBe('429');
    expect(r.offline).toBe(false);
    // Yahoo is resting now: the next round does not ask it at all.
    yahoo.calls.length = 0;
    await router.quotes([inst('BIST:THYAO')]);
    expect(yahoo.calls).toEqual([]);
    expect(router.status()[0]).toMatchObject({ source: 'yahoo', failures: 1 });
  });

  it('rests a failing source longer each time and tries it again afterwards', async () => {
    let t = 0;
    const yahoo = source('yahoo', {}, new MarketError('http', '429', 429));
    const router = new MarketRouter({ yahoo }, fakeHttp([]), () => t);
    await router.quotes([inst('US:AAPL')]);
    expect(router.status()[0].restingFor).toBe(30_000);
    t = 30_000;
    await router.quotes([inst('US:AAPL')]);
    expect(router.status()[0].restingFor).toBe(60_000);
    expect(yahoo.calls).toHaveLength(2);
  });

  it('derives gram gold and Euro/TL, and reports being offline', async () => {
    const binance = source('binance', { PAXGTRY: 206_100, EURUSDT: 1.12, USDTTRY: 50 });
    const router = new MarketRouter({ binance }, fakeHttp([]));
    const r = await router.quotes([inst('COMMODITY:GAU'), inst('FX:EURTRY')]);
    expect(r.quotes.get('COMMODITY:GAU')!.price).toBeCloseTo(206_100 / 31.1034768, 6);
    expect(r.quotes.get('FX:EURTRY')!.price).toBeCloseTo(56, 9);
    expect(r.quotes.get('FX:EURTRY')!.prevClose).toBeCloseTo(1.12 * 0.99 * 50 * 0.99, 9);
    expect(r.quotes.has('FX:USDTRY')).toBe(false); // only a helper here

    const offline = new MarketRouter(
      { binance: source('binance', {}, new MarketError('network', 'no net')) },
      fakeHttp([]),
    );
    expect((await offline.quotes([inst('CRYPTO:BTC')])).offline).toBe(true);
  });

  it('takes history from the first source that has it, converting with a multiplier', async () => {
    const yahoo = source('yahoo', {}, undefined, {
      'GC=F': [
        { date: '2026-01-05', close: 3110.34768 },
        { date: '2026-01-06', close: 3110.34768 * 2 },
      ],
      'USDTRY=X': [
        { date: '2025-12-31', close: 40 },
        { date: '2026-01-06', close: 41 },
      ],
    });
    const binance = source('binance', {}, new MarketError('http', '451', 451));
    const router = new MarketRouter({ yahoo, binance }, fakeHttp([]));
    const h = await router.history(inst('COMMODITY:GAU'), '2026-01-01', '2026-01-10');
    expect(h.source).toBe('yahoo');
    expect(h.closes.map((c) => c.date)).toEqual(['2026-01-05', '2026-01-06']);
    expect(h.closes[0].close).toBeCloseTo(100 * 40, 9);
    expect(h.closes[1].close).toBeCloseTo(200 * 41, 9);
    await expect(
      router.history(inst('INDEX:XU030'), '2026-01-01', '2026-01-10'),
    ).rejects.toBeInstanceOf(MarketError);
  });

  it('multiplies series day by day, carrying the last value', () => {
    expect(
      multiply(
        [
          { date: '2026-01-01', close: 1 },
          { date: '2026-01-03', close: 2 },
        ],
        [{ date: '2026-01-02', close: 10 }],
      ),
    ).toEqual([{ date: '2026-01-03', close: 20 }]);
  });
});

describe('symbol search', () => {
  it('finds BIST, US and crypto by ticker or name, Turkish letters included', () => {
    expect(catalogSize().bist).toBeGreaterThan(500);
    expect(searchInstruments('THYAO')[0]).toMatchObject({
      id: 'BIST:THYAO',
      name: 'Türk Hava Yolları',
    });
    expect(searchInstruments('türk hava')[0].id).toBe('BIST:THYAO');
    expect(searchInstruments('turk hava')[0].id).toBe('BIST:THYAO');
    expect(searchInstruments('aselsan')[0].id).toBe('BIST:ASELS');
    expect(searchInstruments('apple')[0].id).toBe('US:AAPL');
    expect(searchInstruments('btc')[0].id).toBe('CRYPTO:BTC');
    expect(searchInstruments('altın').some((r) => r.id === 'COMMODITY:GAU')).toBe(true);
    expect(searchInstruments('ethereum', { market: 'CRYPTO' })[0].id).toBe('CRYPTO:ETH');
    expect(searchInstruments('')).toEqual([]);
  });

  it('offers a typed ticker that is not in a catalog', () => {
    const r = searchInstruments('zzzq');
    expect(r.map((x) => x.id)).toEqual(['BIST:ZZZQ', 'US:ZZZQ', 'CRYPTO:ZZZQ']);
    expect(r.every((x) => x.unverified)).toBe(true);
    expect(searchInstruments('zzzq', { market: 'US' }).map((x) => x.id)).toEqual(['US:ZZZQ']);
  });
});

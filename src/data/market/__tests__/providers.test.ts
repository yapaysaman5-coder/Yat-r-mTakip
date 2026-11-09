import { describe, expect, it } from '@jest/globals';

import { createHttp } from '../http';
import { binance, parseKlines, parseTradingDay } from '../providers/binance';
import { coingecko, parseMarketChart, parseSimplePrice } from '../providers/coingecko';
import { isyatirim, parseHisseTekil, yearChunks } from '../providers/isyatirim';
import { mock } from '../providers/mock';
import { parseTcmb, tcmb } from '../providers/tcmb';
import { parseChartHistory, parseChartQuote, yahoo } from '../providers/yahoo';
import { MarketError } from '../types';
import { fakeHttp, fixture } from './fakeHttp';

/** Every fixture was recorded from the real source on 9 Nov 2026. */
describe('Binance (recorded responses)', () => {
  it('reads today’s price and the Istanbul-midnight open', () => {
    const q = parseTradingDay(fixture('binance-tradingDay.json'), 1794234500000);
    expect([...q.keys()].sort()).toEqual([
      'BTCTRY',
      'BTCUSDT',
      'ETHUSDT',
      'EURUSDT',
      'PAXGTRY',
      'USDTTRY',
    ]);
    expect(q.get('BTCUSDT')).toEqual({
      price: 74488.51,
      prevClose: 75743.85,
      time: 1794234500000,
      delayMinutes: 0,
    });
  });

  it('reads daily candles on Istanbul days', () => {
    const k = parseKlines(fixture('binance-klines-BTCUSDT.json'));
    expect(k).toHaveLength(10);
    expect(k[k.length - 1].date).toBe('2026-11-09');
    expect(new Set(k.map((c) => c.date)).size).toBe(10);
    expect(k.every((c) => c.close > 10_000)).toBe(true);
  });

  it('falls back to single requests when one symbol is unknown', async () => {
    const one = (s: string) =>
      JSON.stringify([{ symbol: s, openPrice: '1', lastPrice: '2', closeTime: 0 }]);
    const http = fakeHttp([
      [/symbols=%5B%22BTCUSDT%22%2C%22NOPEUSDT%22%5D/, new MarketError('http', 'bad', 400)],
      [/symbols=%5B%22BTCUSDT%22%5D/, one('BTCUSDT')],
      [/NOPEUSDT/, new MarketError('http', 'bad', 400)],
    ]);
    const q = await binance.quotes(['BTCUSDT', 'NOPEUSDT'], http);
    expect([...q.keys()]).toEqual(['BTCUSDT']);
  });

  it('uses the second host when the first is refused, and pages long histories', async () => {
    const page = (start: number, n: number) =>
      JSON.stringify(
        Array.from({ length: n }, (_, i) => [start + i * 86_400_000, '1', '1', '1', String(i + 1)]),
      );
    let pages = 0;
    const http = fakeHttp([
      [/data-api\.binance\.vision/, new MarketError('http', 'refused', 451)],
      [
        /api\.binance\.com\/api\/v3\/klines/,
        (url) => {
          const start = Number(/startTime=(\d+)/.exec(url)![1]);
          return page(start, pages++ === 0 ? 1000 : 5);
        },
      ],
    ]);
    const h = await binance.history('BTCUSDT', '2023-01-01', '2026-01-01', http);
    expect(h.closes).toHaveLength(1005);
    expect(h.closes[999].date < h.closes[1000].date).toBe(true);
    expect(http.calls.filter((u) => u.includes('api.binance.com'))).toHaveLength(2);
  });
});

describe('CoinGecko (recorded responses)', () => {
  it('reads USD prices and derives the previous price from the 24h change', () => {
    const q = parseSimplePrice(fixture('coingecko-simple.json'));
    const btc = q.get('bitcoin')!;
    expect(btc.price).toBe(74536);
    expect(btc.prevClose! * (1 - 0.01694097503215)).toBeCloseTo(
      (74536 * (1 - 0.01694097503215)) / (1 - 0.016940975032151782),
      6,
    );
    expect(btc.time).toBe(1794234475000);
  });

  it('turns 00:00 UTC points into the previous Istanbul day', () => {
    const c = parseMarketChart(fixture('coingecko-chart-bitcoin.json'));
    expect(c.map((x) => x.date)).toEqual([
      '2026-11-04',
      '2026-11-05',
      '2026-11-06',
      '2026-11-07',
      '2026-11-08',
      '2026-11-09',
    ]);
  });

  it('asks for every id at once', async () => {
    const http = fakeHttp([[/simple\/price/, fixture('coingecko-simple.json')]]);
    const q = await coingecko.quotes(['bitcoin', 'ethereum'], http);
    expect(q.size).toBe(3);
    expect(http.calls[0]).toContain('ids=bitcoin,ethereum');
    expect((await coingecko.quotes([], http)).size).toBe(0);
  });
});

describe('İş Yatırım (recorded response)', () => {
  const text = fixture('isyatirim-THYAO.json');

  it('reads unadjusted BIST closes, BIST 100 and USD/TRY from the same rows', () => {
    expect(parseHisseTekil(text, 'THYAO').closes).toEqual([
      { date: '2026-11-02', close: 261 },
      { date: '2026-11-03', close: 265 },
      { date: '2026-11-04', close: 291.25 },
      { date: '2026-11-05', close: 297 },
      { date: '2026-11-06', close: 299.25 },
    ]);
    expect(parseHisseTekil(text, '@XU100').closes[0]).toEqual({
      date: '2026-11-02',
      close: 10961.67,
    });
    expect(parseHisseTekil(text, '@USDTRY').closes[4]).toEqual({
      date: '2026-11-06',
      close: 50.0724,
    });
  });

  it('spots a bonus issue from the adjusted series and reports errors', () => {
    const rows = [
      { HGDG_TARIH: '01-07-2026', HG_KAPANIS: 200, HGDG_KAPANIS: 100 },
      { HGDG_TARIH: '02-07-2026', HG_KAPANIS: 101, HGDG_KAPANIS: 101 },
    ];
    const h = parseHisseTekil(JSON.stringify({ ok: true, value: rows }), 'ABC');
    expect(h.splits).toEqual([{ date: '2026-07-02', ratio: '2.00' }]);
    expect(() => parseHisseTekil('{"ok":false,"errorDescription":"x"}', 'ABC')).toThrow(
      MarketError,
    );
  });

  it('asks one calendar year at a time and gives end-of-day quotes', async () => {
    expect(yearChunks('2024-03-05', '2026-02-01')).toEqual([
      ['2024-03-05', '2024-12-31'],
      ['2025-01-01', '2025-12-31'],
      ['2026-01-01', '2026-02-01'],
    ]);
    const http = fakeHttp([[/HisseTekil/, text]]);
    const q = await isyatirim.quotes(['THYAO'], http);
    expect(q.get('THYAO')).toMatchObject({ price: 299.25, prevClose: 297, endOfDay: true });
    const empty = fakeHttp([[/HisseTekil/, '{"ok":true,"value":[]}']]);
    await expect(
      isyatirim.history('NOPE', '2026-01-01', '2026-02-01', empty),
    ).rejects.toMatchObject({
      kind: 'not_found',
    });
    expect((await isyatirim.quotes(['NOPE'], empty)).size).toBe(0);
  });
});

describe('TCMB (recorded response)', () => {
  it('reads the daily mid rates', async () => {
    const { date, rates } = parseTcmb(fixture('tcmb-today.xml'));
    expect(date).toBe('2026-11-09');
    expect(rates.get('USD')).toBeCloseTo((50.0878 + 50.178) / 2, 8);
    const q = await tcmb.quotes(
      ['USD', 'XYZ'],
      fakeHttp([[/today\.xml/, fixture('tcmb-today.xml')]]),
    );
    expect([...q.keys()]).toEqual(['USD']);
    expect(q.get('USD')?.endOfDay).toBe(true);
    await expect(tcmb.history('USD', '2026-01-01', '2026-02-01', fakeHttp([]))).rejects.toThrow();
    expect(() => parseTcmb('<x/>')).toThrow(MarketError);
  });
});

describe('Yahoo (recorded responses)', () => {
  it('reads the price, previous close and time', () => {
    expect(parseChartQuote(fixture('yahoo-chart-THYAO-1d.json'), 'THYAO.IS')).toEqual({
      price: 308.75,
      prevClose: 299.25,
      time: 1794234704000,
      delayMinutes: 15,
    });
  });

  it('turns split-adjusted closes back into traded prices and lists the split (NVDA 10:1)', () => {
    const h = parseChartHistory(fixture('yahoo-chart-NVDA-split.json'));
    const byDay = Object.fromEntries(h.closes.map((c) => [c.date, c.close]));
    expect(byDay['2024-06-03']).toBeCloseTo(1150, 6); // traded at ~1150 before the split
    expect(byDay['2024-06-07']).toBeCloseTo(1208.8800048828125, 6);
    expect(byDay['2024-06-10']).toBeCloseTo(121.79000091552734, 9); // ex-date: new units
    expect(h.splits).toEqual([{ date: '2024-06-10', ratio: '10' }]);
    expect(h.dividends).toEqual([{ date: '2024-06-11', amount: 0.01 }]);
  });

  it('reports unknown symbols, and tries the second host on other errors', async () => {
    const notFound = fakeHttp([[/chart/, fixture('yahoo-chart-notfound.json')]]);
    await expect(yahoo.history('NOPE', '2026-01-01', '2026-02-01', notFound)).rejects.toMatchObject(
      {
        kind: 'not_found',
      },
    );
    const http = fakeHttp([
      [/query1/, new MarketError('http', 'rate limited', 429)],
      [/query2.*THYAO/, fixture('yahoo-chart-THYAO-1d.json')],
      [/query2.*AAPL/, new MarketError('not_found', 'x', 404)],
    ]);
    const q = await yahoo.quotes(['THYAO.IS', 'AAPL'], http);
    expect([...q.keys()]).toEqual(['THYAO.IS']);
    await expect(yahoo.quotes(['AAPL'], http)).rejects.toBeInstanceOf(MarketError);
  });
});

describe('HTTP client', () => {
  it('maps failures to typed errors', async () => {
    const ok = createHttp(async () => new Response('hello', { status: 200 }));
    expect(await ok('https://a.example/x')).toBe('hello');
    const status = createHttp(async () => new Response('no', { status: 429 }));
    await expect(status('https://a.example/x')).rejects.toMatchObject({
      kind: 'http',
      status: 429,
    });
    const missing = createHttp(async () => new Response('no', { status: 404 }));
    await expect(missing('https://a.example/x')).rejects.toMatchObject({ kind: 'not_found' });
    const offline = createHttp(async () => {
      throw new TypeError('Network request failed');
    });
    await expect(offline('https://a.example/x')).rejects.toMatchObject({ kind: 'network' });
    const slow = createHttp(
      (_url, init) =>
        new Promise((_, reject) =>
          init?.signal?.addEventListener('abort', () => reject(new Error('aborted'))),
        ),
      20,
    );
    await expect(slow('https://a.example/x')).rejects.toMatchObject({ kind: 'timeout' });
  });
});

describe('mock source', () => {
  it('is deterministic and ends at today’s level', async () => {
    const a = await mock.quotes(['THYAO.IS', 'XYZ'], fakeHttp([]));
    const b = await mock.quotes(['THYAO.IS'], fakeHttp([]));
    expect(a.get('THYAO.IS')!.price).toBe(301.5);
    expect(b.get('THYAO.IS')!.prevClose).toBe(a.get('THYAO.IS')!.prevClose);
    const h = await mock.history('THYAO.IS', '2026-01-01', '2026-01-31', fakeHttp([]));
    expect(h.closes.length).toBeGreaterThan(0);
  });
});

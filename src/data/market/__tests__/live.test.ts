/**
 * Live check against the real sources. Skipped unless LIVE=1 (network access needed):
 *   LIVE=1 NODE_USE_ENV_PROXY=1 npx jest src/data/market/__tests__/live.test.ts
 * Prints what each source returned, for the test report.
 */
import { describe, expect, it } from '@jest/globals';

import { addDays, trDay } from '@/domain';

import { createHttp } from '../http';
import { instrumentFor } from '../instruments';
import { binance } from '../providers/binance';
import { coingecko } from '../providers/coingecko';
import { isyatirim } from '../providers/isyatirim';
import { tcmb } from '../providers/tcmb';
import { tcmbCpi } from '../providers/tcmbCpi';
import { yahoo } from '../providers/yahoo';
import { lookupCoins } from '../lookup';
import { MarketRouter } from '../router';
import { PriceStream, streamablePairs, type SocketLike, type StreamPrice } from '../stream';
import { migrate } from '../../db/migrations';
import { openNodeDriver } from '../../db/nodeDriver';
import { upsertAssets } from '../../repo/assets';
import { insertPortfolio } from '../../repo/portfolios';
import { loadPortfolioData } from '../../service/load';
import { marketNeeds, refreshQuotes, storeStreamPrices, syncHistory } from '../../service/market';
import { ensureAsset } from '../../service/trade';
import { saveTransaction } from '../../service/transactions';
import { buildAnalysis } from '../../view/analysisView';
import { buildPortfolioView } from '../../view/portfolioView';

const live = process.env.LIVE === '1' ? describe : describe.skip;

live('real sources', () => {
  it('prices the watchlist and downloads history', async () => {
    const router = new MarketRouter(
      { yahoo, binance, coingecko, isyatirim, tcmb, tcmbcpi: tcmbCpi },
      createHttp(fetch, 20_000),
    );
    const ids = [
      'BIST:THYAO',
      'BIST:ASELS',
      'INDEX:XU100',
      'FX:USDTRY',
      'FX:EURTRY',
      'COMMODITY:GAU',
      'CRYPTO:BTC',
      'CRYPTO:ETH',
      'CRYPTO:AVAX',
      'US:AAPL',
      'INDEX:SPX',
    ];
    const r = await router.quotes(ids.map((id) => instrumentFor(id)!));
    const lines = ids.map((id) => {
      const q = r.quotes.get(id);
      return q
        ? `${id.padEnd(15)} ${q.price.toFixed(4).padStart(14)} önceki ${q.prevClose?.toFixed(4) ?? '—'} · ${q.source}${q.endOfDay ? ' (gün sonu)' : ''}`
        : `${id.padEnd(15)} ✗ ${r.failed.get(id)}`;
    });
    const today = trDay(Date.now());
    const hist: string[] = [];
    for (const id of ['BIST:THYAO', 'INDEX:XU100', 'FX:USDTRY', 'COMMODITY:GAU', 'CRYPTO:BTC']) {
      try {
        const h = await router.history(instrumentFor(id)!, addDays(today, -400), today);
        hist.push(
          `${id.padEnd(15)} ${h.closes.length} gün (${h.closes[0]?.date} → ${h.closes.at(-1)?.date}) · ${h.source}`,
        );
      } catch (e) {
        hist.push(`${id.padEnd(15)} ✗ ${(e as Error).message}`);
      }
    }
    console.log(
      [
        'CANLI FİYATLAR',
        ...lines,
        '',
        'GEÇMİŞ (400 gün)',
        ...hist,
        '',
        JSON.stringify(router.status()),
      ].join('\n'),
    );
    expect(r.quotes.get('CRYPTO:BTC')?.price).toBeGreaterThan(1000);
    expect(r.quotes.get('FX:USDTRY')?.price).toBeGreaterThan(1);
    expect(r.quotes.get('BIST:THYAO')?.price).toBeGreaterThan(1);
  }, 120_000);

  it('runs the phone’s whole flow on real prices', async () => {
    const router = new MarketRouter(
      { yahoo, binance, coingecko, isyatirim, tcmb, tcmbcpi: tcmbCpi },
      createHttp(fetch, 20_000),
    );
    const db = openNodeDriver();
    await migrate(db);
    const now = new Date();
    await insertPortfolio(db, {
      id: 'main',
      name: 'Ana Portföy',
      kind: 'user',
      sortOrder: 0,
      seriesDirtyFrom: null,
      createdAt: now.toISOString(),
    });
    await upsertAssets(
      db,
      [
        { id: 'BIST:THYAO', symbol: 'THYAO', market: 'BIST', currency: 'TRY' },
        { id: 'US:AAPL', symbol: 'AAPL', market: 'US', currency: 'USD' },
        { id: 'CRYPTO:BTC', symbol: 'BTC', market: 'CRYPTO', currency: 'USD' },
      ],
      now.toISOString(),
    );
    const save = (t: Parameters<typeof saveTransaction>[2]) =>
      saveTransaction(db, 'main', t, { now });
    await save({ id: '', type: 'DEPOSIT', ts: '2026-01-05T07:00:00Z', amount: '500000' });
    await save({
      id: '',
      type: 'BUY',
      ts: '2026-01-06T08:00:00Z',
      assetId: 'BIST:THYAO',
      quantity: '500',
      price: '280',
      fee: '28',
    });
    await save({
      id: '',
      type: 'BUY',
      ts: '2026-02-10T16:00:00Z',
      assetId: 'US:AAPL',
      quantity: '50',
      price: '250',
      fee: '1',
      fxRate: '43.5',
    });
    await save({
      id: '',
      type: 'BUY',
      ts: '2026-03-02T20:00:00Z',
      assetId: 'CRYPTO:BTC',
      quantity: '0.5',
      price: '90000',
      fee: '45',
      fxRate: '43.9',
    });

    const t0 = Date.now();
    const needs = await marketNeeds(db, now);
    const sync = await syncHistory(db, router, needs, { now });
    const t1 = Date.now();
    const live = needs.live.map((id) => needs.instruments.get(id)!);
    const quotes = await refreshQuotes(db, router, live, { now });
    const t2 = Date.now();
    const view = buildPortfolioView((await loadPortfolioData(db, 'main', { now }))!);
    const analysis = buildAnalysis(view);
    const lines = [
      'UÇTAN UCA (gerçek fiyatlarla)',
      `geçmiş: ${sync.synced.length} enstrüman indirildi, ${sync.failed.size} hata, ${t1 - t0} ms`,
      `canlı: ${quotes.quotes.size} fiyat, ${quotes.failed.size} hata, ${t2 - t1} ms`,
      ...view.holdings.map(
        (h) =>
          `${h.symbol.padEnd(6)} ${h.quantity} × ${h.price.toFixed(2)} ${h.currency} = ₺${h.valueTRY.toFixed(2)} (bugün ₺${h.dailyChangeTRY.toFixed(2)}) · ${h.quote?.source}`,
      ),
      `toplam ₺${view.summary.totalValue.toFixed(2)} · net K/Z ₺${view.summary.netPnl.toFixed(2)} · bugün ₺${view.summary.dailyChange.toFixed(2)}`,
      `seri: ${view.series.dates.length} gün, son değer ₺${view.series.values.at(-1)?.toFixed(2)}`,
      `TWR ${(analysis.metrics!.twr * 100).toFixed(2)}% · XIRR ${((analysis.metrics!.xirr ?? 0) * 100).toFixed(2)}% · Alpha ${((analysis.metrics!.alpha ?? 0) * 100).toFixed(2)}% · β ${analysis.metrics!.beta?.toFixed(2)}`,
      'Ya Olsaydı (bugünkü değer):',
      ...analysis.series.map((s) => `  ${s.name.padEnd(14)} ₺${s.values.at(-1)!.toFixed(0)}`),
    ];
    console.log(lines.join('\n'));
    expect(view.holdings).toHaveLength(3);
    expect(view.series.values.at(-1)).toBeCloseTo(view.summary.totalValue, 4);
    expect(analysis.series.length).toBeGreaterThan(5);

    // The live socket, as on the phone: the coins among the live instruments.
    const pairs = streamablePairs(live);
    expect([...pairs.values()]).toEqual(['CRYPTO:BTC', 'CRYPTO:ETH']); // held + watchlist
    const last = new Map<string, { price: number; time: number }>();
    const stream = new PriceStream({
      connect: (url) => new WebSocket(url) as unknown as SocketLike,
      onPrices: (ps) => ps.forEach((p) => last.set(pairs.get(p.pair)!, p)),
    });
    stream.watch(pairs.keys());
    for (let i = 0; i < 75 && last.size < 2; i++) await new Promise((r) => setTimeout(r, 200));
    stream.stop();
    const polled = view.holdings.find((h) => h.symbol === 'BTC')!;
    await storeStreamPrices(db, live, last, { now: new Date() });
    const after = buildPortfolioView((await loadPortfolioData(db, 'main', { now: new Date() }))!);
    const btc = after.holdings.find((h) => h.symbol === 'BTC')!;
    console.log(
      `akış: BTC ${polled.price} → ${btc.price} USD (gün başı ${btc.prevClose}), toplam ₺${after.summary.totalValue.toFixed(2)}`,
    );
    expect(btc.price).toBe(last.get('CRYPTO:BTC')!.price);
    expect(btc.prevClose).toBe(polled.prevClose); // the day's reference is kept
    expect(after.series.values.at(-1)).toBeCloseTo(after.summary.totalValue, 4);
  }, 180_000);

  it('receives crypto prices over the stream', async () => {
    const got: StreamPrice[] = [];
    const statuses: string[] = [];
    const stream = new PriceStream({
      connect: (url) => new WebSocket(url) as unknown as SocketLike,
      onPrices: (p) => got.push(...p),
      onStatus: (s) => statuses.push(s),
    });
    stream.watch(['BTCUSDT', 'ETHUSDT']);
    const started = Date.now();
    while (new Set(got.map((p) => p.pair)).size < 2 && Date.now() - started < 15_000)
      await new Promise((r) => setTimeout(r, 200));
    stream.stop();
    console.log('stream', statuses.join(' → '), got.slice(0, 3));
    expect(statuses).toContain('open');
    expect(new Set(got.map((p) => p.pair))).toEqual(new Set(['BTCUSDT', 'ETHUSDT']));
    expect(got.every((p) => p.price > 0 && Math.abs(p.time - Date.now()) < 60_000)).toBe(true);
  }, 20_000);

  it('finds a coin outside the catalog and prices it from CoinGecko', async () => {
    const http = createHttp(fetch, 20_000);
    const found = await lookupCoins('bob', http);
    const first = found.candidates[0];
    console.log(
      'arama "bob":',
      found.reached,
      found.candidates.map((c) => `${c.source}:${c.ref} #${c.rank ?? '-'} $${c.priceUSD}`),
    );
    expect(found.reached.coingecko).toBe(true);
    expect(first.source).toBe('coingecko');

    const db = openNodeDriver();
    await migrate(db);
    const now = new Date();
    await insertPortfolio(db, {
      id: 'main',
      name: 'Ana Portföy',
      kind: 'user',
      sortOrder: 0,
      seriesDirtyFrom: null,
      createdAt: now.toISOString(),
    });
    await ensureAsset(db, {
      id: first.assetId,
      symbol: first.symbol,
      name: first.name,
      market: 'CRYPTO',
      currency: 'USD',
      providerSymbol: `coingecko:${first.ref}`,
    });
    const day = addDays(trDay(now), -20);
    await saveTransaction(
      db,
      'main',
      { id: '', type: 'DEPOSIT', ts: `${day}T07:00:00Z`, amount: '1000' },
      { now },
    );
    await saveTransaction(
      db,
      'main',
      {
        id: '',
        type: 'BUY',
        ts: `${day}T08:00:00Z`,
        assetId: first.assetId,
        quantity: '1000',
        price: String(first.priceUSD ?? 1),
        fxRate: '42',
      },
      { now },
    );
    const router = new MarketRouter(
      { yahoo, binance, coingecko, isyatirim, tcmb, tcmbcpi: tcmbCpi },
      http,
    );
    const needs = await marketNeeds(db, now);
    const sync = await syncHistory(db, router, needs, { now });
    const live = await refreshQuotes(
      db,
      router,
      needs.live.map((id) => needs.instruments.get(id)!),
      { now },
    );
    console.log('canlı:', [...live.quotes.keys()], [...live.failed]);
    const view = buildPortfolioView((await loadPortfolioData(db, 'main', { now }))!);
    const h = view.holdings.find((x) => x.assetId === first.assetId)!;
    console.log(
      `${h.symbol} (${h.name}): ${h.price} USD, kaynak ${h.quote?.source}, fiyatsız: ${h.stale}, geçmiş ${sync.failed.get(first.assetId) ?? 'tamam'}, seri ${view.series.dates.length} gün`,
    );
    expect(h.stale).toBe(false);
    expect(h.quote?.source).toBe('coingecko');
    expect(sync.failed.has(first.assetId)).toBe(false);
  }, 60_000);
});

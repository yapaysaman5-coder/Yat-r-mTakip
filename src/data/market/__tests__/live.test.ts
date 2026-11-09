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
import { yahoo } from '../providers/yahoo';
import { MarketRouter } from '../router';
import { migrate } from '../../db/migrations';
import { openNodeDriver } from '../../db/nodeDriver';
import { upsertAssets } from '../../repo/assets';
import { insertPortfolio } from '../../repo/portfolios';
import { loadPortfolioData } from '../../service/load';
import { marketNeeds, refreshQuotes, syncHistory } from '../../service/market';
import { saveTransaction } from '../../service/transactions';
import { buildAnalysis } from '../../view/analysisView';
import { buildPortfolioView } from '../../view/portfolioView';

const live = process.env.LIVE === '1' ? describe : describe.skip;

live('real sources', () => {
  it('prices the watchlist and downloads history', async () => {
    const router = new MarketRouter(
      { yahoo, binance, coingecko, isyatirim, tcmb },
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
      { yahoo, binance, coingecko, isyatirim, tcmb },
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
  }, 180_000);
});

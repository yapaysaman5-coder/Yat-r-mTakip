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
});

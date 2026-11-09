import type { Currency, Market } from '@/domain';

import bistCatalog from './catalog/bist.json';
import cryptoCatalog from './catalog/crypto.json';
import { US_CATALOG } from './catalog/us';
import { FIXED_INSTRUMENTS } from './instruments';

/**
 * Offline symbol search over the embedded catalogs (BIST from İş Yatırım's company list,
 * crypto from CoinGecko's top coins with Binance pairs, popular US stocks and ETFs). A ticker
 * that is not in a catalog can still be added: the result list ends with it, and its price
 * source confirms it exists.
 */
export interface SearchResult {
  /** Asset id, e.g. "BIST:THYAO". */
  id: string;
  symbol: string;
  name: string;
  market: Market;
  currency: Currency;
  /** Sector, "ETF", … */
  detail?: string;
  /** Not in a catalog: only the symbol the person typed. */
  unverified?: boolean;
}

type BistRow = [symbol: string, name: string, sector: string, marketValue: number];
type CryptoRow = [symbol: string, name: string, coingeckoId: string, binancePair: string | null];

const fold = (s: string) =>
  s
    .toLocaleLowerCase('tr')
    .replace(/ı/g, 'i')
    .replace(/[çğöşü]/g, (c) => ({ ç: 'c', ğ: 'g', ö: 'o', ş: 's', ü: 'u' })[c] ?? c)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

interface Entry extends SearchResult {
  key: string;
  rank: number;
}

const ENTRIES: Entry[] = [
  ...(bistCatalog as BistRow[]).map((r, i) => ({
    id: `BIST:${r[0]}`,
    symbol: r[0],
    name: r[1],
    market: 'BIST' as const,
    currency: 'TRY' as const,
    detail: r[2],
    key: fold(`${r[0]} ${r[1]}`),
    rank: i,
  })),
  ...US_CATALOG.map(([symbol, name, kind], i) => ({
    id: `US:${symbol}`,
    symbol,
    name,
    market: 'US' as const,
    currency: 'USD' as const,
    detail: kind,
    key: fold(`${symbol} ${name}`),
    rank: i,
  })),
  ...(cryptoCatalog as CryptoRow[]).map((r, i) => ({
    id: `CRYPTO:${r[0]}`,
    symbol: r[0],
    name: r[1],
    market: 'CRYPTO' as const,
    currency: 'USD' as const,
    key: fold(`${r[0]} ${r[1]}`),
    rank: i,
  })),
  ...FIXED_INSTRUMENTS.map((inst, i) => ({
    id: inst.id,
    symbol: inst.symbol,
    name: inst.name,
    market: inst.market,
    currency: inst.currency,
    key: fold(`${inst.symbol} ${inst.name}`),
    rank: i,
  })),
];

export const catalogSize = () => ({
  bist: (bistCatalog as BistRow[]).length,
  us: US_CATALOG.length,
  crypto: (cryptoCatalog as CryptoRow[]).length,
});

const SYMBOL = /^[A-Z0-9.-]{1,12}$/;

export function searchInstruments(
  query: string,
  { market, limit = 30 }: { market?: Market; limit?: number } = {},
): SearchResult[] {
  const q = fold(query.trim());
  if (!q) return [];
  const scored: { e: Entry; score: number }[] = [];
  for (const e of ENTRIES) {
    if (market && e.market !== market) continue;
    const sym = fold(e.symbol);
    let score: number;
    if (sym === q) score = 0;
    else if (sym.startsWith(q)) score = 1;
    else if (e.key.split(/\s+/).some((w) => w.startsWith(q))) score = 2;
    else if (e.key.includes(q)) score = 3;
    else continue;
    scored.push({ e, score });
  }
  scored.sort((a, b) => a.score - b.score || a.e.rank - b.e.rank);
  const results: SearchResult[] = scored.slice(0, limit).map(({ e }) => {
    const { key: _k, rank: _r, ...r } = e;
    return r;
  });

  // A ticker not in the catalogs (a new listing, a US stock outside the popular list).
  const typed = query.trim().toUpperCase();
  if (SYMBOL.test(typed) && !results.some((r) => r.symbol === typed)) {
    const markets: Market[] = market ? [market] : ['BIST', 'US', 'CRYPTO'];
    for (const m of markets) {
      if (m !== 'BIST' && m !== 'US' && m !== 'CRYPTO') continue;
      results.push({
        id: `${m}:${typed}`,
        symbol: typed,
        name: typed,
        market: m,
        currency: m === 'BIST' ? 'TRY' : 'USD',
        unverified: true,
      });
    }
  }
  return results;
}

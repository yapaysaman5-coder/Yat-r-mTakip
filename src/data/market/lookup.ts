import { inCryptoCatalog } from './instruments';
import { binancePairPrice } from './providers/binance';
import { coingecko, coingeckoSearch } from './providers/coingecko';
import { levelOf } from './providers/mock';
import type { Http } from './types';

/**
 * Finding a coin that is not in the embedded catalog (docs/03-TEKNIK-MIMARI.md §6.4):
 * - Binance: is there a `<SYMBOL>USDT` pair? Then it is priced like the catalog coins
 *   (live stream included).
 * - CoinGecko: every coin whose symbol or name matches, with its rank and price, because one
 *   symbol can belong to several coins. The person picks one; it is priced from CoinGecko.
 */
export interface CoinCandidate {
  /** Asset id the coin would get ("CRYPTO:<SYMBOL>"). */
  assetId: string;
  symbol: string;
  name: string;
  source: 'binance' | 'coingecko';
  /** Binance pair or CoinGecko coin id. */
  ref: string;
  rank: number | null;
  /** Current price in USD, when known. */
  priceUSD: number | null;
}

export interface LookupResult {
  candidates: CoinCandidate[];
  /** Which sources answered (a source that did not answer may still know the coin). */
  reached: { binance: boolean; coingecko: boolean };
}

const SYMBOL = /^[A-Z0-9]{1,12}$/;
const MAX_CANDIDATES = 8;

export async function lookupCoins(query: string, http: Http): Promise<LookupResult> {
  const q = query.trim();
  const symbol = q.toUpperCase();
  const reached = { binance: false, coingecko: false };
  if (q.length < 2) return { candidates: [], reached };

  const [listed, hits] = await Promise.all([
    SYMBOL.test(symbol)
      ? binancePairPrice(`${symbol}USDT`, http).then(
          (price) => {
            reached.binance = true;
            return price;
          },
          () => null,
        )
      : Promise.resolve(null),
    coingeckoSearch(q, http).then(
      (h) => {
        reached.coingecko = true;
        return h;
      },
      () => [],
    ),
  ]);

  const candidates: CoinCandidate[] = [];
  if (listed !== null) {
    candidates.push({
      assetId: `CRYPTO:${symbol}`,
      symbol,
      name: symbol,
      source: 'binance',
      ref: `${symbol}USDT`,
      rank: null,
      priceUSD: listed,
    });
  }
  // Exact symbol matches first (by rank), then the rest in CoinGecko's order.
  const usable = hits.filter((h) => SYMBOL.test(h.symbol) && !inCryptoCatalog(h.id));
  const byRank = (a: { rank: number | null }, b: { rank: number | null }) =>
    (a.rank ?? Infinity) - (b.rank ?? Infinity);
  const exact = usable.filter((h) => h.symbol === symbol).sort(byRank);
  const others = usable.filter((h) => h.symbol !== symbol);
  for (const h of [...exact, ...others].slice(0, MAX_CANDIDATES)) {
    candidates.push({
      assetId: `CRYPTO:${h.symbol}`,
      symbol: h.symbol,
      name: h.name,
      source: 'coingecko',
      ref: h.id,
      rank: h.rank,
      priceUSD: null,
    });
  }

  const ids = candidates.filter((c) => c.source === 'coingecko').map((c) => c.ref);
  if (ids.length) {
    const prices = await coingecko.quotes(ids, http).catch(() => new Map());
    for (const c of candidates) {
      if (c.source === 'coingecko') c.priceUSD = prices.get(c.ref)?.price ?? null;
    }
  }
  return { candidates, reached };
}

/** Fictional results for the web preview (browsers cannot reach the sources). */
export function mockLookup(query: string): LookupResult {
  const symbol = query.trim().toUpperCase();
  if (!SYMBOL.test(symbol) || symbol.length < 2) {
    return { candidates: [], reached: { binance: true, coingecko: true } };
  }
  const slug = symbol.toLowerCase();
  const coin = (ref: string, name: string, rank: number | null): CoinCandidate => ({
    assetId: `CRYPTO:${symbol}`,
    symbol,
    name,
    source: 'coingecko',
    ref,
    rank,
    // The same fictional level the preview's price source gives this coin.
    priceUSD: levelOf(ref),
  });
  return {
    reached: { binance: true, coingecko: true },
    candidates: [
      coin(`${slug}-network`, `${symbol} Network`, 812),
      coin(slug, symbol, 2390),
      coin(`${slug}-token`, `${symbol} Token`, null),
    ],
  };
}

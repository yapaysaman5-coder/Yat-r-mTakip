import { parseJson } from '../http';
import { trDay } from '../time';
import { EMPTY_HISTORY, MarketError, type MarketSource, type SourceQuote } from '../types';

/**
 * CoinGecko public API (no key; about 5–15 requests a minute). The fallback for crypto:
 * prices in USD, "previous close" derived from the 24-hour change, and up to a year of daily
 * history on the free tier.
 */
const BASE = 'https://api.coingecko.com/api/v3';
const DAY = 86_400_000;

interface SimplePrice {
  usd?: number;
  usd_24h_change?: number;
  last_updated_at?: number;
}

export function parseSimplePrice(text: string): Map<string, SourceQuote> {
  const data = parseJson<Record<string, SimplePrice>>(text, 'CoinGecko');
  const out = new Map<string, SourceQuote>();
  for (const [id, v] of Object.entries(data)) {
    if (!v || !(Number(v.usd) > 0)) continue;
    const change = v.usd_24h_change;
    out.set(id, {
      price: Number(v.usd),
      prevClose: typeof change === 'number' ? Number(v.usd) / (1 + change / 100) : null,
      time: (v.last_updated_at ?? 0) * 1000,
      delayMinutes: 0,
    });
  }
  return out;
}

/**
 * Daily points sit at 00:00 UTC, three hours after an Istanbul day ends: the nearest price to
 * that day's close, so it is filed under the Istanbul day before. The last point is "now".
 */
export function parseMarketChart(text: string): { date: string; close: number }[] {
  const data = parseJson<{ prices?: [number, number][] }>(text, 'CoinGecko');
  if (!Array.isArray(data.prices)) throw new MarketError('format', 'CoinGecko: fiyat yok');
  const byDay = new Map<string, number>();
  for (const [ms, price] of data.prices) {
    if (!(price > 0)) continue;
    byDay.set(ms % DAY === 0 ? trDay(ms - 3 * 3_600_000 - 1) : trDay(ms), price);
  }
  return [...byDay.entries()].map(([date, close]) => ({ date, close }));
}

export const coingecko: MarketSource = {
  id: 'coingecko',

  async quotes(refs, http) {
    if (refs.length === 0) return new Map();
    const ids = refs.map(encodeURIComponent).join(',');
    return parseSimplePrice(
      await http(
        `${BASE}/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_last_updated_at=true`,
      ),
    );
  },

  async history(ref, from, to, http) {
    const days = Math.min(365, Math.max(1, Math.ceil((Date.now() - Date.parse(from)) / DAY) + 1));
    const closes = parseMarketChart(
      await http(
        `${BASE}/coins/${encodeURIComponent(ref)}/market_chart?vs_currency=usd&days=${days}&interval=daily`,
      ),
    ).filter((c) => c.date >= from && c.date <= to);
    return { ...EMPTY_HISTORY, closes };
  },
};

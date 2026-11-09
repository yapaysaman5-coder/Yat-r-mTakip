import { parseJson } from '../http';
import { trDay, trDayEnd, trDayStart } from '../time';
import {
  EMPTY_HISTORY,
  MarketError,
  type Http,
  type MarketSource,
  type SourceQuote,
} from '../types';

/**
 * Binance public market data (no key). `data-api.binance.vision` serves only market data and
 * answers everywhere; `api.binance.com` is refused in some regions (HTTP 451), so it is only
 * the fallback host. `timeZone=3` makes daily candles and "today" follow Istanbul midnight.
 */
const HOSTS = ['https://data-api.binance.vision', 'https://api.binance.com'];
const MAX_SYMBOLS = 100;

interface TradingDay {
  symbol: string;
  openPrice: string;
  lastPrice: string;
  closeTime: number;
}

type Kline = [number, string, string, string, string, ...unknown[]];

async function get(http: Http, path: string): Promise<string> {
  let last: unknown;
  for (const host of HOSTS) {
    try {
      return await http(`${host}${path}`);
    } catch (e) {
      last = e;
      // A refused region or a server error: try the other host. A bad symbol stays bad.
      if (e instanceof MarketError && e.kind === 'http' && e.status === 400) throw e;
    }
  }
  throw last;
}

export function parseTradingDay(text: string, now: number): Map<string, SourceQuote> {
  const rows = parseJson<TradingDay[] | TradingDay>(text, 'Binance');
  const list = Array.isArray(rows) ? rows : [rows];
  const out = new Map<string, SourceQuote>();
  for (const r of list) {
    const price = Number(r.lastPrice);
    const open = Number(r.openPrice);
    if (!r.symbol || !(price > 0)) continue;
    out.set(r.symbol, {
      price,
      prevClose: open > 0 ? open : null,
      time: Math.min(now, r.closeTime ?? now),
      delayMinutes: 0,
    });
  }
  return out;
}

export function parseKlines(text: string): { date: string; close: number }[] {
  const rows = parseJson<Kline[]>(text, 'Binance');
  if (!Array.isArray(rows)) throw new MarketError('format', 'Binance: beklenmeyen yanıt');
  return rows.map((k) => ({ date: trDay(k[0]), close: Number(k[4]) }));
}

export const binance: MarketSource = {
  id: 'binance',

  async quotes(refs, http) {
    const out = new Map<string, SourceQuote>();
    const query = async (symbols: readonly string[]) => {
      const list = encodeURIComponent(JSON.stringify(symbols));
      const text = await get(
        http,
        `/api/v3/ticker/tradingDay?symbols=${list}&timeZone=3&type=MINI`,
      );
      for (const [k, v] of parseTradingDay(text, Date.now())) out.set(k, v);
    };
    for (let i = 0; i < refs.length; i += MAX_SYMBOLS) {
      const chunk = refs.slice(i, i + MAX_SYMBOLS);
      try {
        await query(chunk);
      } catch (e) {
        // One unknown symbol fails the whole request: ask one by one to keep the rest.
        if (!(e instanceof MarketError && e.status === 400) || chunk.length === 1) throw e;
        for (const s of chunk) await query([s]).catch(() => undefined);
      }
    }
    return out;
  },

  async history(ref, from, to, http) {
    const closes: { date: string; close: number }[] = [];
    let start = trDayStart(from);
    const end = trDayEnd(to);
    while (start <= end) {
      const text = await get(
        http,
        `/api/v3/klines?symbol=${ref}&interval=1d&timeZone=3&startTime=${start}&endTime=${end}&limit=1000`,
      );
      const page = parseKlines(text);
      if (page.length === 0) break;
      closes.push(...page);
      if (page.length < 1000) break;
      start = trDayStart(page[page.length - 1].date) + 86_400_000;
    }
    return { ...EMPTY_HISTORY, closes };
  },
};

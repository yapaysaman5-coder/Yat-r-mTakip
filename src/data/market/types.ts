/**
 * Market data, normalized (docs/03-TEKNIK-MIMARI.md §6). Every source adapter turns its own
 * response format into these shapes; nothing outside src/data/market knows a source's format.
 */

export type SourceId = 'yahoo' | 'binance' | 'coingecko' | 'isyatirim' | 'tcmb' | 'mock';

/** A live (or latest) price as a source reports it, in the instrument's own unit. */
export interface SourceQuote {
  price: number;
  /** Previous session's close (for crypto: the price at Istanbul midnight). */
  prevClose: number | null;
  /** When the price was last updated at the source (epoch ms). */
  time: number;
  /** How far behind real time the source is, in minutes (free BIST data: 15). */
  delayMinutes: number;
  /** An end-of-day value (yesterday's close, the central bank's daily rate), not a live one. */
  endOfDay?: boolean;
}

export interface DailyClose {
  /** Istanbul trading day, yyyy-mm-dd. */
  date: string;
  close: number;
}

export interface SplitInfo {
  /** First day at the new unit count (ex-date), yyyy-mm-dd. */
  date: string;
  /** Units after ÷ units before, e.g. "2" for 2:1. */
  ratio: string;
}

export interface DividendInfo {
  date: string;
  /** Per unit, in the instrument's currency. */
  amount: number;
}

export interface SourceHistory {
  closes: DailyClose[];
  splits: SplitInfo[];
  dividends: DividendInfo[];
}

/** One source's adapter. `ref` is the instrument's code at that source (THYAO.IS, BTCUSDT…). */
export interface MarketSource {
  id: SourceId;
  /** Several instruments in as few requests as possible; missing ones are left out. */
  quotes(refs: readonly string[], http: Http): Promise<Map<string, SourceQuote>>;
  /** Daily closes for [from, to] (Istanbul days, inclusive). */
  history(ref: string, from: string, to: string, http: Http): Promise<SourceHistory>;
}

/** Fetches a URL and returns the body text; throws a MarketError on any failure. */
export type Http = (url: string, init?: { timeoutMs?: number }) => Promise<string>;

export type MarketErrorKind =
  /** No connection (or DNS / TLS failure): the phone is probably offline. */
  | 'network'
  | 'timeout'
  /** The source answered with an error status (rate limit, blocked region, …). */
  | 'http'
  /** The source answered, but not in the expected format. */
  | 'format'
  /** The source does not know this instrument. */
  | 'not_found';

export class MarketError extends Error {
  constructor(
    readonly kind: MarketErrorKind,
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'MarketError';
  }
}

export const EMPTY_HISTORY: SourceHistory = { closes: [], splits: [], dividends: [] };

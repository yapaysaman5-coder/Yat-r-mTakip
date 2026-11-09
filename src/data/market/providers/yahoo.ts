import { parseJson } from '../http';
import { trDay, unixStart } from '../time';
import {
  MarketError,
  type Http,
  type MarketSource,
  type SourceHistory,
  type SourceQuote,
} from '../types';

/**
 * Yahoo Finance chart endpoint (no key; unofficial). Primary source for BIST (".IS", 15
 * minutes delayed), US stocks and indices, currencies ("USDTRY=X") and futures ("GC=F").
 *
 * Yahoo's daily closes are adjusted for splits. They are turned back into the prices that
 * were actually traded, so every source stores the same kind of close and the person's own
 * SPLIT records keep the books right; the splits themselves are returned separately.

 */
const HOSTS = ['https://query1.finance.yahoo.com', 'https://query2.finance.yahoo.com'];
const CONCURRENCY = 4;

interface ChartResult {
  meta: {
    symbol?: string;
    currency?: string;
    regularMarketPrice?: number;
    regularMarketTime?: number;
    previousClose?: number;
    chartPreviousClose?: number;
  };
  timestamp?: number[];
  indicators?: { quote?: { close?: (number | null)[] }[] };
  events?: {
    splits?: Record<string, { date: number; numerator: number; denominator: number }>;
    dividends?: Record<string, { date: number; amount: number }>;
  };
}

interface ChartResponse {
  chart?: { result?: ChartResult[] | null; error?: { code?: string; description?: string } | null };
}

function result(text: string): ChartResult {
  const data = parseJson<ChartResponse>(text, 'Yahoo');
  const r = data.chart?.result?.[0];
  if (!r) {
    const err = data.chart?.error;
    throw new MarketError(
      err?.code === 'Not Found' ? 'not_found' : 'format',
      `Yahoo: ${err?.description ?? 'veri yok'}`,
    );
  }
  return r;
}

const delayFor = (symbol: string) => (symbol.endsWith('.IS') ? 15 : 0);

export function parseChartQuote(text: string, symbol: string): SourceQuote {
  const { meta } = result(text);
  const price = Number(meta.regularMarketPrice);
  if (!(price > 0)) throw new MarketError('format', `Yahoo: ${symbol} fiyatı yok`);
  const prev = meta.previousClose ?? meta.chartPreviousClose;
  return {
    price,
    prevClose: prev && prev > 0 ? prev : null,
    time: (meta.regularMarketTime ?? 0) * 1000,
    delayMinutes: delayFor(symbol),
  };
}

export function parseChartHistory(text: string): SourceHistory {
  const r = result(text);
  const times = r.timestamp ?? [];
  const closes = r.indicators?.quote?.[0]?.close ?? [];
  const splits = Object.values(r.events?.splits ?? {})
    .filter((s) => s.numerator > 0 && s.denominator > 0)
    .map((s) => ({ time: s.date * 1000, ratio: s.numerator / s.denominator }))
    .sort((a, b) => a.time - b.time);

  // Undo the split adjustment: a close before a split is multiplied by the splits after it.
  const out = new Map<string, number>();
  times.forEach((t, i) => {
    const c = closes[i];
    if (c === null || c === undefined || !(c > 0)) return;
    const ms = t * 1000;
    const factor = splits.filter((s) => s.time > ms).reduce((f, s) => f * s.ratio, 1);
    out.set(trDay(ms), c * factor);
  });
  return {
    closes: [...out.entries()].map(([date, close]) => ({ date, close })),
    splits: splits.map((s) => ({ date: trDay(s.time), ratio: String(s.ratio) })),
    dividends: Object.values(r.events?.dividends ?? {}).map((d) => ({
      date: trDay(d.date * 1000),
      amount: d.amount,
    })),
  };
}

async function get(http: Http, path: string) {
  let last: unknown;
  for (const host of HOSTS) {
    try {
      return await http(`${host}${path}`);
    } catch (e) {
      last = e;
      if (e instanceof MarketError && e.kind === 'not_found') throw e;
    }
  }
  throw last;
}

export const yahoo: MarketSource = {
  id: 'yahoo',

  async quotes(refs, http) {
    const out = new Map<string, SourceQuote>();
    const queue = [...refs];
    const errors: unknown[] = [];
    const worker = async () => {
      for (let ref = queue.shift(); ref !== undefined; ref = queue.shift()) {
        try {
          const text = await get(
            http,
            `/v8/finance/chart/${encodeURIComponent(ref)}?range=1d&interval=1d`,
          );
          out.set(ref, parseChartQuote(text, ref));
        } catch (e) {
          errors.push(e);
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, refs.length) }, worker));
    // Nothing at all came back: report why (offline, blocked…) so the next source is tried.
    if (out.size === 0 && errors.length) throw errors[0];
    return out;
  },

  async history(ref, from, to, http) {
    const p1 = unixStart(from);
    const p2 = unixStart(to) + 86_400;
    const text = await get(
      http,
      `/v8/finance/chart/${encodeURIComponent(ref)}?period1=${p1}&period2=${p2}&interval=1d&events=div%2Csplits&includePrePost=false`,
    );
    const h = parseChartHistory(text);
    return { ...h, closes: h.closes.filter((c) => c.date >= from && c.date <= to) };
  },
};

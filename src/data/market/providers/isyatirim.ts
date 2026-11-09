import { parseJson } from '../http';
import { dmy, fromDmy } from '../time';
import { MarketError, type MarketSource, type SourceHistory, type SourceQuote } from '../types';

/**
 * İş Yatırım daily data (no key): BIST closing prices up to the previous trading day. Each
 * row also carries that day's BIST 100 close and USD/TRY rate, so two special references read
 * those series from a long-listed stock: "@XU100" and "@USDTRY".
 *
 * Closes are the unadjusted ones (HG_KAPANIS): the prices people actually traded at. The
 * adjusted series (HGDG_KAPANIS) is only used to spot corporate actions.
 */
const BASE =
  'https://www.isyatirim.com.tr/_layouts/15/Isyatirim.Website/Common/Data.aspx/HisseTekil';
const CARRIER = 'THYAO';

interface Row {
  HGDG_TARIH: string;
  HG_KAPANIS?: number | null;
  HGDG_KAPANIS?: number | null;
  END_DEGER?: number | null;
  DD_DEGER?: number | null;
}

function field(ref: string): keyof Row {
  if (ref === '@XU100') return 'END_DEGER';
  if (ref === '@USDTRY') return 'DD_DEGER';
  return 'HG_KAPANIS';
}

export function parseHisseTekil(text: string, ref: string): SourceHistory {
  const data = parseJson<{ ok?: boolean; value?: Row[]; errorDescription?: string }>(
    text,
    'İş Yatırım',
  );
  if (!data.ok || !Array.isArray(data.value)) {
    throw new MarketError('format', `İş Yatırım: ${data.errorDescription ?? 'veri yok'}`);
  }
  const key = field(ref);
  const closes = data.value
    .map((r) => ({ date: fromDmy(r.HGDG_TARIH), close: Number(r[key]) }))
    .filter((c) => c.close > 0)
    .sort((a, b) => (a.date < b.date ? -1 : 1));

  // Corporate actions: the ratio raw ÷ adjusted steps down on an ex-date. A big step is a
  // split or bonus issue (a suggestion only: the person confirms it); small ones are dividends.
  const splits: SourceHistory['splits'] = [];
  if (key === 'HG_KAPANIS') {
    const rows = [...data.value].sort((a, b) =>
      fromDmy(a.HGDG_TARIH) < fromDmy(b.HGDG_TARIH) ? -1 : 1,
    );
    let prev: number | null = null;
    for (const r of rows) {
      const raw = Number(r.HG_KAPANIS);
      const adj = Number(r.HGDG_KAPANIS);
      if (!(raw > 0 && adj > 0)) continue;
      const factor = raw / adj;
      if (prev !== null && prev / factor >= 1.2) {
        splits.push({ date: fromDmy(r.HGDG_TARIH), ratio: (prev / factor).toFixed(2) });
      }
      prev = factor;
    }
  }
  return { closes, splits, dividends: [] };
}

/** Calendar-year chunks: the endpoint returns complete data for up to a year per request. */
export function yearChunks(from: string, to: string): [string, string][] {
  const out: [string, string][] = [];
  for (let y = Number(from.slice(0, 4)); y <= Number(to.slice(0, 4)); y++) {
    const a = `${y}-01-01` < from ? from : `${y}-01-01`;
    const b = `${y}-12-31` > to ? to : `${y}-12-31`;
    out.push([a, b]);
  }
  return out;
}

export const isyatirim: MarketSource = {
  id: 'isyatirim',

  async quotes(refs, http) {
    // End-of-day only: the last close is "today's price" until the next day's close.
    const out = new Map<string, SourceQuote>();
    const to = new Date().toISOString().slice(0, 10);
    const from = new Date(Date.now() - 12 * 86_400_000).toISOString().slice(0, 10);
    for (const ref of refs) {
      let h: SourceHistory;
      try {
        h = await isyatirim.history(ref, from, to, http);
      } catch (e) {
        if (e instanceof MarketError && e.kind === 'not_found') continue;
        throw e;
      }
      const last = h.closes[h.closes.length - 1];
      if (!last) continue;
      const prev = h.closes[h.closes.length - 2];
      out.set(ref, {
        price: last.close,
        prevClose: prev?.close ?? null,
        time: Date.parse(`${last.date}T15:00:00Z`),
        delayMinutes: 0,
        endOfDay: true,
      });
    }
    return out;
  },

  async history(ref, from, to, http) {
    const code = ref.startsWith('@') ? CARRIER : ref;
    const result: SourceHistory = { closes: [], splits: [], dividends: [] };
    for (const [a, b] of yearChunks(from, to)) {
      const text = await http(
        `${BASE}?hisse=${encodeURIComponent(code)}&startdate=${dmy(a)}&enddate=${dmy(b)}`,
      );
      const part = parseHisseTekil(text, ref);
      result.closes.push(...part.closes);
      result.splits.push(...part.splits);
    }
    if (result.closes.length === 0 && !ref.startsWith('@')) {
      throw new MarketError('not_found', `İş Yatırım: ${ref} bulunamadı`);
    }
    return result;
  },
};

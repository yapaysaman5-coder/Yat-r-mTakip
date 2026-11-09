import { addDays } from '@/domain';

import { trDay } from '../time';
import { EMPTY_HISTORY, MarketError, type MarketSource, type SourceQuote } from '../types';

/**
 * Consumer prices (TÜFE) from the Central Bank of Türkiye's statistics page, which lists the
 * official TÜİK monthly and annual changes since 2005. The monthly changes are chained into an
 * index (January 2005 start = 100) and spread over each month's days geometrically, so the
 * "Ya Olsaydı?" replay can buy "inflation" on any day. Days after the last published month keep
 * the last level until the next release.
 */
export const CPI_PAGE =
  'https://www.tcmb.gov.tr/wps/wcm/connect/TR/TCMB+TR/Main+Menu/Istatistikler/Enflasyon+Verileri/Tuketici+Fiyatlari';

export interface CpiMonth {
  /** yyyy-mm */
  month: string;
  /** Monthly change, e.g. 0.0258 for %2,58. */
  monthly: number;
  annual: number;
}

const cell = (html: string) =>
  html
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim();

/** Reads the page's table ("Ay-Yıl", yearly %, monthly %), oldest month first. */
export function parseCpiPage(html: string): CpiMonth[] {
  const start = html.search(/<table[^>]*summary="[^"]*T[üu]ketici Fiyatlar/i);
  if (start < 0) throw new MarketError('format', 'TCMB: TÜFE tablosu yok');
  const table = html.slice(start, html.indexOf('</table>', start));
  const out: CpiMonth[] = [];
  for (const row of table.match(/<tr[\s\S]*?<\/tr>/g) ?? []) {
    const cells = (row.match(/<t[dh][\s\S]*?<\/t[dh]>/g) ?? []).map(cell);
    const m = /^(\d{2})-(\d{4})$/.exec(cells[0] ?? '');
    if (!m) continue;
    const annual = Number(cells[1]?.replace(',', '.'));
    const monthly = Number(cells[2]?.replace(',', '.'));
    if (!Number.isFinite(monthly) || !Number.isFinite(annual)) continue;
    out.push({ month: `${m[2]}-${m[1]}`, monthly: monthly / 100, annual: annual / 100 });
  }
  if (out.length === 0) throw new MarketError('format', 'TCMB: TÜFE satırı yok');
  out.sort((a, b) => (a.month < b.month ? -1 : 1));
  // Gaps would make the chained index wrong.
  for (let i = 1; i < out.length; i++) {
    if (nextMonth(out[i - 1].month) !== out[i].month) {
      throw new MarketError('format', `TCMB: TÜFE serisinde boşluk (${out[i - 1].month})`);
    }
  }
  return out;
}

function nextMonth(m: string): string {
  const [y, mo] = m.split('-').map(Number);
  return mo === 12 ? `${y + 1}-01` : `${y}-${String(mo + 1).padStart(2, '0')}`;
}

function daysIn(m: string): number {
  const [y, mo] = m.split('-').map(Number);
  return new Date(Date.UTC(y, mo, 0)).getUTCDate();
}

/** Daily index from `from` to `to` (inclusive); empty before the first month. */
export function cpiDaily(months: readonly CpiMonth[], from: string, to: string) {
  const out: { date: string; close: number }[] = [];
  if (months.length === 0) return out;
  let level = 100;
  const byDay = new Map<string, number>();
  for (const m of months) {
    const n = daysIn(m.month);
    for (let d = 1; d <= n; d++) {
      byDay.set(`${m.month}-${String(d).padStart(2, '0')}`, level * (1 + m.monthly) ** (d / n));
    }
    level *= 1 + m.monthly;
  }
  const first = `${months[0].month}-01`;
  for (let day = from < first ? first : from; day <= to; day = addDays(day, 1)) {
    out.push({ date: day, close: Number((byDay.get(day) ?? level).toPrecision(10)) });
  }
  return out;
}

export const tcmbCpi: MarketSource = {
  id: 'tcmbcpi',

  async quotes(refs, http) {
    const months = parseCpiPage(await http(CPI_PAGE, { timeoutMs: 20_000 }));
    const today = trDay(Date.now());
    const last = cpiDaily(months, today, today)[0];
    const out = new Map<string, SourceQuote>();
    for (const ref of refs) {
      if (ref !== 'TUFE' || !last) continue;
      out.set(ref, {
        price: last.close,
        prevClose: null,
        time: Date.now(),
        delayMinutes: 0,
        endOfDay: true,
      });
    }
    return out;
  },

  async history(ref, from, to, http) {
    if (ref !== 'TUFE') return EMPTY_HISTORY;
    const months = parseCpiPage(await http(CPI_PAGE, { timeoutMs: 20_000 }));
    return { ...EMPTY_HISTORY, closes: cpiDaily(months, from, to) };
  },
};

import type { Instrument } from '@/data/market/instruments';
import { sessionAt, venueOf } from '@/data/market/session';
import type { StoredQuote } from '@/data/repo/market';
import { formatNumber, formatPrice, formatRelativeDay, type CurrencyCode } from '@/utils/format';

/** Index points without a currency, rates with four decimals, prices in their currency. */
export function formatInstrumentPrice(inst: Instrument, price: number): string {
  if (inst.market === 'INDEX') return formatNumber(price, { minDecimals: 2, maxDecimals: 2 });
  if (inst.market === 'FX') return formatNumber(price, { minDecimals: 4, maxDecimals: 4 });
  return formatPrice(price, inst.currency as CurrencyCode);
}

export function changeRatio(q: StoredQuote | null): number | null {
  return q && q.prevClose ? q.price / q.prevClose - 1 : null;
}

/** "Açık · 17:53 · 15 dk gecikme", "Kapalı · 06.11.2026 · gün sonu", "7/24 · 17:53". */
export function quoteStatus(inst: Instrument, q: StoredQuote | null, now = Date.now()): string {
  const venue = venueOf(inst);
  const open = sessionAt(venue, now).open;
  const parts = [venue === 'CRYPTO' ? '7/24' : open ? 'Açık' : 'Kapalı'];
  if (q) {
    const when = formatRelativeDay(q.time, now);
    parts.push(when.startsWith('Bugün ') ? when.slice(6) : when);
    if (q.endOfDay) parts.push('gün sonu');
    else if (q.delayMinutes > 0) parts.push(`${q.delayMinutes} dk gecikme`);
  }
  return parts.join(' · ');
}

export const SOURCE_NAME: Record<string, string> = {
  yahoo: 'Yahoo Finance',
  binance: 'Binance',
  coingecko: 'CoinGecko',
  isyatirim: 'İş Yatırım',
  tcmb: 'TCMB',
  mock: 'Örnek (web önizleme)',
};

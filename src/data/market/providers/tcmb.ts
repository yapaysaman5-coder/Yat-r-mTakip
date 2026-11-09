import { fromDmy } from '../time';
import { MarketError, type MarketSource, type SourceQuote } from '../types';

/**
 * Central Bank of Türkiye daily indicative rates (official, published once a working day
 * around 15:30). The last fallback for USD/TRY and EUR/TRY; the mid of buying and selling is
 * used. History would need one request per day, so this source gives quotes only.
 */
const TODAY = 'https://www.tcmb.gov.tr/kurlar/today.xml';

export function parseTcmb(xml: string): { date: string; rates: Map<string, number> } {
  const dateMatch = /<Tarih_Date[^>]*Tarih="([\d.]+)"/.exec(xml);
  if (!dateMatch) throw new MarketError('format', 'TCMB: tarih yok');
  const rates = new Map<string, number>();
  const re = /<Currency[^>]*Kod="([A-Z]+)"[^>]*>([\s\S]*?)<\/Currency>/g;
  for (let m = re.exec(xml); m; m = re.exec(xml)) {
    const pick = (tag: string) => {
      const v = new RegExp(`<${tag}>([\\d.]+)</${tag}>`).exec(m![2]);
      return v ? Number(v[1]) : NaN;
    };
    const unit = pick('Unit') || 1;
    const mid = (pick('ForexBuying') + pick('ForexSelling')) / 2;
    if (mid > 0) rates.set(m[1], mid / unit);
  }
  return { date: fromDmy(dateMatch[1]), rates };
}

export const tcmb: MarketSource = {
  id: 'tcmb',

  async quotes(refs, http) {
    const { date, rates } = parseTcmb(await http(TODAY));
    const out = new Map<string, SourceQuote>();
    for (const ref of refs) {
      const rate = rates.get(ref);
      if (rate === undefined) continue;
      out.set(ref, {
        price: rate,
        prevClose: null,
        time: Date.parse(`${date}T12:30:00Z`),
        delayMinutes: 0,
        endOfDay: true,
      });
    }
    return out;
  },

  async history() {
    throw new MarketError('not_found', 'TCMB: geçmiş kur bu kaynaktan alınmıyor');
  },
};

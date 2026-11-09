import { addDays, daysBetween } from '@/domain';

import { mulberry32 } from '../../demo/market';
import { trDay } from '../time';
import { EMPTY_HISTORY, type MarketSource, type SourceQuote } from '../types';

/**
 * Deterministic fictional prices for the web preview (browsers block the real sources with
 * CORS) and for tests. Every reference gets its own seeded random walk ending at a plausible
 * level; the same day always gives the same numbers.
 */
const LEVEL: Record<string, number> = {
  'THYAO.IS': 301.5,
  'ASELS.IS': 112.3,
  'TUPRS.IS': 165.8,
  'XU100.IS': 11_480,
  'XU030.IS': 12_640,
  AAPL: 241.3,
  NVDA: 176.2,
  '^GSPC': 6_820,
  '^NDX': 24_950,
  '^RUT': 2_460,
  'USDTRY=X': 50.1,
  'EURTRY=X': 56.2,
  'GC=F': 4_110,
  'SI=F': 48.6,
  BTCUSDT: 74_600,
  ETHUSDT: 2_120,
  USDTTRY: 50.1,
  PAXGTRY: 206_100,
  BTCTRY: 3_737_000,
  EURUSDT: 1.121,
};

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

const levelOf = (ref: string) => LEVEL[ref] ?? 10 + (hash(ref) % 990);

/** Closes for the 800 days up to `today`, ending at the reference's level. */
function walk(ref: string, today: string): Map<string, number> {
  const rand = mulberry32(hash(ref));
  const days = daysBetween(addDays(today, -799), today);
  const vol = ref.endsWith('USDT') || ref.endsWith('TRY') ? 0.02 : 0.012;
  const steps = days.map(() => (rand() + rand() + rand() - 1.5) * 2 * vol);
  let level = levelOf(ref);
  const out = new Map<string, number>();
  for (let i = days.length - 1; i >= 0; i--) {
    out.set(days[i], Number(level.toPrecision(6)));
    level /= Math.exp(steps[i] + 0.0002);
  }
  return out;
}

export const mock: MarketSource = {
  id: 'mock',

  async quotes(refs) {
    const now = Date.now();
    const today = trDay(now);
    const out = new Map<string, SourceQuote>();
    for (const ref of refs) {
      const w = walk(ref, today);
      out.set(ref, {
        price: w.get(today)!,
        prevClose: w.get(addDays(today, -1)) ?? null,
        time: now,
        delayMinutes: ref.endsWith('.IS') ? 15 : 0,
      });
    }
    return out;
  },

  async history(ref, from, to) {
    const w = walk(ref, trDay(Date.now()));
    const closes = [...w.entries()]
      .filter(([d]) => d >= from && d <= to)
      .map(([date, close]) => ({ date, close }));
    return { ...EMPTY_HISTORY, closes };
  },
};

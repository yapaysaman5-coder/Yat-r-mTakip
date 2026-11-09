/**
 * DEMO MARKET — fictional, deterministic daily prices for the preview.
 * Replaced by real market data in Phase 4.
 */
import { daysBetween, type Asset } from '@/domain';

export const DEMO_START = '2025-01-12';
export const DEMO_END = '2026-11-08';
export const DEMO_DATES = daysBetween(DEMO_START, DEMO_END);
export const DEMO_DAYS = DEMO_DATES.length;

export function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Seeded ~N(0, 1) daily shocks. */
export function shocks(seed: number, n = DEMO_DAYS): number[] {
  const rand = mulberry32(seed);
  return Array.from({ length: n }, (_, i) => (i === 0 ? 0 : (rand() + rand() + rand() - 1.5) * 2));
}

/** Random walk in log space that starts at `start` and ends exactly at `end` (a bridge). */
export function bridge(
  seed: number,
  start: number,
  end: number,
  vol: number,
  n = DEMO_DAYS,
): number[] {
  const z = shocks(seed, n);
  const w: number[] = [];
  let acc = 0;
  for (let i = 0; i < n; i++) {
    acc += z[i] * vol;
    w.push(acc);
  }
  const drift = Math.log(end / start);
  return w.map((wi, i) => {
    const t = n > 1 ? i / (n - 1) : 1;
    return start * Math.exp(wi - t * w[n - 1] + t * drift);
  });
}

/** USD/TRY, from 35,40 to 42,50. */
export const USDTRY: number[] = bridge(201, 35.4, 42.5, 0.003).map((x) => Number(x.toFixed(4)));

export interface DemoAssetDef {
  asset: Asset;
  start: number;
  /** Previous close (second to last day) and today's price. */
  prevClose: number;
  price: number;
  vol: number;
  seed: number;
}

const def = (
  id: string,
  name: string,
  market: Asset['market'],
  currency: Asset['currency'],
  start: number,
  prevClose: number,
  price: number,
  vol: number,
  seed: number,
): DemoAssetDef => ({
  asset: { id, symbol: id, name, market, currency },
  start,
  prevClose,
  price,
  vol,
  seed,
});

export const DEMO_ASSET_DEFS: DemoAssetDef[] = [
  def('THYAO', 'Türk Hava Yolları', 'BIST', 'TRY', 270, 308.7, 312.4, 0.02, 301),
  def('ASELS', 'Aselsan', 'BIST', 'TRY', 70, 113.1, 112.3, 0.022, 302),
  def('TUPRS', 'Tüpraş', 'BIST', 'TRY', 150, 163.9, 165.8, 0.018, 303),
  def('AAPL', 'Apple', 'US', 'USD', 230, 242.27, 241.3, 0.015, 304),
  def('NVDA', 'NVIDIA', 'US', 'USD', 135, 172.9, 176.2, 0.028, 305),
  def('BTC', 'Bitcoin', 'CRYPTO', 'USD', 94_000, 96_385, 98_410, 0.02, 306),
  def('ETH', 'Ethereum', 'CRYPTO', 'USD', 3_300, 3_466, 3_412, 0.02, 307),
];

export const DEMO_ASSETS = new Map<string, Asset>(
  DEMO_ASSET_DEFS.map((d) => [d.asset.id, d.asset]),
);

/** Daily closes in the asset's currency; the last two days are the previous close and price. */
export const DEMO_CLOSES: Record<string, number[]> = Object.fromEntries(
  DEMO_ASSET_DEFS.map((d) => {
    const path = bridge(d.seed, d.start, d.prevClose, d.vol, DEMO_DAYS - 1);
    return [d.asset.id, [...path.map((x) => Number(x.toFixed(2))), d.price]];
  }),
);

export const dayIndex = (date: string) => DEMO_DATES.indexOf(date);

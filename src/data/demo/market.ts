/**
 * DEMO MARKET — fictional, deterministic daily prices for the example portfolio.
 * The same 666-day path is generated for any end day, so the example always ends "today".
 */
import { addDays, daysBetween, type Asset } from '@/domain';

export const DEMO_LENGTH = 666;

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
export function shocks(seed: number, n = DEMO_LENGTH): number[] {
  const rand = mulberry32(seed);
  return Array.from({ length: n }, (_, i) => (i === 0 ? 0 : (rand() + rand() + rand() - 1.5) * 2));
}

/** Random walk in log space that starts at `start` and ends exactly at `end` (a bridge). */
export function bridge(seed: number, start: number, end: number, vol: number, n = DEMO_LENGTH) {
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
  symbol: string,
  name: string,
  market: Asset['market'],
  currency: Asset['currency'],
  start: number,
  prevClose: number,
  price: number,
  vol: number,
  seed: number,
): DemoAssetDef => ({
  asset: { id: `demo:${symbol}`, symbol, name, market, currency },
  start,
  prevClose,
  price,
  vol,
  seed,
});

export const DEMO_ASSET_DEFS: readonly DemoAssetDef[] = [
  def('THYAO', 'Türk Hava Yolları', 'BIST', 'TRY', 270, 308.7, 312.4, 0.02, 301),
  def('ASELS', 'Aselsan', 'BIST', 'TRY', 70, 113.1, 112.3, 0.022, 302),
  def('TUPRS', 'Tüpraş', 'BIST', 'TRY', 150, 163.9, 165.8, 0.018, 303),
  def('AAPL', 'Apple', 'US', 'USD', 230, 242.27, 241.3, 0.015, 304),
  def('NVDA', 'NVIDIA', 'US', 'USD', 135, 172.9, 176.2, 0.028, 305),
  def('BTC', 'Bitcoin', 'CRYPTO', 'USD', 94_000, 96_385, 98_410, 0.02, 306),
  def('ETH', 'Ethereum', 'CRYPTO', 'USD', 3_300, 3_466, 3_412, 0.02, 307),
];

export interface DemoMarket {
  dates: string[];
  /** USD/TRY, from 35,40 to 42,50. */
  usdtry: number[];
  /** Daily closes per symbol in the asset's currency (last day = today's price). */
  closes: Record<string, number[]>;
}

let cached: { closes: Record<string, number[]>; usdtry: number[] } | null = null;

/** The fictional market ending on `end` (yyyy-mm-dd). */
export function demoMarket(end: string): DemoMarket {
  cached ??= {
    usdtry: bridge(201, 35.4, 42.5, 0.003).map((x) => Number(x.toFixed(4))),
    closes: Object.fromEntries(
      DEMO_ASSET_DEFS.map((d) => {
        const path = bridge(d.seed, d.start, d.prevClose, d.vol, DEMO_LENGTH - 1);
        return [d.asset.symbol, [...path.map((x) => Number(x.toFixed(2))), d.price]];
      }),
    ),
  };
  return { dates: daysBetween(addDays(end, -(DEMO_LENGTH - 1)), end), ...cached };
}

/**
 * DEMO DATA — only for the Phase 1 design preview.
 * Real values come from the calculation engine (Phase 2), the database (Phase 3)
 * and market data (Phase 4). Everything here is fictional.
 */
import type { MarketKey } from '@/theme/types';
import type { CurrencyCode } from '@/utils/format';

export const DEMO_USDTRY = 42.5;

export interface DemoHolding {
  symbol: string;
  name: string;
  market: Exclude<MarketKey, 'cash'>;
  currency: CurrencyCode;
  quantity: number;
  price: number;
  prevClose: number;
  avgCost: number;
  /** Average USD/TRY paid (USD assets only). */
  avgFx: number;
  spark: number[];
}

export const DEMO_HOLDINGS: DemoHolding[] = [
  {
    symbol: 'THYAO',
    name: 'Türk Hava Yolları',
    market: 'bist',
    currency: 'TRY',
    quantity: 1000,
    price: 312.4,
    prevClose: 308.7,
    avgCost: 287.1,
    avgFx: 1,
    spark: [301, 299, 304, 306, 303, 309, 312],
  },
  {
    symbol: 'NVDA',
    name: 'NVIDIA',
    market: 'us',
    currency: 'USD',
    quantity: 30,
    price: 176.2,
    prevClose: 172.9,
    avgCost: 128.4,
    avgFx: 38.2,
    spark: [168, 171, 170, 174, 173, 172, 176],
  },
  {
    symbol: 'AAPL',
    name: 'Apple',
    market: 'us',
    currency: 'USD',
    quantity: 20,
    price: 241.3,
    prevClose: 242.27,
    avgCost: 196.5,
    avgFx: 37.6,
    spark: [244, 246, 243, 245, 242, 243, 241],
  },
  {
    symbol: 'BTC',
    name: 'Bitcoin',
    market: 'crypto',
    currency: 'USD',
    quantity: 0.042,
    price: 98410,
    prevClose: 96385,
    avgCost: 63800,
    avgFx: 36.9,
    spark: [93100, 94800, 94200, 95900, 97100, 96400, 98410],
  },
  {
    symbol: 'ASELS',
    name: 'Aselsan',
    market: 'bist',
    currency: 'TRY',
    quantity: 1500,
    price: 112.3,
    prevClose: 113.1,
    avgCost: 96.4,
    avgFx: 1,
    spark: [109, 111, 114, 113, 115, 113, 112],
  },
  {
    symbol: 'TUPRS',
    name: 'Tüpraş',
    market: 'bist',
    currency: 'TRY',
    quantity: 750,
    price: 165.8,
    prevClose: 163.9,
    avgCost: 171.2,
    avgFx: 1,
    spark: [170, 168, 166, 163, 162, 164, 166],
  },
  {
    symbol: 'ETH',
    name: 'Ethereum',
    market: 'crypto',
    currency: 'USD',
    quantity: 0.35,
    price: 3412,
    prevClose: 3466,
    avgCost: 2950,
    avgFx: 39.4,
    spark: [3510, 3480, 3530, 3490, 3450, 3466, 3412],
  },
];

export const DEMO_TOTAL_VALUE = 1_284_562.4;
export const DEMO_DEPOSITED = 1_150_000;
export const DEMO_WITHDRAWN = 80_318;

export function holdingValueTRY(h: DemoHolding) {
  return h.quantity * h.price * (h.currency === 'TRY' ? 1 : DEMO_USDTRY);
}

export function holdingCostTRY(h: DemoHolding) {
  return h.quantity * h.avgCost * h.avgFx;
}

export function holdingDailyChangeTRY(h: DemoHolding) {
  return h.quantity * (h.price - h.prevClose) * (h.currency === 'TRY' ? 1 : DEMO_USDTRY);
}

export function demoSummary() {
  const positions = DEMO_HOLDINGS.reduce((s, h) => s + holdingValueTRY(h), 0);
  const cash = DEMO_TOTAL_VALUE - positions;
  const netInvested = DEMO_DEPOSITED - DEMO_WITHDRAWN;
  const dailyChange = DEMO_HOLDINGS.reduce((s, h) => s + holdingDailyChangeTRY(h), 0);
  const byMarket = (m: DemoHolding['market']) =>
    DEMO_HOLDINGS.filter((h) => h.market === m).reduce((s, h) => s + holdingValueTRY(h), 0);
  return {
    totalValue: DEMO_TOTAL_VALUE,
    positions,
    cash,
    deposited: DEMO_DEPOSITED,
    withdrawn: DEMO_WITHDRAWN,
    netInvested,
    netPnl: DEMO_TOTAL_VALUE - netInvested,
    netPnlRatio: (DEMO_TOTAL_VALUE - netInvested) / netInvested,
    dailyChange,
    dailyChangeRatio: dailyChange / (DEMO_TOTAL_VALUE - dailyChange),
    allocation: {
      bist: byMarket('bist'),
      us: byMarket('us'),
      crypto: byMarket('crypto'),
    },
  };
}

/** Deterministic pseudo-random generator so the preview looks the same every time. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type DemoRange = '1G' | '1H' | '1A' | '3A' | '6A' | '1Y' | 'YB' | 'Tümü';

const RANGE_POINTS: Record<
  DemoRange,
  { points: number; drift: number; vol: number; seed: number }
> = {
  '1G': { points: 60, drift: 0.00016, vol: 0.0016, seed: 11 },
  '1H': { points: 56, drift: 0.0004, vol: 0.004, seed: 7 },
  '1A': { points: 31, drift: 0.0012, vol: 0.009, seed: 3 },
  '3A': { points: 64, drift: 0.0014, vol: 0.011, seed: 5 },
  '6A': { points: 90, drift: 0.0013, vol: 0.012, seed: 9 },
  '1Y': { points: 120, drift: 0.0016, vol: 0.013, seed: 2 },
  YB: { points: 110, drift: 0.0016, vol: 0.013, seed: 4 },
  Tümü: { points: 150, drift: 0.0019, vol: 0.014, seed: 8 },
};

/** Demo value series ending at today's value, plus the stepped "net invested" line. */
export function demoSeries(range: DemoRange) {
  const { points, drift, vol, seed } = RANGE_POINTS[range];
  const rand = mulberry32(seed);
  const raw: number[] = [1];
  for (let i = 1; i < points; i++) {
    const shock = (rand() - 0.5) * 2 * vol;
    raw.push(raw[i - 1] * (1 + drift + shock));
  }
  const scale = DEMO_TOTAL_VALUE / raw[raw.length - 1];
  const values = raw.map((v) => v * scale);
  const netInvested = DEMO_DEPOSITED - DEMO_WITHDRAWN;
  // Net invested only makes sense to draw on longer ranges, where deposits happened.
  const long = range === '6A' || range === '1Y' || range === 'YB' || range === 'Tümü';
  const start = Math.min(values[0] * 0.97, netInvested);
  const baseline = long
    ? values.map((_, i) => {
        const t = i / (points - 1);
        if (t < 0.34) return start;
        if (t < 0.68) return start + (netInvested - start) * 0.55;
        return netInvested;
      })
    : undefined;
  const first = values[0];
  return {
    values,
    baseline,
    change: DEMO_TOTAL_VALUE - first,
    changeRatio: DEMO_TOTAL_VALUE / first - 1,
  };
}

export type DemoTxnType = 'BUY' | 'SELL' | 'DEPOSIT' | 'WITHDRAW' | 'DIVIDEND';

export interface DemoTxn {
  id: string;
  ts: string;
  type: DemoTxnType;
  symbol?: string;
  market?: Exclude<MarketKey, 'cash'>;
  quantity?: number;
  price?: number;
  currency: CurrencyCode;
  /** Cash effect in TRY (+ in, − out). */
  amountTRY: number;
  realizedRatio?: number;
}

export const DEMO_TXNS: DemoTxn[] = [
  {
    id: 't1',
    ts: '2026-11-08T11:32:00Z',
    type: 'BUY',
    symbol: 'THYAO',
    market: 'bist',
    quantity: 100,
    price: 312.4,
    currency: 'TRY',
    amountTRY: -31302.48,
  },
  {
    id: 't2',
    ts: '2026-11-05T15:10:00Z',
    type: 'SELL',
    symbol: 'BTC',
    market: 'crypto',
    quantity: 0.01,
    price: 98100,
    currency: 'USD',
    amountTRY: 41692.5,
    realizedRatio: 0.124,
  },
  { id: 't3', ts: '2026-11-01T07:00:00Z', type: 'DEPOSIT', currency: 'TRY', amountTRY: 50000 },
  {
    id: 't4',
    ts: '2026-10-28T09:45:00Z',
    type: 'DIVIDEND',
    symbol: 'TUPRS',
    market: 'bist',
    currency: 'TRY',
    amountTRY: 4850,
  },
  {
    id: 't5',
    ts: '2026-10-21T14:05:00Z',
    type: 'BUY',
    symbol: 'NVDA',
    market: 'us',
    quantity: 10,
    price: 168.4,
    currency: 'USD',
    amountTRY: -71570,
  },
  { id: 't6', ts: '2026-10-15T08:20:00Z', type: 'WITHDRAW', currency: 'TRY', amountTRY: -20000 },
  { id: 't7', ts: '2026-10-02T07:30:00Z', type: 'DEPOSIT', currency: 'TRY', amountTRY: 120000 },
  {
    id: 't8',
    ts: '2026-09-24T12:15:00Z',
    type: 'SELL',
    symbol: 'ASELS',
    market: 'bist',
    quantity: 250,
    price: 118.6,
    currency: 'TRY',
    amountTRY: 29590.7,
    realizedRatio: 0.23,
  },
];

export interface DemoBenchmark {
  key: string;
  name: string;
  value: number;
  isPortfolio?: boolean;
}

/** "Ya Olsaydı?" preview — same cash flows applied to each benchmark (fictional numbers). */
export const DEMO_BENCHMARKS: DemoBenchmark[] = [
  { key: 'gold', name: 'Gram Altın', value: 1_412_300 },
  { key: 'btc', name: 'Bitcoin', value: 1_398_120 },
  { key: 'me', name: 'Portföyüm', value: DEMO_TOTAL_VALUE, isPortfolio: true },
  { key: 'ndx', name: 'Nasdaq 100', value: 1_261_400 },
  { key: 'spx', name: 'S&P 500', value: 1_240_110 },
  { key: 'deposit', name: 'Mevduat', value: 1_236_400 },
  { key: 'cpi', name: 'TÜFE (enflasyon)', value: 1_221_800 },
  { key: 'xu030', name: 'BIST 30', value: 1_198_700 },
  { key: 'xu100', name: 'BIST 100', value: 1_187_240 },
  { key: 'silver', name: 'Gram Gümüş', value: 1_176_800 },
  { key: 'eur', name: 'Euro/TL', value: 1_171_300 },
  { key: 'rut', name: 'Russell 2000', value: 1_160_300 },
  { key: 'usd', name: 'Dolar/TL', value: 1_150_900 },
];

export const DEMO_FUND = {
  unitPrice: 1.200762,
  unitPriceDailyRatio: 0.0098,
  units: 1_069_789.12,
  riskLevel: 5,
  returns: [
    { label: '1A', ratio: 0.031 },
    { label: '3A', ratio: 0.094 },
    { label: '6A', ratio: 0.14 },
    { label: 'YB', ratio: 0.182 },
    { label: '1Y', ratio: 0.225 },
    { label: 'Tümü', ratio: 0.2008 },
  ],
};

/** Value-over-time preview lines for the "Ya Olsaydı?" chart (fictional). */
export function demoComparison(keys: string[]) {
  const n = 60;
  const deposits = Array.from({ length: n }, (_, i) =>
    i < 15 ? 600_000 : i < 35 ? 900_000 : i < 48 ? 1_150_000 : DEMO_DEPOSITED - DEMO_WITHDRAWN,
  );
  return keys.map((key, k) => {
    const target = DEMO_BENCHMARKS.find((b) => b.key === key)?.value ?? DEMO_TOTAL_VALUE;
    const rand = mulberry32(20 + k * 7);
    const growth = [1];
    for (let i = 1; i < n; i++) growth.push(growth[i - 1] * (1 + (rand() - 0.5) * 0.035));
    const factor = target / deposits[n - 1] / growth[n - 1];
    const values = deposits.map((d, i) => d * growth[i] * Math.pow(factor, i / (n - 1)));
    return { key, values };
  });
}

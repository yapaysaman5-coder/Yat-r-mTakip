/**
 * DEMO DATA — only for the Phase 1 design preview.
 * Real values come from the calculation engine (Phase 2), the database (Phase 3)
 * and market data (Phase 4). Everything here is fictional.
 */
import { rebasePercent } from '@/ui/charts/scale';
import type { MarketKey } from '@/theme/types';

import {
  DEMO_DAYS,
  DEMO_METRICS,
  DEMO_NET_INVESTED,
  DEMO_VALUES,
  PERIOD_START,
  periodReturn,
  type PeriodKey,
} from './analysis';
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

/** Intraday preview for "1G": 5-minute points across the session. */
const INTRADAY = { points: 60, drift: 0.00016, vol: 0.0016, seed: 11 };

/** Demo value series ending at today's value, plus the stepped "net invested" line. */
export function demoSeries(range: DemoRange) {
  if (range !== '1G') {
    // Daily history (same data as the Analiz screen): value and net invested.
    const start = range === '1H' ? DEMO_DAYS - 8 : PERIOD_START[range];
    const values = DEMO_VALUES.me.slice(start);
    const showBaseline = range !== '1H' && range !== '1A';
    const ratios = rebasePercent(DEMO_VALUES.me, DEMO_NET_INVESTED, start);
    return {
      values,
      baseline: showBaseline ? DEMO_NET_INVESTED.slice(start) : undefined,
      changeRatio: ratios[ratios.length - 1],
    };
  }
  // Intraday preview for "1G" (5-minute points).
  const { points, drift, vol, seed } = INTRADAY;
  const rand = mulberry32(seed);
  const raw: number[] = [1];
  for (let i = 1; i < points; i++) {
    const shock = (rand() - 0.5) * 2 * vol;
    raw.push(raw[i - 1] * (1 + drift + shock));
  }
  const scale = DEMO_TOTAL_VALUE / raw[raw.length - 1];
  const values = raw.map((v) => v * scale);
  return { values, baseline: undefined, changeRatio: DEMO_TOTAL_VALUE / values[0] - 1 };
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

const ACCOUNT_PERIODS: PeriodKey[] = ['1A', '3A', '6A', 'YB', '1Y', 'Tümü'];

/** Account-level figures for the Fon (Hesabım) screen, computed from the demo history. */
export const DEMO_ACCOUNT = {
  riskLevel: DEMO_METRICS.riskLevel,
  returns: ACCOUNT_PERIODS.map((label) => ({ label, ratio: periodReturn('me', label) })),
};

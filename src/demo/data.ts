/**
 * DEMO DATA façade for the preview screens. Every number here is produced by the real
 * calculation engine (src/domain) from the fictional history in ./portfolio.ts.
 * Replaced by the user's own data in Phase 3 (database) and Phase 4 (market data).
 */
import { type Transaction } from '@/domain';
import type { MarketKey } from '@/theme/types';
import { rebasePercent } from '@/ui/charts/scale';
import type { CurrencyCode } from '@/utils/format';

import {
  DEMO_DAYS,
  DEMO_METRICS,
  DEMO_NET_INVESTED,
  DEMO_VALUES,
  PERIOD_START,
  periodReturn,
  type PeriodKey,
} from './analysis';
import { DEMO_ASSET_DEFS, DEMO_ASSETS, DEMO_CLOSES, mulberry32, USDTRY } from './market';
import { DEMO_LEDGER, DEMO_TODAY, DEMO_TRANSACTIONS, DEMO_VALUATION } from './portfolio';

export const DEMO_USDTRY = USDTRY[USDTRY.length - 1];

const MARKET_KEY: Record<string, Exclude<MarketKey, 'cash'>> = {
  BIST: 'bist',
  US: 'us',
  CRYPTO: 'crypto',
};

export interface DemoHolding {
  symbol: string;
  name: string;
  market: Exclude<MarketKey, 'cash'>;
  currency: CurrencyCode;
  quantity: number;
  price: number;
  prevClose: number;
  /** Average cost per unit incl. commissions, asset currency. */
  avgCost: number;
  /** Average purchase exchange rate (TRY per unit of the asset currency). */
  avgFx: number;
  valueTRY: number;
  costTRY: number;
  dailyChangeTRY: number;
  /** Last 7 daily closes. */
  spark: number[];
}

export const DEMO_HOLDINGS: DemoHolding[] = DEMO_VALUATION.positions.map((p) => {
  const def = DEMO_ASSET_DEFS.find((d) => d.asset.id === p.assetId)!;
  const asset = DEMO_ASSETS.get(p.assetId)!;
  const ledgerPos = DEMO_LEDGER.positions.get(p.assetId)!;
  return {
    symbol: asset.symbol,
    name: asset.name ?? asset.symbol,
    market: MARKET_KEY[asset.market],
    currency: asset.currency as CurrencyCode,
    quantity: p.quantity.toNumber(),
    price: def.price,
    prevClose: def.prevClose,
    avgCost: p.averageCost.toNumber(),
    avgFx: ledgerPos.costTRY.div(ledgerPos.cost).toNumber(),
    valueTRY: p.valueTRY.toNumber(),
    costTRY: p.costTRY.toNumber(),
    dailyChangeTRY: DEMO_TODAY.byAsset[p.assetId]?.toNumber() ?? 0,
    spark: DEMO_CLOSES[p.assetId].slice(-7),
  };
});

export const DEMO_TOTAL_VALUE = DEMO_VALUATION.totalValue.toNumber();
export const DEMO_DEPOSITED = DEMO_VALUATION.deposited.toNumber();
export const DEMO_WITHDRAWN = DEMO_VALUATION.withdrawn.toNumber();

export const holdingValueTRY = (h: DemoHolding) => h.valueTRY;
export const holdingCostTRY = (h: DemoHolding) => h.costTRY;
export const holdingDailyChangeTRY = (h: DemoHolding) => h.dailyChangeTRY;

export function demoSummary() {
  const v = DEMO_VALUATION;
  const byMarket = (m: DemoHolding['market']) =>
    DEMO_HOLDINGS.filter((h) => h.market === m).reduce((s, h) => s + h.valueTRY, 0);
  return {
    totalValue: v.totalValue.toNumber(),
    positions: v.positionsValue.toNumber(),
    cash: v.cash.toNumber(),
    deposited: v.deposited.toNumber(),
    withdrawn: v.withdrawn.toNumber(),
    netInvested: v.netInvested.toNumber(),
    netPnl: v.netPnl.toNumber(),
    netPnlRatio: v.simpleReturn?.toNumber() ?? 0,
    realized: v.realized.toNumber(),
    unrealized: v.unrealized.toNumber(),
    dividends: v.dividends.toNumber(),
    commissions: v.commissions.toNumber(),
    dailyChange: DEMO_TODAY.total.toNumber(),
    dailyChangeRatio: DEMO_TODAY.ratio?.toNumber() ?? 0,
    allocation: { bist: byMarket('bist'), us: byMarket('us'), crypto: byMarket('crypto') },
  };
}

/* ───────────────────────── Chart series for the home screen ───────────────────────── */

export type DemoRange = '1G' | '1H' | '1A' | '3A' | '6A' | '1Y' | 'YB' | 'Tümü';

/** Intraday preview for "1G": 5-minute points across the session. */
const INTRADAY = { points: 60, drift: 0.00016, vol: 0.0016, seed: 11 };

export function demoSeries(range: DemoRange) {
  if (range !== '1G') {
    // Daily history from the engine: value and net invested.
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
  const { points, drift, vol, seed } = INTRADAY;
  const rand = mulberry32(seed);
  const raw: number[] = [1];
  for (let i = 1; i < points; i++) raw.push(raw[i - 1] * (1 + drift + (rand() - 0.5) * 2 * vol));
  const scale = DEMO_TOTAL_VALUE / raw[raw.length - 1];
  const values = raw.map((v) => v * scale);
  return { values, baseline: undefined, changeRatio: DEMO_TOTAL_VALUE / values[0] - 1 };
}

/* ───────────────────────── History list ───────────────────────── */

export type DemoTxnType = 'BUY' | 'SELL' | 'DEPOSIT' | 'WITHDRAW' | 'DIVIDEND' | 'FEE';

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
  /** Sales: realized P/L ÷ cost basis. */
  realizedRatio?: number;
  /** Created automatically (e.g. a deposit covering a purchase). */
  isAuto?: boolean;
}

function cashEffectTRY(t: Transaction): number {
  const fx = Number(t.fxRate ?? 1);
  const q = Number(t.quantity ?? 0);
  const p = Number(t.price ?? 0);
  const fee = Number(t.fee ?? 0);
  switch (t.type) {
    case 'DEPOSIT':
      return Number(t.amount);
    case 'WITHDRAW':
    case 'FEE':
      return -Number(t.amount);
    case 'BUY':
      return -(q * p + fee) * fx;
    case 'SELL':
      return (q * p - fee) * fx;
    case 'DIVIDEND':
      return (Number(t.amount) - Number(t.tax ?? 0)) * fx;
    default:
      return 0;
  }
}

/** Newest first, as the Geçmiş screen lists them. */
export const DEMO_TXNS: DemoTxn[] = DEMO_TRANSACTIONS.filter((t) => t.type !== 'SPLIT')
  .map((t) => {
    const asset = t.assetId ? DEMO_ASSETS.get(t.assetId) : undefined;
    const realization = DEMO_LEDGER.realizations.find((r) => r.txnId === t.id);
    return {
      id: t.id,
      ts: t.ts,
      type: t.type as DemoTxnType,
      symbol: asset?.symbol,
      market: asset ? MARKET_KEY[asset.market] : undefined,
      quantity: t.quantity !== undefined ? Number(t.quantity) : undefined,
      price: t.price !== undefined ? Number(t.price) : undefined,
      currency: (asset?.currency ?? 'TRY') as CurrencyCode,
      amountTRY: cashEffectTRY(t),
      realizedRatio: realization
        ? realization.pnlTRY.div(realization.costBasisTRY).toNumber()
        : undefined,
      isAuto: t.isAuto,
    };
  })
  .reverse();

/* ───────────────────────── Account (Hesabım) ───────────────────────── */

const ACCOUNT_PERIODS: PeriodKey[] = ['1A', '3A', '6A', 'YB', '1Y', 'Tümü'];

/** Account-level figures for the Fon (Hesabım) screen, computed from the demo history. */
export const DEMO_ACCOUNT = {
  riskLevel: DEMO_METRICS.riskLevel,
  returns: ACCOUNT_PERIODS.map((label) => ({ label, ratio: periodReturn('me', label) })),
};

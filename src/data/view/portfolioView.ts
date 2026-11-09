/**
 * The figures the screens show, computed from a portfolio's records, prices and cached daily
 * values. Pure: no database, no React. Screens never calculate; they read this.
 */
import {
  addDays,
  buildLedger,
  dailyChange,
  monthsBack,
  periodReturns,
  riskLevel,
  stepReturns,
  trDayStart,
  unitize,
  valuePortfolio,
  volatility,
  type Quote,
  type ReturnPeriod,
  type SeriesPoint,
  type Transaction,
} from '@/domain';
import type { CurrencyCode } from '@/utils/format';

import type { EngineOptions } from '../engine';
import type { Portfolio, StoredAsset } from '../types';

export type HoldingMarket = 'bist' | 'us' | 'crypto';

const MARKET_KEY: Record<string, HoldingMarket> = { BIST: 'bist', US: 'us', CRYPTO: 'crypto' };
/** Markets without their own colour yet (FX, commodities, …) are grouped with US for now. */
const marketKey = (m: string): HoldingMarket => MARKET_KEY[m] ?? 'us';

export interface Holding {
  assetId: string;
  symbol: string;
  name: string;
  market: HoldingMarket;
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
  /** Share of total value (0–1). */
  weight: number;
  /** Recent daily closes for the mini chart (oldest first). */
  spark: number[];
  /** No price yet: valued at the last trade price. */
  stale: boolean;
}

export interface Summary {
  totalValue: number;
  positions: number;
  cash: number;
  deposited: number;
  withdrawn: number;
  netInvested: number;
  netPnl: number;
  /** null when nothing is invested (shown as "—"). */
  netPnlRatio: number | null;
  realized: number;
  unrealized: number;
  dividends: number;
  commissions: number;
  accountFees: number;
  dailyChange: number;
  /** null when the day started empty. */
  dailyChangeRatio: number | null;
  /** Value of the open positions per market. */
  allocation: Record<HoldingMarket, number>;
}

export interface HistoryItem {
  id: string;
  ts: string;
  type: Exclude<Transaction['type'], 'SPLIT'> | 'SPLIT';
  assetId?: string;
  symbol?: string;
  market?: HoldingMarket;
  quantity?: number;
  price?: number;
  currency: CurrencyCode;
  /** Cash effect in TRY (+ in, − out). */
  amountTRY: number;
  /** Sales: realized P/L ÷ cost basis. */
  realizedRatio?: number;
  /** Created automatically for another record. */
  isAuto?: boolean;
  linkedTo?: string;
  note?: string;
  /** The record as stored (manual records only), for editing and undo. */
  source?: Transaction;
}

export interface DailySeries {
  dates: string[];
  values: number[];
  netInvested: number[];
  flows: number[];
  /** Internal unit values (time-weighted return); never shown as such. */
  unitValues: number[];
}

/** A comparison series aligned to the portfolio's days (TRY closes). */
export interface BenchmarkSeries {
  key: string;
  name: string;
  prices: number[];
}

export interface PortfolioData {
  portfolio: Portfolio;
  /** Manual + automatic records in processing order. */
  txns: Transaction[];
  assets: ReadonlyMap<string, StoredAsset>;
  quotes: Record<string, Quote>;
  sparks: Record<string, number[]>;
  series: SeriesPoint[];
  benchmarks: BenchmarkSeries[];
  /** Istanbul day the figures are for (yyyy-mm-dd). */
  today: string;
  engine: EngineOptions;
}

export interface PortfolioView {
  portfolio: Portfolio;
  isDemo: boolean;
  /** No records at all. */
  empty: boolean;
  today: string;
  summary: Summary;
  holdings: Holding[];
  /** Newest first. */
  history: HistoryItem[];
  series: DailySeries;
  periodReturns: Record<ReturnPeriod, number | null>;
  /** 1–7 (SRRI bands); null with less than a month of history. */
  riskLevel: number | null;
  /** Inputs kept for the (lazily computed) analysis. */
  data: PortfolioData;
}

const num = (d: { toNumber(): number } | null | undefined) => (d ? d.toNumber() : 0);

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
    case 'SPLIT':
      return 0;
  }
}

export function buildPortfolioView(data: PortfolioData): PortfolioView {
  const { portfolio, txns, assets, quotes, sparks, series, engine, today } = data;
  const ledger = buildLedger(txns, { method: engine.method });
  const valuation = valuePortfolio(ledger, quotes, {
    foreignCurrency: (id) => (assets.get(id)?.currency ?? 'TRY') !== 'TRY',
  });
  const day = dailyChange(txns, quotes, trDayStart(today), engine.method);

  const holdings: Holding[] = valuation.positions.map((p) => {
    const asset = assets.get(p.assetId);
    const pos = ledger.positions.get(p.assetId)!;
    const q = quotes[p.assetId];
    return {
      assetId: p.assetId,
      symbol: asset?.symbol ?? p.assetId,
      name: asset?.name ?? asset?.symbol ?? p.assetId,
      market: marketKey(asset?.market ?? 'US'),
      currency: (asset?.currency ?? 'TRY') as CurrencyCode,
      quantity: p.quantity.toNumber(),
      price: p.price.toNumber(),
      prevClose: q?.prevClose !== undefined ? Number(q.prevClose) : p.price.toNumber(),
      avgCost: p.averageCost.toNumber(),
      avgFx: pos.cost.gt(0) ? pos.costTRY.div(pos.cost).toNumber() : 1,
      valueTRY: p.valueTRY.toNumber(),
      costTRY: p.costTRY.toNumber(),
      dailyChangeTRY: num(day.byAsset[p.assetId]),
      weight: p.weight.toNumber(),
      spark: sparks[p.assetId] ?? [],
      stale: p.stale,
    };
  });

  const allocation: Record<HoldingMarket, number> = { bist: 0, us: 0, crypto: 0 };
  for (const h of holdings) allocation[h.market] += h.valueTRY;

  const realizations = new Map(ledger.realizations.map((r) => [r.txnId, r]));
  const history: HistoryItem[] = txns
    .map((t): HistoryItem => {
      const asset = t.assetId ? assets.get(t.assetId) : undefined;
      const r = realizations.get(t.id);
      return {
        id: t.id,
        ts: t.ts,
        type: t.type,
        assetId: t.assetId,
        symbol: asset?.symbol,
        market: asset ? marketKey(asset.market) : undefined,
        quantity: t.quantity !== undefined ? Number(t.quantity) : undefined,
        price: t.price !== undefined ? Number(t.price) : undefined,
        currency: (asset?.currency ?? 'TRY') as CurrencyCode,
        amountTRY: cashEffectTRY(t),
        realizedRatio:
          r && r.costBasisTRY.gt(0) ? r.pnlTRY.div(r.costBasisTRY).toNumber() : undefined,
        isAuto: t.isAuto,
        linkedTo: t.linkedTo,
        note: t.note,
        source: t.isAuto ? undefined : t,
      };
    })
    .reverse();

  const units = unitize(series);
  const unitValues = units.map((u) => u.unitValue);
  const end = series.length ? series[series.length - 1].date : today;
  // A risk level needs a few weeks of daily moves to mean anything.
  const level = series.length >= 30 ? riskLevel(volatility(stepReturns(unitValues), 365)) : null;

  return {
    portfolio,
    isDemo: portfolio.kind === 'demo',
    empty: txns.length === 0,
    today,
    summary: {
      totalValue: num(valuation.totalValue),
      positions: num(valuation.positionsValue),
      cash: num(valuation.cash),
      deposited: num(valuation.deposited),
      withdrawn: num(valuation.withdrawn),
      netInvested: num(valuation.netInvested),
      netPnl: num(valuation.netPnl),
      netPnlRatio: valuation.simpleReturn ? valuation.simpleReturn.toNumber() : null,
      realized: num(valuation.realized),
      unrealized: num(valuation.unrealized),
      dividends: num(valuation.dividends),
      commissions: num(valuation.commissions),
      accountFees: num(valuation.accountFees),
      dailyChange: num(day.total),
      dailyChangeRatio: day.ratio ? day.ratio.toNumber() : null,
      allocation,
    },
    holdings,
    history,
    series: {
      dates: series.map((p) => p.date),
      values: series.map((p) => p.value),
      netInvested: series.map((p) => p.netInvested),
      flows: series.map((p) => p.flow),
      unitValues,
    },
    periodReturns: periodReturns(units, end),
    riskLevel: level,
    data,
  };
}

export type ChartRange = '1H' | '1A' | '3A' | '6A' | '1Y' | 'YB' | 'Tümü';

/** Index of the day a period starts from (its base day, end-of-day convention). */
export function rangeStartIndex(dates: readonly string[], range: ChartRange): number {
  const n = dates.length;
  if (n === 0) return 0;
  const end = dates[n - 1];
  const firstAtOrAfter = (day: string) => {
    const i = dates.findIndex((d) => d >= day);
    return i === -1 ? n - 1 : i;
  };
  switch (range) {
    case '1H':
      return Math.max(0, n - 8);
    case '1A':
    case '3A':
    case '6A':
    case '1Y': {
      const months = { '1A': 1, '3A': 3, '6A': 6, '1Y': 12 }[range];
      return firstAtOrAfter(monthsBack(end, months));
    }
    case 'YB': {
      const yearEnd = `${Number(end.slice(0, 4)) - 1}-12-31`;
      return Math.max(0, firstAtOrAfter(addDays(yearEnd, 1)) - 1);
    }
    case 'Tümü':
      return 0;
  }
}

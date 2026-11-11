import { addDays, buildLedger, trDay, trDayStart } from '@/domain';

import type { AssetHistory } from '../service/assetHistory';
import type { Metrics } from './analysisView';
import type { HistoryItem, PortfolioView } from './portfolioView';

/**
 * Davranış Aynası (docs/02-HESAPLAMA-MOTORU.md §16.2): the person's own trades measured with
 * methods from behavioural-finance research. Measurements, not advice.
 */

// ── Yatkınlık etkisi (Odean 1998) ────────────────────────────────────────────

export interface Disposition {
  /** Days with at least one sale. */
  saleDays: number;
  realizedGains: number;
  paperGains: number;
  realizedLosses: number;
  paperLosses: number;
  /** Proportion of gains realized: RG / (RG + PG). */
  pgr: number | null;
  /** Proportion of losses realized: RL / (RL + PL). */
  plr: number | null;
  /** PGR − PLR: above 0 = winners sold more readily than losers. */
  difference: number | null;
  /** t statistic of the difference (two proportions). */
  t: number | null;
  /** Enough observations to say anything (≥ 5 gains and ≥ 5 losses seen on sale days). */
  enough: boolean;
}

/**
 * On every day with a sale, each position held that morning is a realized gain or loss (sold
 * that day, at the sale price) or a paper gain or loss (kept, at that day's close), against its
 * average purchase price (Odean, Journal of Finance 1998).
 */
export function disposition(view: PortfolioView, history: AssetHistory): Disposition {
  const txns = view.data.txns;
  const sales = txns.filter((t) => t.type === 'SELL' && t.assetId && !t.isAuto);
  const days = [...new Set(sales.map((t) => trDay(t.ts)))].sort();
  const dayIndex = new Map(history.dates.map((d, i) => [d, i]));
  let rg = 0;
  let pg = 0;
  let rl = 0;
  let pl = 0;
  for (const day of days) {
    const morning = buildLedger(txns, { before: trDayStart(day) });
    const soldToday = new Map<string, number>();
    for (const t of sales) {
      if (trDay(t.ts) !== day) continue;
      soldToday.set(t.assetId!, Number(t.price));
    }
    for (const [assetId, pos] of morning.positions) {
      if (!pos.quantity.gt(0)) continue;
      const avg = pos.cost.div(pos.quantity).toNumber();
      const sold = soldToday.get(assetId);
      if (sold !== undefined) {
        if (sold > avg) rg++;
        else if (sold < avg) rl++;
        continue;
      }
      const i = dayIndex.get(day);
      const close = i !== undefined ? history.assets.get(assetId)?.local[i] : null;
      if (close === null || close === undefined) continue;
      if (close > avg) pg++;
      else if (close < avg) pl++;
    }
  }
  const pgr = rg + pg > 0 ? rg / (rg + pg) : null;
  const plr = rl + pl > 0 ? rl / (rl + pl) : null;
  const difference = pgr !== null && plr !== null ? pgr - plr : null;
  let t: number | null = null;
  if (difference !== null) {
    const se = Math.sqrt((pgr! * (1 - pgr!)) / (rg + pg) + (plr! * (1 - plr!)) / (rl + pl));
    t = se > 0 ? difference / se : null;
  }
  return {
    saleDays: days.length,
    realizedGains: rg,
    paperGains: pg,
    realizedLosses: rl,
    paperLosses: pl,
    pgr,
    plr,
    difference,
    t,
    enough: rg + pg >= 5 && rl + pl >= 5,
  };
}

// ── Sattıktan sonra ne oldu? ─────────────────────────────────────────────────

export const AFTER_SALE_DAYS = [30, 91, 182, 365] as const;

export interface AfterSale {
  item: HistoryItem;
  /** Price change after the sale (TRY, splits included), per horizon; null if not reached. */
  after: Record<(typeof AFTER_SALE_DAYS)[number], number | null>;
  /** The portfolio's own (time-weighted) return over the same windows. */
  portfolioAfter: Record<(typeof AFTER_SALE_DAYS)[number], number | null>;
  /** What the sold units are worth today (TRY) vs what the sale brought. */
  valueToday: number | null;
  proceeds: number;
}

export interface AfterSaleSummary {
  sales: AfterSale[];
  /** Σ (value today − proceeds): above 0 = the sold assets went on rising. */
  heldDifference: number;
  /** Average price change 3 months after a sale, and the portfolio's over the same windows. */
  avg3m: number | null;
  portfolio3m: number | null;
  measured3m: number;
}

/** Price path of an asset after a trade day, in TRY with later splits folded in. */
function follow(view: PortfolioView, history: AssetHistory, type: 'BUY' | 'SELL'): AfterSale[] {
  const dayIndex = new Map(history.dates.map((d, i) => [d, i]));
  const unitByDay = new Map(view.series.dates.map((d, i) => [d, view.series.unitValues[i]]));
  const last = history.dates.length - 1;
  const out: AfterSale[] = [];
  for (const item of [...view.history].reverse()) {
    const t = item.source;
    if (item.type !== type || !t || !t.assetId || item.isAuto) continue;
    if (type === 'SELL' && !item.realized) continue;
    const a = history.assets.get(t.assetId);
    const day = trDay(t.ts);
    const i0 = dayIndex.get(day);
    if (!a || i0 === undefined) continue;
    const price = Number(t.price);
    const fx0 = t.fxRate ? Number(t.fxRate) : (a.fx[i0] ?? 1);
    const splitsAfter = (from: string, to: string) =>
      (history.splits.get(t.assetId!) ?? [])
        .filter((s) => s.date > from && s.date <= to)
        .reduce((f, s) => f * s.ratio, 1);
    const at = (j: number) => {
      const p = a.local[j];
      const fx = a.fx[j];
      if (p === null || fx === null) return null;
      return p * fx * splitsAfter(day, history.dates[j]);
    };
    const after = {} as AfterSale['after'];
    const portfolioAfter = {} as AfterSale['portfolioAfter'];
    for (const h of AFTER_SALE_DAYS) {
      const target = addDays(day, h);
      const j = dayIndex.get(target);
      const v = j !== undefined ? at(j) : null;
      after[h] = v !== null && price > 0 ? v / (price * fx0) - 1 : null;
      const u0 = unitByDay.get(day);
      const u1 = unitByDay.get(target);
      portfolioAfter[h] = u0 && u1 ? u1 / u0 - 1 : null;
    }
    const now = at(last);
    out.push({
      item,
      after,
      portfolioAfter,
      valueToday: now !== null ? now * Number(t.quantity) : null,
      proceeds: type === 'SELL' ? item.realized!.proceedsTRY : Math.abs(item.amountTRY),
    });
  }
  return out.reverse();
}

const avgOf = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export function afterSales(view: PortfolioView, history: AssetHistory): AfterSaleSummary {
  const sales = follow(view, history, 'SELL');
  const measured = sales.filter((s) => s.after[91] !== null && s.portfolioAfter[91] !== null);
  return {
    sales,
    heldDifference: sales.reduce(
      (s, x) => s + (x.valueToday !== null ? x.valueToday - x.proceeds : 0),
      0,
    ),
    avg3m: avgOf(measured.map((s) => s.after[91]!)),
    portfolio3m: avgOf(measured.map((s) => s.portfolioAfter[91]!)),
    measured3m: measured.length,
  };
}

// ── Aldıkların mı, sattıkların mı? (Odean 1999) ──────────────────────────────

export interface BuysVsSells {
  /** Horizon in days. */
  horizon: (typeof AFTER_SALE_DAYS)[number];
  bought: number | null;
  sold: number | null;
  boughtCount: number;
  soldCount: number;
  /** bought − sold: below 0 = what was sold did better than what was bought. */
  difference: number | null;
}

/** Average price change after buys and after sales over the same horizons. */
export function buysVsSells(view: PortfolioView, history: AssetHistory): BuysVsSells[] {
  const buys = follow(view, history, 'BUY');
  const sales = follow(view, history, 'SELL');
  return AFTER_SALE_DAYS.map((h) => {
    const b = buys.map((x) => x.after[h]).filter((x): x is number => x !== null);
    const s = sales.map((x) => x.after[h]).filter((x): x is number => x !== null);
    const bought = avgOf(b);
    const sold = avgOf(s);
    return {
      horizon: h,
      bought,
      sold,
      boughtCount: b.length,
      soldCount: s.length,
      difference: bought !== null && sold !== null ? bought - sold : null,
    };
  });
}

// ── Davranış farkı (Morningstar "Mind the Gap") ──────────────────────────────

export interface BehaviorGap {
  /** Money-weighted − time-weighted: below 0 = the timing of money in and out cost return. */
  gap: number | null;
  yearly: boolean;
  moneyWeighted: number | null;
  timeWeighted: number | null;
}

export function behaviorGap(metrics: Metrics | null): BehaviorGap {
  if (!metrics) return { gap: null, yearly: false, moneyWeighted: null, timeWeighted: null };
  if (metrics.annualized && metrics.xirr !== null && metrics.twrAnnual !== null) {
    return {
      gap: metrics.xirr - metrics.twrAnnual,
      yearly: true,
      moneyWeighted: metrics.xirr,
      timeWeighted: metrics.twrAnnual,
    };
  }
  return {
    gap: metrics.mwr !== null ? metrics.mwr - metrics.twr : null,
    yearly: false,
    moneyWeighted: metrics.mwr,
    timeWeighted: metrics.twr,
  };
}

// ── İşlem sıklığı ve maliyet yükü (Barber & Odean 2000) ──────────────────────

export interface Activity {
  years: number;
  trades: number;
  tradesPerMonth: number;
  /** min(buys, sales) ÷ average value, per year (the usual fund turnover). */
  turnover: number | null;
  level: 'düşük' | 'orta' | 'yüksek' | null;
  commissions: number;
  accountFees: number;
  /** Commissions and account fees per year, as a share of the average value. */
  costRatio: number | null;
  /** Share of the end wealth such a yearly cost takes over 20 years. */
  cost20y: number | null;
  averageValue: number;
}

/** Turnover bands (per year): under %30 low, %30–%100 medium, above high. A rough guide. */
export const TURNOVER_BANDS = { low: 0.3, high: 1 };

export function activity(view: PortfolioView): Activity {
  const { values, dates } = view.series;
  const years = Math.max(dates.length, 1) / 365;
  const positive = values.filter((v) => v > 0);
  const averageValue = positive.length ? positive.reduce((a, b) => a + b, 0) / positive.length : 0;
  let buys = 0;
  let sells = 0;
  let trades = 0;
  for (const h of view.history) {
    if (h.isAuto) continue;
    if (h.type === 'BUY') {
      buys += -h.amountTRY;
      trades++;
    } else if (h.type === 'SELL') {
      sells += h.amountTRY;
      trades++;
    }
  }
  const turnover = averageValue > 0 ? Math.min(buys, sells) / averageValue / years : null;
  const costs = view.summary.commissions + view.summary.accountFees;
  const costRatio = averageValue > 0 ? costs / averageValue / years : null;
  return {
    years,
    trades,
    tradesPerMonth: trades / Math.max(years * 12, 1),
    turnover,
    level:
      turnover === null
        ? null
        : turnover < TURNOVER_BANDS.low
          ? 'düşük'
          : turnover <= TURNOVER_BANDS.high
            ? 'orta'
            : 'yüksek',
    commissions: view.summary.commissions,
    accountFees: view.summary.accountFees,
    costRatio,
    cost20y: costRatio !== null ? 1 - (1 - Math.min(costRatio, 0.99)) ** 20 : null,
    averageValue,
  };
}

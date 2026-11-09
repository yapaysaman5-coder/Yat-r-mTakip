import { dec, ONE, sum, ZERO, type Dec } from './decimal';
import { buildLedger, openPositions, type LedgerState, type PositionState } from './ledger';
import type { CostMethod, Quote, Transaction } from './types';

/**
 * Valuation of a ledger at given quotes (docs/02-HESAPLAMA-MOTORU.md §5–§6).
 * All results in TRY unless noted.
 */

export interface FxSplit {
  /** Gain from the asset's own price move, at the average purchase exchange rate. */
  priceEffect: Dec;
  /** Gain from the currency move on today's value. */
  fxEffect: Dec;
}

export interface PositionValuation {
  assetId: string;
  quantity: Dec;
  /** Average cost per unit incl. commissions, asset currency (= break-even price). */
  averageCost: Dec;
  costTRY: Dec;
  price: Dec;
  fx: Dec;
  valueTRY: Dec;
  unrealizedTRY: Dec;
  /** null when the cost is zero. */
  unrealizedRatio: Dec | null;
  /** Share of the portfolio's total value (0–1). */
  weight: Dec;
  realizedTRY: Dec;
  dividendsTRY: Dec;
  /** Only for assets priced in a foreign currency. */
  fxSplit: FxSplit | null;
  /** true when no quote was supplied and the last trade price was used instead. */
  stale: boolean;
}

export interface PortfolioValuation {
  positions: PositionValuation[];
  cash: Dec;
  positionsValue: Dec;
  totalValue: Dec;
  deposited: Dec;
  withdrawn: Dec;
  netInvested: Dec;
  /** Total value − net invested. */
  netPnl: Dec;
  /** Net P/L ÷ net invested; null when net invested ≤ 0 (shown as "—"). */
  simpleReturn: Dec | null;
  realized: Dec;
  unrealized: Dec;
  dividends: Dec;
  accountFees: Dec;
  commissions: Dec;
  /** Assets valued at their last trade price because no quote was given. */
  staleAssets: string[];
}

/**
 * Splits a foreign-currency position's TRY gain into price and currency effects (doc §5.2):
 * priceEffect = (P₁ − P₀)·Q·K₀ and fxEffect = P₁·Q·(K₁ − K₀); their sum is the whole gain.
 */
export function fxDecomposition(p: PositionState, price: Dec, fx: Dec): FxSplit | null {
  if (!p.quantity.gt(0) || !p.cost.gt(0)) return null;
  const avgPrice = p.cost.div(p.quantity); // P₀
  const avgFx = p.costTRY.div(p.cost); // K₀
  return {
    priceEffect: price.minus(avgPrice).times(p.quantity).times(avgFx),
    fxEffect: price.times(p.quantity).times(fx.minus(avgFx)),
  };
}

export function valuePortfolio(
  ledger: LedgerState,
  quotes: Readonly<Record<string, Quote | undefined>>,
  options: { foreignCurrency?: (assetId: string) => boolean } = {},
): PortfolioValuation {
  const staleAssets: string[] = [];
  const rows = openPositions(ledger).map((p) => {
    const q = quotes[p.assetId];
    const stale = !q;
    if (stale) staleAssets.push(p.assetId);
    const price = q ? dec(q.price) : p.lastTradePrice;
    const fx = q?.fx !== undefined ? dec(q.fx) : q ? ONE : p.lastTradeFx;
    const valueTRY = p.quantity.times(price).times(fx);
    const unrealizedTRY = valueTRY.minus(p.costTRY);
    const isForeign = options.foreignCurrency
      ? options.foreignCurrency(p.assetId)
      : !fx.eq(1) || !p.costTRY.eq(p.cost);
    return {
      p,
      row: {
        assetId: p.assetId,
        quantity: p.quantity,
        averageCost: p.cost.div(p.quantity),
        costTRY: p.costTRY,
        price,
        fx,
        valueTRY,
        unrealizedTRY,
        unrealizedRatio: p.costTRY.gt(0) ? unrealizedTRY.div(p.costTRY) : null,
        weight: ZERO,
        realizedTRY: p.realizedTRY,
        dividendsTRY: p.dividendsTRY,
        fxSplit: isForeign ? fxDecomposition(p, price, fx) : null,
        stale,
      } satisfies PositionValuation,
    };
  });

  const positionsValue = sum(rows.map((r) => r.row.valueTRY));
  const totalValue = positionsValue.plus(ledger.cash);
  for (const r of rows) {
    r.row.weight = totalValue.gt(0) ? r.row.valueTRY.div(totalValue) : ZERO;
  }
  const netInvested = ledger.deposited.minus(ledger.withdrawn);
  const netPnl = totalValue.minus(netInvested);

  return {
    positions: rows.map((r) => r.row).sort((a, b) => b.valueTRY.comparedTo(a.valueTRY)),
    cash: ledger.cash,
    positionsValue,
    totalValue,
    deposited: ledger.deposited,
    withdrawn: ledger.withdrawn,
    netInvested,
    netPnl,
    simpleReturn: netInvested.gt(0) ? netPnl.div(netInvested) : null,
    realized: ledger.realizedTotal,
    unrealized: sum(rows.map((r) => r.row.unrealizedTRY)),
    dividends: ledger.dividends,
    accountFees: ledger.accountFees,
    commissions: ledger.commissions,
    staleAssets,
  };
}

/**
 * Core identity (doc §6): net P/L = unrealized + realized + dividends − account fees.
 * Returns the difference (zero when the books balance).
 */
export function identityGap(v: PortfolioValuation): Dec {
  return v.netPnl.minus(v.unrealized.plus(v.realized).plus(v.dividends).minus(v.accountFees));
}

export interface DailyChange {
  /** Per asset: today's P/L in TRY. */
  byAsset: Record<string, Dec>;
  total: Dec;
  /** Value at the start of the day (positions at previous close + cash). */
  startValue: Dec;
  /** total ÷ startValue; null when the day started empty. */
  ratio: Dec | null;
}

/**
 * Today's change (doc §5.3), per asset:
 *   (value now + today's sale proceeds) − (value at previous close + today's purchases).
 * This covers units held since yesterday, bought today, and bought and sold today.
 * Dividends and deposits are not market moves and are excluded.
 */
export function dailyChange(
  txns: readonly Transaction[],
  quotes: Readonly<Record<string, Quote | undefined>>,
  dayStart: string | number,
  method: CostMethod = 'average',
): DailyChange {
  const start = buildLedger(txns, { before: dayStart, method });
  const now = buildLedger(txns, { method });
  const startMs = new Date(dayStart).getTime();

  const bought: Record<string, Dec> = {};
  const sold: Record<string, Dec> = {};
  for (const t of txns) {
    if (Date.parse(t.ts) < startMs || !t.assetId) continue;
    const fx = t.fxRate ? dec(t.fxRate) : ONE;
    const gross = dec(t.quantity).times(dec(t.price));
    if (t.type === 'BUY') {
      bought[t.assetId] = (bought[t.assetId] ?? ZERO).plus(gross.plus(dec(t.fee)).times(fx));
    } else if (t.type === 'SELL') {
      sold[t.assetId] = (sold[t.assetId] ?? ZERO).plus(gross.minus(dec(t.fee)).times(fx));
    }
  }

  const assetIds = new Set<string>([
    ...openPositions(start).map((p) => p.assetId),
    ...openPositions(now).map((p) => p.assetId),
    ...Object.keys(bought),
    ...Object.keys(sold),
  ]);

  const byAsset: Record<string, Dec> = {};
  let startPositions = ZERO;
  for (const id of assetIds) {
    const q = quotes[id];
    const qtyStart = start.positions.get(id)?.quantity ?? ZERO;
    const qtyNow = now.positions.get(id)?.quantity ?? ZERO;
    const price = q ? dec(q.price) : (now.positions.get(id)?.lastTradePrice ?? ZERO);
    const fx = q?.fx !== undefined ? dec(q.fx) : ONE;
    const prev = q?.prevClose !== undefined ? dec(q.prevClose) : price;
    const fxPrev = q?.fxPrev !== undefined ? dec(q.fxPrev) : fx;
    const valueStart = qtyStart.times(prev).times(fxPrev);
    const valueNow = qtyNow.times(price).times(fx);
    startPositions = startPositions.plus(valueStart);
    byAsset[id] = valueNow
      .plus(sold[id] ?? ZERO)
      .minus(valueStart)
      .minus(bought[id] ?? ZERO);
  }

  const total = sum(Object.values(byAsset));
  const startValue = startPositions.plus(start.cash);
  return { byAsset, total, startValue, ratio: startValue.gt(0) ? total.div(startValue) : null };
}

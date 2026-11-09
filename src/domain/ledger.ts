import { dec, ONE, ZERO, type Dec } from './decimal';
import { sortTransactions } from './order';
import type { CostMethod, Transaction } from './types';

/**
 * The ledger replays transactions in order and keeps positions, cost basis, realized
 * profit, cash and the budget totals (docs/02-HESAPLAMA-MOTORU.md §2–§6, §13).
 * Amounts are in TRY unless the name says "asset currency".
 */

export interface Lot {
  txnId: string;
  /** Purchase time, epoch ms. */
  time: number;
  quantity: Dec;
  /** Remaining cost of this lot incl. the buy commission, in the asset's currency. */
  cost: Dec;
  /** Remaining cost of this lot in TRY at the purchase exchange rate. */
  costTRY: Dec;
}

export interface PositionState {
  assetId: string;
  quantity: Dec;
  /** Remaining cost basis in the asset's currency (commissions included). */
  cost: Dec;
  /** Remaining cost basis in TRY at the purchase exchange rates. */
  costTRY: Dec;
  /** Open lots, oldest first (cost basis for FIFO, holding period for both methods). */
  lots: Lot[];
  realized: Dec;
  realizedTRY: Dec;
  dividendsTRY: Dec;
  commissionsTRY: Dec;
  /** Last trade price seen (asset currency), a fallback when no market price exists. */
  lastTradePrice: Dec;
  lastTradeFx: Dec;
}

export interface Realization {
  txnId: string;
  assetId: string;
  ts: string;
  quantity: Dec;
  /** Sale value minus commission, asset currency / TRY. */
  proceeds: Dec;
  proceedsTRY: Dec;
  costBasis: Dec;
  costBasisTRY: Dec;
  pnl: Dec;
  pnlTRY: Dec;
  /** Average holding period of the sold units in days (oldest units first). */
  holdingDays: number;
}

export type LedgerIssueCode = 'OVERSELL' | 'NEGATIVE_CASH' | 'MISSING_ASSET';

export interface LedgerIssue {
  txnId: string;
  code: LedgerIssueCode;
  /** OVERSELL: units held at that time. */
  available?: string;
  /** OVERSELL: units the sale asked for. */
  requested?: string;
  /** NEGATIVE_CASH: cash after the transaction. */
  cash?: string;
}

export interface LedgerState {
  method: CostMethod;
  positions: Map<string, PositionState>;
  realizations: Realization[];
  cash: Dec;
  deposited: Dec;
  withdrawn: Dec;
  /** Net dividends received (after withholding tax). */
  dividends: Dec;
  /** Account fees (FEE transactions). */
  accountFees: Dec;
  /** Buy and sell commissions (already inside cost basis / proceeds). */
  commissions: Dec;
  realizedTotal: Dec;
  issues: LedgerIssue[];
}

export function createLedger(method: CostMethod = 'average'): LedgerState {
  return {
    method,
    positions: new Map(),
    realizations: [],
    cash: ZERO,
    deposited: ZERO,
    withdrawn: ZERO,
    dividends: ZERO,
    accountFees: ZERO,
    commissions: ZERO,
    realizedTotal: ZERO,
    issues: [],
  };
}

function position(state: LedgerState, assetId: string): PositionState {
  let p = state.positions.get(assetId);
  if (!p) {
    p = {
      assetId,
      quantity: ZERO,
      cost: ZERO,
      costTRY: ZERO,
      lots: [],
      realized: ZERO,
      realizedTRY: ZERO,
      dividendsTRY: ZERO,
      commissionsTRY: ZERO,
      lastTradePrice: ZERO,
      lastTradeFx: ONE,
    };
    state.positions.set(assetId, p);
  }
  return p;
}

const fxOf = (t: Transaction) => (t.fxRate ? dec(t.fxRate) : ONE);
const DAY_MS = 86_400_000;

function checkCash(state: LedgerState, t: Transaction) {
  if (state.cash.lt(0)) {
    state.issues.push({ txnId: t.id, code: 'NEGATIVE_CASH', cash: state.cash.toFixed() });
  }
}

/** Applies one transaction to the ledger state (transactions must arrive in sorted order). */
export function applyTransaction(state: LedgerState, t: Transaction): void {
  switch (t.type) {
    case 'DEPOSIT': {
      const amount = dec(t.amount);
      state.cash = state.cash.plus(amount);
      state.deposited = state.deposited.plus(amount);
      return;
    }
    case 'WITHDRAW': {
      const amount = dec(t.amount);
      state.cash = state.cash.minus(amount);
      state.withdrawn = state.withdrawn.plus(amount);
      checkCash(state, t);
      return;
    }
    case 'FEE': {
      const amount = dec(t.amount);
      state.cash = state.cash.minus(amount);
      state.accountFees = state.accountFees.plus(amount);
      checkCash(state, t);
      return;
    }
    case 'BUY':
      return applyBuy(state, t);
    case 'SELL':
      return applySell(state, t);
    case 'DIVIDEND': {
      if (!t.assetId) {
        state.issues.push({ txnId: t.id, code: 'MISSING_ASSET' });
        return;
      }
      const net = dec(t.amount).minus(dec(t.tax));
      const netTRY = net.times(fxOf(t));
      const p = position(state, t.assetId);
      p.dividendsTRY = p.dividendsTRY.plus(netTRY);
      state.dividends = state.dividends.plus(netTRY);
      state.cash = state.cash.plus(netTRY);
      return;
    }
    case 'SPLIT': {
      if (!t.assetId) {
        state.issues.push({ txnId: t.id, code: 'MISSING_ASSET' });
        return;
      }
      const ratio = dec(t.splitRatio);
      if (!ratio.gt(0)) return;
      const p = position(state, t.assetId);
      // Units multiply, unit cost divides, total cost is unchanged (doc §13.1).
      p.quantity = p.quantity.times(ratio);
      // Lot costs are totals, so only the unit counts change.
      p.lots = p.lots.map((lot) => ({ ...lot, quantity: lot.quantity.times(ratio) }));
      if (p.lastTradePrice.gt(0)) p.lastTradePrice = p.lastTradePrice.div(ratio);
      return;
    }
  }
}

function applyBuy(state: LedgerState, t: Transaction) {
  if (!t.assetId) {
    state.issues.push({ txnId: t.id, code: 'MISSING_ASSET' });
    return;
  }
  const q = dec(t.quantity);
  const price = dec(t.price);
  const fee = dec(t.fee);
  const fx = fxOf(t);
  const gross = q.times(price).plus(fee);
  const grossTRY = gross.times(fx);
  const feeTRY = fee.isZero() ? fee : fee.times(fx);

  const p = position(state, t.assetId);
  p.quantity = p.quantity.plus(q);
  p.cost = p.cost.plus(gross);
  p.costTRY = p.costTRY.plus(grossTRY);
  p.commissionsTRY = p.commissionsTRY.plus(feeTRY);
  p.lastTradePrice = price;
  p.lastTradeFx = fx;
  if (q.gt(0)) {
    p.lots.push({
      txnId: t.id,
      time: Date.parse(t.ts),
      quantity: q,
      cost: gross,
      costTRY: grossTRY,
    });
  }
  state.commissions = state.commissions.plus(feeTRY);
  state.cash = state.cash.minus(grossTRY);
  checkCash(state, t);
}

function applySell(state: LedgerState, t: Transaction) {
  if (!t.assetId) {
    state.issues.push({ txnId: t.id, code: 'MISSING_ASSET' });
    return;
  }
  const p = position(state, t.assetId);
  const requested = dec(t.quantity);
  let q = requested;
  if (q.gt(p.quantity)) {
    state.issues.push({
      txnId: t.id,
      code: 'OVERSELL',
      available: p.quantity.toFixed(),
      requested: requested.toFixed(),
    });
    q = p.quantity; // keep the books consistent: sell what was actually there
  }
  if (!q.gt(0)) return;

  const price = dec(t.price);
  const fx = fxOf(t);
  // The commission is charged in full even when the sale had to be clipped.
  const fee = dec(t.fee);
  const feeTRY = fee.isZero() ? fee : fee.times(fx);
  const proceeds = q.times(price).minus(fee);
  const proceedsTRY = proceeds.times(fx);
  const closesPosition = q.eq(p.quantity);

  // Walk the lots oldest-first: FIFO cost basis, and the holding period for both methods.
  // Only the consumed lots are touched, so long histories stay fast.
  let remaining = q;
  let fifoCost = ZERO;
  let fifoCostTRY = ZERO;
  let weightedDays = 0; // a statistic, not money: plain numbers are fine
  const sellTime = Date.parse(t.ts);
  let consumed = 0;
  while (remaining.gt(0) && consumed < p.lots.length) {
    const lot = p.lots[consumed];
    const days = (sellTime - lot.time) / DAY_MS;
    if (lot.quantity.lte(remaining)) {
      // Whole lot: its exact remaining cost, no division.
      fifoCost = fifoCost.plus(lot.cost);
      fifoCostTRY = fifoCostTRY.plus(lot.costTRY);
      weightedDays += lot.quantity.toNumber() * days;
      remaining = remaining.minus(lot.quantity);
      consumed++;
    } else {
      // Part of a lot: proportional share of its cost.
      const share = remaining.div(lot.quantity);
      const partCost = lot.cost.times(share);
      const partCostTRY = lot.costTRY.times(share);
      fifoCost = fifoCost.plus(partCost);
      fifoCostTRY = fifoCostTRY.plus(partCostTRY);
      weightedDays += remaining.toNumber() * days;
      p.lots[consumed] = {
        ...lot,
        quantity: lot.quantity.minus(remaining),
        cost: lot.cost.minus(partCost),
        costTRY: lot.costTRY.minus(partCostTRY),
      };
      remaining = ZERO;
    }
  }

  let costBasis: Dec;
  let costBasisTRY: Dec;
  if (closesPosition) {
    // Selling everything releases the whole remaining cost exactly (no rounding residue).
    costBasis = p.cost;
    costBasisTRY = p.costTRY;
  } else if (state.method === 'fifo') {
    costBasis = fifoCost;
    costBasisTRY = fifoCostTRY;
  } else {
    costBasis = q.times(p.cost).div(p.quantity);
    costBasisTRY = q.times(p.costTRY).div(p.quantity);
  }

  p.quantity = p.quantity.minus(q);
  p.cost = closesPosition ? ZERO : p.cost.minus(costBasis);
  p.costTRY = closesPosition ? ZERO : p.costTRY.minus(costBasisTRY);
  if (closesPosition) p.lots = [];
  else p.lots.splice(0, consumed);
  p.realized = p.realized.plus(proceeds.minus(costBasis));
  p.realizedTRY = p.realizedTRY.plus(proceedsTRY.minus(costBasisTRY));
  p.commissionsTRY = p.commissionsTRY.plus(feeTRY);
  p.lastTradePrice = price;
  p.lastTradeFx = fx;

  state.realizations.push({
    txnId: t.id,
    assetId: t.assetId,
    ts: t.ts,
    quantity: q,
    proceeds,
    proceedsTRY,
    costBasis,
    costBasisTRY,
    pnl: proceeds.minus(costBasis),
    pnlTRY: proceedsTRY.minus(costBasisTRY),
    holdingDays: weightedDays / q.toNumber(),
  });
  state.realizedTotal = state.realizedTotal.plus(proceedsTRY.minus(costBasisTRY));
  state.commissions = state.commissions.plus(feeTRY);
  state.cash = state.cash.plus(proceedsTRY);
}

export interface BuildLedgerOptions {
  method?: CostMethod;
  /** Only apply transactions at or before this instant (ISO string or epoch ms). */
  until?: string | number;
  /** Only apply transactions strictly before this instant. */
  before?: string | number;
}

/** Replays all transactions (sorted into processing order) into a fresh ledger. */
export function buildLedger(
  txns: readonly Transaction[],
  options: BuildLedgerOptions = {},
): LedgerState {
  const state = createLedger(options.method ?? 'average');
  const until = options.until !== undefined ? new Date(options.until).getTime() : Infinity;
  const before = options.before !== undefined ? new Date(options.before).getTime() : Infinity;
  for (const t of sortTransactions(txns)) {
    const time = Date.parse(t.ts);
    if (time > until || time >= before) break;
    applyTransaction(state, t);
  }
  return state;
}

/** Units of an asset held just after `ts` (for "you hold N units" in the sell form). */
export function quantityAt(
  txns: readonly Transaction[],
  assetId: string,
  ts: string | number,
): Dec {
  return buildLedger(txns, { until: ts }).positions.get(assetId)?.quantity ?? ZERO;
}

/** Positions that are still open (quantity > 0). */
export function openPositions(state: LedgerState): PositionState[] {
  return [...state.positions.values()].filter((p) => p.quantity.gt(0));
}

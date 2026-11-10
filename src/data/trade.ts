import {
  applyTransaction,
  createLedger,
  dec,
  ZERO,
  reconcileAutoRecords,
  sortTransactions,
  trDay,
  trDayStart,
  type Dec,
  type LedgerIssue,
  type Market,
  type Realization,
  type Transaction,
} from '@/domain';

import type { EngineOptions } from './engine';
import { DEFAULT_FEES, type FeeSettings } from './fees';
import { newLedgerIssues } from './service/transactions';

/**
 * The trade form's helpers (docs/01-PROJE-DOKUMANI.md §6.4). The preview replays the whole
 * history with the draft in it, so what the form shows is exactly what will be saved.
 */

export { DEFAULT_FEES, type FeeSettings } from './fees';

export function defaultFee(
  market: Market,
  gross: number,
  fees: FeeSettings = DEFAULT_FEES,
): number {
  if (!(gross > 0)) return 0;
  switch (market) {
    case 'BIST':
      return round(gross * fees.bistRate, 2);
    case 'US':
      return fees.usPerOrder;
    case 'CRYPTO':
      return round(gross * fees.cryptoRate, 2);
    default:
      return 0;
  }
}

const num = (n: number, max: number) =>
  String(Math.round(n * 10 ** max) / 10 ** max).replace('.', ',');

export function feeRule(market: Market, fees: FeeSettings = DEFAULT_FEES): string | null {
  switch (market) {
    case 'BIST':
      return '‰' + num(fees.bistRate * 1000, 3) + ' otomatik';
    case 'US':
      return '$' + num(fees.usPerOrder, 2) + ' otomatik';
    case 'CRYPTO':
      return '%' + num(fees.cryptoRate * 100, 3) + ' otomatik';
    default:
      return null;
  }
}

/** Withholding tax on dividends, suggested: Türkiye 15 %, US (treaty rate for individuals) 20 %. */
export function defaultDividendTax(market: Market): number {
  return market === 'US' ? 0.2 : market === 'BIST' ? 0.15 : 0;
}

const round = (n: number, d: number) => Math.round(n * 10 ** d) / 10 ** d;

/**
 * When a trade on an earlier day happened, if no time is given: during that market's session
 * (BIST 11:00, US 18:00, otherwise 12:00 Istanbul). Today's trades use the current time.
 */
export function tradeTime(market: Market, day: string, now: Date, time?: string): string {
  if (time && /^\d{1,2}:\d{2}$/.test(time)) {
    const [h, m] = time.split(':').map(Number);
    if (h < 24 && m < 60) return new Date(trDayStart(day) + (h * 60 + m) * 60_000).toISOString();
  }
  if (day === trDay(now)) return now.toISOString();
  const hour = market === 'BIST' ? 11 : market === 'US' ? 18 : 12;
  return new Date(trDayStart(day) + hour * 3_600_000).toISOString();
}

export interface TradePreview {
  /** Units held just before / after the record. */
  quantityBefore: Dec;
  quantityAfter: Dec;
  /** Average cost per unit after a purchase (asset currency, commissions included). */
  averageCostAfter: Dec | null;
  /** Portfolio cash just before the record (TRY). */
  cashBefore: Dec;
  /** Deposit added automatically for this purchase (TRY), if cash is short. */
  autoDeposit: Dec | null;
  /** Sale: realized result. */
  realization: Realization | null;
  /** Problems the save would refuse (selling more than held, cash going negative…). */
  issues: LedgerIssue[];
}

/** Replays the history with `draft` added (or replacing the record with the same id). */
export function previewTrade(
  existing: readonly Transaction[],
  draft: Transaction,
  engine: EngineOptions,
): TradePreview {
  const next = [...existing.filter((t) => t.id !== draft.id), draft];
  const all = sortTransactions(reconcileAutoRecords(next, engine));
  const auto = all.find((t) => t.isAuto && t.linkedTo === draft.id && t.type === 'DEPOSIT');
  const state = createLedger(engine.method);
  let quantityBefore = ZERO;
  let cashBefore = ZERO;
  for (const t of all) {
    // "Before" is just before the purchase's own automatic deposit, if it has one.
    if (t.id === (auto?.id ?? draft.id)) {
      quantityBefore = state.positions.get(draft.assetId ?? '')?.quantity ?? ZERO;
      cashBefore = state.cash;
    }
    applyTransaction(state, t);
    if (t.id === draft.id) break;
  }
  const pos = state.positions.get(draft.assetId ?? '');
  return {
    quantityBefore,
    quantityAfter: pos?.quantity ?? ZERO,
    averageCostAfter: pos && pos.quantity.gt(0) ? pos.cost.div(pos.quantity) : null,
    cashBefore,
    autoDeposit: auto?.amount ? dec(auto.amount) : null,
    realization: state.realizations.find((r) => r.txnId === draft.id) ?? null,
    issues: newLedgerIssues(existing, next, engine, draft.id),
  };
}

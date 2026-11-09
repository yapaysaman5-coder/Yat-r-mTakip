import { D, dec, ONE, toStr, ZERO, type Dec } from './decimal';
import { sortTransactions } from './order';
import type { Transaction } from './types';

/**
 * Automatic, linked records (docs/02-HESAPLAMA-MOTORU.md §2):
 * - a DEPOSIT covering the shortfall (rounded up to whole kuruş) when a BUY costs more than
 *   the cash on hand (when the "automatic deposit" setting is on), and
 * - a WITHDRAW of the proceeds for a SELL marked "withdraw proceeds".
 *
 * They are never edited by hand. After any change, all of them are regenerated from the
 * manual transactions, so editing or deleting a buy or sell keeps its linked record correct
 * and cash never goes negative because of a buy (invariant 4).
 */

export interface AutoRecordOptions {
  autoDeposit: boolean;
}

export const autoDepositId = (buyId: string) => `auto-dep-${buyId}`;
export const autoWithdrawId = (sellId: string) => `auto-wd-${sellId}`;

function cashEffect(t: Transaction): Dec {
  const fx = t.fxRate ? dec(t.fxRate) : ONE;
  switch (t.type) {
    case 'DEPOSIT':
      return dec(t.amount);
    case 'WITHDRAW':
    case 'FEE':
      return dec(t.amount).neg();
    case 'BUY':
      return dec(t.quantity).times(dec(t.price)).plus(dec(t.fee)).times(fx).neg();
    case 'SELL':
      return dec(t.quantity).times(dec(t.price)).minus(dec(t.fee)).times(fx);
    case 'DIVIDEND':
      return dec(t.amount).minus(dec(t.tax)).times(fx);
    case 'SPLIT':
      return ZERO;
  }
}

/** Returns the transactions with every automatic record regenerated, in processing order. */
export function reconcileAutoRecords(
  txns: readonly Transaction[],
  options: AutoRecordOptions,
): Transaction[] {
  const manual = sortTransactions(txns.filter((t) => !t.isAuto));
  const out: Transaction[] = [];
  let cash = ZERO;

  for (const t of manual) {
    const effect = cashEffect(t);
    if (t.type === 'BUY' && options.autoDeposit) {
      // Round the shortfall up to whole kuruş: a real deposit, and cash stays ≥ 0.
      const shortfall = effect.neg().minus(cash).toDecimalPlaces(2, D.ROUND_UP);
      if (shortfall.gt(0)) {
        out.push({
          id: autoDepositId(t.id),
          type: 'DEPOSIT',
          ts: t.ts,
          amount: toStr(shortfall),
          isAuto: true,
          linkedTo: t.id,
        });
        cash = cash.plus(shortfall);
      }
    }
    out.push(t);
    cash = cash.plus(effect);
    if (t.type === 'SELL' && t.withdrawProceeds && effect.gt(0)) {
      out.push({
        id: autoWithdrawId(t.id),
        type: 'WITHDRAW',
        ts: t.ts,
        amount: toStr(effect),
        isAuto: true,
        linkedTo: t.id,
      });
      cash = cash.minus(effect);
    }
  }
  return sortTransactions(out);
}

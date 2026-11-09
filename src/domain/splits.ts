import { buildLedger } from './ledger';
import { trDay, trDayStart } from './order';
import type { SplitEvent } from './series';
import type { Transaction } from './types';

/** Days around the source's split date within which a user's SPLIT record counts as the same event. */
const MATCH_WINDOW_DAYS = 3;

function dayDiff(a: string, b: string): number {
  return Math.abs(Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86_400_000;
}

/**
 * Splits / bonus issues reported by the data source that happened while the user held the
 * asset but have no matching SPLIT transaction (doc §13.1). Each one is offered as
 * "THYAO için 15.06.2026 tarihli %100 bedelsiz tespit edildi. Uygulansın mı?".
 */
export function suggestMissingSplits(
  txns: readonly Transaction[],
  providerSplits: readonly SplitEvent[],
): SplitEvent[] {
  return providerSplits.filter((s) => {
    const recorded = txns.some(
      (t) =>
        t.type === 'SPLIT' &&
        t.assetId === s.assetId &&
        dayDiff(trDay(t.ts), s.date) <= MATCH_WINDOW_DAYS,
    );
    if (recorded) return false;
    // Held at the start of the ex-date (Istanbul midnight)?
    const held = buildLedger(txns, { before: trDayStart(s.date) }).positions.get(
      s.assetId,
    )?.quantity;
    return !!held && held.gt(0);
  });
}

/** The SPLIT transaction to add when the user accepts a suggestion. */
export function splitTransactionFor(s: SplitEvent, id: string): Transaction {
  return {
    id,
    type: 'SPLIT',
    // Istanbul midnight of the ex-date, so the split applies before that day's trades.
    ts: new Date(trDayStart(s.date)).toISOString(),
    assetId: s.assetId,
    splitRatio: s.ratio,
  };
}

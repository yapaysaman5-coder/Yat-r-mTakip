import type { Transaction, TxnType } from './types';

/**
 * Processing order for transactions with the same timestamp (doc §4.4):
 * splits apply first, money comes in, then buys, sells, income and costs, and money goes out.
 */
const TYPE_ORDER: Record<TxnType, number> = {
  SPLIT: 0,
  DEPOSIT: 1,
  BUY: 2,
  SELL: 3,
  DIVIDEND: 4,
  FEE: 5,
  WITHDRAW: 6,
};

export function compareTransactions(a: Transaction, b: Transaction): number {
  const ta = Date.parse(a.ts);
  const tb = Date.parse(b.ts);
  if (ta !== tb) return ta - tb;
  const oa = TYPE_ORDER[a.type];
  const ob = TYPE_ORDER[b.type];
  if (oa !== ob) return oa - ob;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/** Returns a new array sorted into processing order (the input is not modified). */
export function sortTransactions(txns: readonly Transaction[]): Transaction[] {
  // Parse each timestamp once instead of on every comparison.
  return txns
    .map((t) => ({ t, time: Date.parse(t.ts), order: TYPE_ORDER[t.type] }))
    .sort((a, b) =>
      a.time !== b.time
        ? a.time - b.time
        : a.order !== b.order
          ? a.order - b.order
          : a.t.id < b.t.id
            ? -1
            : a.t.id > b.t.id
              ? 1
              : 0,
    )
    .map((x) => x.t);
}

/** Turkey has used a fixed UTC+3 offset since 2016. */
const TR_OFFSET_MS = 3 * 60 * 60 * 1000;

/** Calendar day (yyyy-mm-dd) of a timestamp in Istanbul time. */
export function trDay(ts: string | number | Date): string {
  return new Date(new Date(ts).getTime() + TR_OFFSET_MS).toISOString().slice(0, 10);
}

/** The UTC instant at which an Istanbul calendar day starts. */
export function trDayStart(day: string): number {
  return Date.parse(`${day}T00:00:00Z`) - TR_OFFSET_MS;
}

/** The UTC instant at which an Istanbul calendar day ends (exclusive). */
export function trDayEnd(day: string): number {
  return trDayStart(day) + 86_400_000;
}

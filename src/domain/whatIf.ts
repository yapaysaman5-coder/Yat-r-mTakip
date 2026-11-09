/**
 * "Ya Olsaydı?" — replays the user's cash flows into a benchmark
 * (docs/02-HESAPLAMA-MOTORU.md §12.2).
 */

export interface IndexedFlow {
  /** Index into the price series (the flow happens at that point's close). */
  index: number;
  /** + deposit, − withdrawal (in the reporting currency). */
  amount: number;
}

export interface WhatIfResult {
  /** Value of the benchmark holding at every point of the price series. */
  values: number[];
  units: number[];
  totalIn: number;
  /** Withdrawals actually paid out (may be less than requested if the benchmark fell). */
  paidOut: number;
  /** Requested withdrawals the benchmark could not cover. */
  shortfall: number;
  /** Final value + paid out − total in. */
  netPnl: number;
}

export function simulateWhatIf(prices: number[], flows: IndexedFlow[]): WhatIfResult {
  const byIndex = new Map<number, number>();
  for (const f of flows) byIndex.set(f.index, (byIndex.get(f.index) ?? 0) + f.amount);

  let units = 0;
  let totalIn = 0;
  let paidOut = 0;
  let shortfall = 0;
  const values: number[] = [];
  const unitSeries: number[] = [];

  for (let i = 0; i < prices.length; i++) {
    const amount = byIndex.get(i);
    const price = prices[i];
    if (amount !== undefined && price > 0) {
      if (amount > 0) {
        units += amount / price;
        totalIn += amount;
      } else if (amount < 0) {
        const wanted = -amount / price;
        if (wanted > units) {
          shortfall += (wanted - units) * price;
          paidOut += units * price;
          units = 0;
        } else {
          units -= wanted;
          paidOut += -amount;
        }
      }
    }
    unitSeries.push(units);
    values.push(units * price);
  }

  const finalValue = values.length ? values[values.length - 1] : 0;
  return {
    values,
    units: unitSeries,
    totalIn,
    paidOut,
    shortfall,
    netPnl: finalValue + paidOut - totalIn,
  };
}

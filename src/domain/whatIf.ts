import { dec, ZERO } from './decimal';

/**
 * "Ya Olsaydı?" — replays the user's cash flows into a benchmark
 * (docs/02-HESAPLAMA-MOTORU.md §12.2). Units and money totals use decimal arithmetic;
 * the per-day value series is returned as numbers for charts.
 */

export interface IndexedFlow {
  /** Index into the price series (the flow happens at that point's close). */
  index: number;
  /** + deposit, − withdrawal (in the reporting currency). */
  amount: number | string;
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

export function simulateWhatIf(
  prices: readonly (number | string)[],
  flows: readonly IndexedFlow[],
): WhatIfResult {
  const byIndex = new Map<number, ReturnType<typeof dec>>();
  for (const f of flows) byIndex.set(f.index, (byIndex.get(f.index) ?? ZERO).plus(dec(f.amount)));

  let units = ZERO;
  let totalIn = ZERO;
  let paidOut = ZERO;
  let shortfall = ZERO;
  let finalValue = ZERO;
  const values: number[] = [];
  const unitSeries: number[] = [];

  for (let i = 0; i < prices.length; i++) {
    const price = dec(prices[i]);
    const amount = byIndex.get(i);
    if (amount !== undefined && price.gt(0)) {
      if (amount.gt(0)) {
        units = units.plus(amount.div(price));
        totalIn = totalIn.plus(amount);
      } else if (amount.lt(0)) {
        const wanted = amount.neg().div(price);
        if (wanted.gt(units)) {
          shortfall = shortfall.plus(wanted.minus(units).times(price));
          paidOut = paidOut.plus(units.times(price));
          units = ZERO;
        } else {
          units = units.minus(wanted);
          paidOut = paidOut.plus(amount.neg());
        }
      }
    }
    finalValue = units.times(price);
    unitSeries.push(units.toNumber());
    values.push(finalValue.toNumber());
  }

  return {
    values,
    units: unitSeries,
    totalIn: totalIn.toNumber(),
    paidOut: paidOut.toNumber(),
    shortfall: shortfall.toNumber(),
    netPnl: finalValue.plus(paidOut).minus(totalIn).toNumber(),
  };
}

/**
 * Inflation and real return (docs/02-HESAPLAMA-MOTORU.md §11).
 *
 * The monthly CPI (TÜFE) index for month M is treated as the level at the end of M.
 * Days inside a month are interpolated geometrically between the two month ends. Months not
 * yet published are extrapolated with the last published monthly rate and flagged.
 */

/** CPI index per month: { '2026-09': 3412.71, ... } */
export type CpiTable = Readonly<Record<string, number>>;

export interface CpiValue {
  value: number;
  /** true when the value relies on an extrapolated (not yet published) month. */
  estimated: boolean;
}

function monthKey(year: number, month0: number): string {
  const d = new Date(Date.UTC(year, month0, 1));
  return d.toISOString().slice(0, 7);
}

function daysInMonth(year: number, month0: number): number {
  return new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate();
}

/** CPI level on a given day (yyyy-mm-dd), or null outside the table's range. */
export function cpiOnDate(cpi: CpiTable, date: string): CpiValue | null {
  const keys = Object.keys(cpi).sort();
  if (keys.length < 2) return null;
  const year = Number(date.slice(0, 4));
  const month0 = Number(date.slice(5, 7)) - 1;
  const day = Number(date.slice(8, 10));
  const prevKey = monthKey(year, month0 - 1);
  const thisKey = monthKey(year, month0);
  const monthEnd = day >= daysInMonth(year, month0);
  // A month's last day is that month's own index; other days also need the previous month.
  if ((monthEnd ? thisKey : prevKey) < keys[0]) return null;

  const lastKey = keys[keys.length - 1];
  const lastRate = cpi[lastKey] / cpi[keys[keys.length - 2]];
  let estimated = false;
  const level = (key: string): number => {
    if (cpi[key] !== undefined) return cpi[key];
    // Extrapolate forward from the last published month.
    estimated = true;
    const [ly, lm] = lastKey.split('-').map(Number);
    const [ky, km] = key.split('-').map(Number);
    const monthsAhead = (ky - ly) * 12 + (km - lm);
    return cpi[lastKey] * Math.pow(lastRate, monthsAhead);
  };

  const end = level(thisKey);
  if (monthEnd) return { value: end, estimated };
  const start = level(prevKey);
  const fraction = day / daysInMonth(year, month0);
  return { value: start * Math.pow(end / start, fraction), estimated };
}

/** Inflation between two days, e.g. 0.312 = 31,2%. */
export function inflationBetween(cpi: CpiTable, from: string, to: string): CpiValue | null {
  const a = cpiOnDate(cpi, from);
  const b = cpiOnDate(cpi, to);
  if (!a || !b) return null;
  return { value: b.value / a.value - 1, estimated: a.estimated || b.estimated };
}

/** Real return: (1 + nominal) / (1 + inflation) − 1. */
export function realReturn(nominal: number, inflation: number): number {
  return (1 + nominal) / (1 + inflation) - 1;
}

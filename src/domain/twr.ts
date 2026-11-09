/**
 * Time-weighted return through internal unit values (docs/02-HESAPLAMA-MOTORU.md §8).
 * The unit value / unit count are purely internal: they are never shown to the user.
 *
 * Daily values cannot show when during the day money moved, so a convention is needed:
 * money coming in joins at the START of the day (it usually funds that day's purchases), and
 * money going out leaves at the END of the day (it usually comes from that day's sales):
 *   units'      = units_(d−1) + inflow_d / unitValue_(d−1)
 *   unitValue_d = (value_d + outflow_d) / units'
 *   units_d     = units' − outflow_d / unitValue_d
 * With this, a trade price that differs from the day's close can move the result by at most
 * the day's move of the money already invested (with end-of-day inflows the error grew with
 * the size of the deposit). On the first day (or after everything was withdrawn) units are
 * issued at the last unit value and the day's move is credited to them.
 */

export interface UnitPoint {
  date: string;
  unitValue: number;
  units: number;
}

export function unitize(
  points: readonly { date: string; value: number; flow: number }[],
): UnitPoint[] {
  const out: UnitPoint[] = [];
  let units = 0;
  let unitValue = 1;
  for (const p of points) {
    const inflow = Math.max(0, p.flow);
    const outflow = Math.max(0, -p.flow);
    const pre = units + inflow / unitValue;
    // Value the day's units earned: today's value plus what left at the end of the day.
    const earned = p.value + outflow;
    if (pre > 1e-12 && earned > 0) {
      unitValue = earned / pre;
      units = pre - outflow / unitValue;
    } else {
      // Everything was lost or withdrawn: keep the last unit value, no units left.
      units = 0;
    }
    if (p.value <= 1e-9 || units < 1e-12) units = 0;
    out.push({ date: p.date, unitValue, units });
  }
  return out;
}

/** Unit value on the last day at or before `date` (null when the series starts later). */
function unitValueAt(units: readonly UnitPoint[], date: string): number | null {
  let found: number | null = null;
  for (const u of units) {
    if (u.date > date) break;
    found = u.unitValue;
  }
  return found;
}

/** TWR between two days (end of `from` → end of `to`). */
export function twrBetween(units: readonly UnitPoint[], from: string, to: string): number | null {
  const a = unitValueAt(units, from);
  const b = unitValueAt(units, to);
  return a === null || b === null || a === 0 ? null : b / a - 1;
}

export type ReturnPeriod = '1A' | '3A' | '6A' | 'YB' | '1Y' | 'Tümü';

/** The same day `months` months earlier (clamped to the month’s last day). */
export function monthsBack(day: string, months: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - months, 1));
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  target.setUTCDate(Math.min(d.getUTCDate(), lastDay));
  return target.toISOString().slice(0, 10);
}

/**
 * Period returns table (doc §8). 1A/3A/6A/1Y need history reaching back that far (else null).
 * YB starts at the previous year's last day, or at inception for portfolios started this year.
 */
export function periodReturns(
  units: readonly UnitPoint[],
  end: string,
): Record<ReturnPeriod, number | null> {
  if (units.length === 0)
    return { '1A': null, '3A': null, '6A': null, YB: null, '1Y': null, Tümü: null };
  const firstDate = units[0].date;
  const fromInception = (start: string) =>
    start < firstDate ? null : twrBetween(units, start, end);
  // Unit values start at 1, so the value at `end` is the whole-history growth factor.
  const sinceStart = () => {
    const last = unitValueAt(units, end);
    return last === null ? null : last - 1;
  };
  const yearEnd = `${Number(end.slice(0, 4)) - 1}-12-31`;
  return {
    '1A': fromInception(monthsBack(end, 1)),
    '3A': fromInception(monthsBack(end, 3)),
    '6A': fromInception(monthsBack(end, 6)),
    YB: yearEnd < firstDate ? sinceStart() : twrBetween(units, yearEnd, end),
    '1Y': fromInception(monthsBack(end, 12)),
    Tümü: sinceStart(),
  };
}

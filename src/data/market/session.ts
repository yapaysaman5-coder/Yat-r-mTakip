import type { Market } from '@/domain';

import type { Instrument } from './instruments';

/**
 * Trading sessions (docs/03-TEKNIK-MIMARI.md §7). Used to decide how often to ask for prices
 * and what to show ("Açık", "Kapalı"). A fresh trade from the source always wins over the
 * calendar, so a mistake here costs at most a slower refresh, never a wrong price.
 */
export type Venue = 'BIST' | 'NYSE' | 'FX' | 'CRYPTO';

export interface SessionInfo {
  venue: Venue;
  open: boolean;
  /** Next opening (epoch ms) while closed. */
  opensAt?: number;
  /** Closing time (epoch ms) while open. */
  closesAt?: number;
}

/** Borsa İstanbul holidays (full days) and half days (closes 12:30), 2026–2027. */
const BIST_HOLIDAYS = new Set([
  '2026-01-01', '2026-03-20', '2026-04-23', '2026-05-01', '2026-05-19', '2026-05-27',
  '2026-05-28', '2026-05-29', '2026-07-15', '2026-10-29',
  '2027-01-01', '2027-03-09', '2027-03-10', '2027-03-11', '2027-04-23', '2027-05-19',
  '2027-05-17', '2027-05-18', '2027-07-15', '2027-08-30', '2027-10-29',
]); // prettier-ignore
const BIST_HALF_DAYS = new Set([
  '2026-03-19',
  '2026-05-26',
  '2026-10-28',
  '2027-03-08',
  '2027-10-28',
]);

/** NYSE / Nasdaq full-day holidays, 2026–2027. */
const NYSE_HOLIDAYS = new Set([
  '2026-01-01', '2026-01-19', '2026-02-16', '2026-04-03', '2026-05-25', '2026-06-19',
  '2026-07-03', '2026-09-07', '2026-11-26', '2026-12-25',
  '2027-01-01', '2027-01-18', '2027-02-15', '2027-03-26', '2027-05-31', '2027-06-18',
  '2027-07-05', '2027-09-06', '2027-11-25', '2027-12-24',
]); // prettier-ignore

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

export function venueOf(inst: Pick<Instrument, 'id' | 'market'>): Venue {
  if (inst.market === 'BIST' || inst.id === 'INDEX:XU100' || inst.id === 'INDEX:XU030') {
    return 'BIST';
  }
  if (inst.market === 'US' || inst.market === 'INDEX') return 'NYSE';
  if (inst.market === 'CRYPTO') return 'CRYPTO';
  return 'FX'; // currencies and commodities
}

/** UTC offset of New York at a moment (EDT from the 2nd Sunday of March to the 1st of Nov). */
export function newYorkOffsetHours(t: number): number {
  const year = new Date(t).getUTCFullYear();
  const nthSunday = (month: number, n: number) => {
    const first = new Date(Date.UTC(year, month, 1)).getUTCDay();
    return 1 + ((7 - first) % 7) + (n - 1) * 7;
  };
  // Changes happen at 02:00 local: 07:00 UTC in March (EST), 06:00 UTC in November (EDT).
  const start = Date.UTC(year, 2, nthSunday(2, 2), 7);
  const end = Date.UTC(year, 10, nthSunday(10, 1), 6);
  return t >= start && t < end ? -4 : -5;
}

/** Local calendar day and minutes since local midnight for a fixed offset. */
function local(t: number, offsetHours: number) {
  const d = new Date(t + offsetHours * HOUR);
  return {
    day: d.toISOString().slice(0, 10),
    weekday: d.getUTCDay(),
    minutes: d.getUTCHours() * 60 + d.getUTCMinutes(),
    midnight: Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - offsetHours * HOUR,
  };
}

function exchange(
  t: number,
  offset: (t: number) => number,
  hours: (day: string) => [open: number, close: number] | null,
): Omit<SessionInfo, 'venue'> {
  const now = local(t, offset(t));
  const today = now.weekday >= 1 && now.weekday <= 5 ? hours(now.day) : null;
  if (today && now.minutes >= today[0] && now.minutes < today[1]) {
    return { open: true, closesAt: now.midnight + today[1] * MIN };
  }
  // Find the next session start (within two weeks).
  for (let i = 0; i < 15; i++) {
    const probe = local(now.midnight + i * DAY + 12 * HOUR, offset(t));
    if (probe.weekday < 1 || probe.weekday > 5) continue;
    const h = hours(probe.day);
    if (!h) continue;
    const opensAt = probe.midnight + h[0] * MIN;
    if (opensAt > t) return { open: false, opensAt };
  }
  return { open: false };
}

export function sessionAt(venue: Venue, t: number): SessionInfo {
  switch (venue) {
    case 'CRYPTO':
      return { venue, open: true };
    case 'FX': {
      // Around the clock from Sunday 22:00 to Friday 22:00 UTC.
      const d = new Date(t);
      const wd = d.getUTCDay();
      const h = d.getUTCHours();
      const open = !(wd === 6 || (wd === 5 && h >= 22) || (wd === 0 && h < 22));
      return { venue, open };
    }
    case 'BIST':
      return {
        ...exchange(
          t,
          () => 3,
          (day) =>
            BIST_HOLIDAYS.has(day) ? null : BIST_HALF_DAYS.has(day) ? [600, 750] : [600, 1080],
        ),
        venue,
      };
    case 'NYSE':
      return {
        ...exchange(t, newYorkOffsetHours, (day) => (NYSE_HOLIDAYS.has(day) ? null : [570, 960])),
        venue,
      };
  }
}

/**
 * Refresh intervals (ms) while the app is in front: crypto 15 s, US 15 s (5 min closed),
 * currencies and gold 30 s (5 min closed), BIST 60 s (none while closed: the last close
 * stands until the next session).
 */
export function refreshInterval(venue: Venue, open: boolean): number | null {
  switch (venue) {
    case 'CRYPTO':
      return 15_000;
    case 'NYSE':
      return open ? 15_000 : 5 * MIN;
    case 'FX':
      return open ? 30_000 : 5 * MIN;
    case 'BIST':
      return open ? 60_000 : null;
  }
}

/**
 * Which instruments to ask for now: those never fetched, and those whose interval has passed
 * for their market's current state. A closed BIST is still asked once after it closes, to
 * pick up the final (delayed) closing price.
 */
export function dueInstruments(
  instruments: readonly Instrument[],
  lastFetched: ReadonlyMap<string, number>,
  t: number,
): Instrument[] {
  return instruments.filter((inst) => {
    const last = lastFetched.get(inst.id);
    if (last === undefined) return true;
    const venue = venueOf(inst);
    const s = sessionAt(venue, t);
    const interval = refreshInterval(venue, s.open);
    if (interval !== null) return t - last >= interval;
    // Closed BIST: one more look 20 minutes after the close (15-minute delayed data).
    const closedSince = sessionAt(venue, last).open ? last : null;
    return closedSince !== null && t - last >= 20 * MIN;
  });
}

export const VENUE_LABEL: Record<Venue, string> = {
  BIST: 'Borsa İstanbul',
  NYSE: 'ABD borsaları',
  FX: 'Döviz ve emtia',
  CRYPTO: 'Kripto',
};

export const marketOfVenue = (v: Venue): Market =>
  v === 'BIST' ? 'BIST' : v === 'NYSE' ? 'US' : v === 'CRYPTO' ? 'CRYPTO' : 'FX';

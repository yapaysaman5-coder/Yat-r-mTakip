import { describe, expect, it } from '@jest/globals';

import { instrumentFor } from '../instruments';
import { dueInstruments, newYorkOffsetHours, sessionAt, venueOf } from '../session';

/** Istanbul local time → epoch ms (UTC+3 all year). */
const ist = (s: string) => Date.parse(`${s}:00+03:00`);

describe('trading sessions', () => {
  it('knows Borsa İstanbul hours, weekends, holidays and half days', () => {
    expect(sessionAt('BIST', ist('2026-11-09T09:59')).open).toBe(false);
    expect(sessionAt('BIST', ist('2026-11-09T10:00'))).toMatchObject({
      open: true,
      closesAt: ist('2026-11-09T18:00'),
    });
    expect(sessionAt('BIST', ist('2026-11-09T18:00'))).toMatchObject({
      open: false,
      opensAt: ist('2026-11-10T10:00'),
    });
    // Friday evening → Monday morning.
    expect(sessionAt('BIST', ist('2026-11-13T19:00')).opensAt).toBe(ist('2026-11-16T10:00'));
    // Kurban Bayramı 2026: arife half day, then closed until Monday 1 June.
    expect(sessionAt('BIST', ist('2026-05-26T12:00')).closesAt).toBe(ist('2026-05-26T12:30'));
    expect(sessionAt('BIST', ist('2026-05-26T13:00')).opensAt).toBe(ist('2026-06-01T10:00'));
  });

  it('follows New York time across daylight saving', () => {
    expect(newYorkOffsetHours(Date.parse('2026-03-08T06:59:00Z'))).toBe(-5);
    expect(newYorkOffsetHours(Date.parse('2026-03-08T07:00:00Z'))).toBe(-4);
    expect(newYorkOffsetHours(Date.parse('2026-11-01T05:59:00Z'))).toBe(-4);
    expect(newYorkOffsetHours(Date.parse('2026-11-01T06:00:00Z'))).toBe(-5);
    // 9 Nov 2026 (EST): 09:30 New York = 17:30 Istanbul.
    expect(sessionAt('NYSE', ist('2026-11-09T17:29')).opensAt).toBe(ist('2026-11-09T17:30'));
    expect(sessionAt('NYSE', ist('2026-11-09T17:30')).open).toBe(true);
    // Summer (EDT): 09:30 New York = 16:30 Istanbul.
    expect(sessionAt('NYSE', ist('2026-07-06T16:30')).open).toBe(true);
    // Thanksgiving.
    expect(sessionAt('NYSE', ist('2026-11-26T18:00')).open).toBe(false);
  });

  it('keeps currencies open on weekdays and crypto always', () => {
    expect(sessionAt('FX', Date.parse('2026-11-14T12:00:00Z')).open).toBe(false); // Saturday
    expect(sessionAt('FX', Date.parse('2026-11-15T22:30:00Z')).open).toBe(true); // Sunday night
    expect(sessionAt('CRYPTO', Date.parse('2026-11-14T12:00:00Z')).open).toBe(true);
    expect(venueOf(instrumentFor('INDEX:XU100')!)).toBe('BIST');
    expect(venueOf(instrumentFor('INDEX:SPX')!)).toBe('NYSE');
    expect(venueOf(instrumentFor('COMMODITY:GAU')!)).toBe('FX');
  });
});

describe('refresh planning', () => {
  const thy = instrumentFor('BIST:THYAO')!;
  const btc = instrumentFor('CRYPTO:BTC')!;
  const aapl = instrumentFor('US:AAPL')!;

  it('asks for new instruments at once and each market at its own pace', () => {
    const t = ist('2026-11-09T15:00'); // BIST open, NYSE closed
    expect(dueInstruments([thy, btc, aapl], new Map(), t)).toHaveLength(3);
    const last = new Map([
      [thy.id, t - 30_000],
      [btc.id, t - 20_000],
      [aapl.id, t - 60_000],
    ]);
    expect(dueInstruments([thy, btc, aapl], last, t).map((i) => i.id)).toEqual(['CRYPTO:BTC']);
    const later = new Map([...last].map(([k]) => [k, t - 6 * 60_000]));
    expect(dueInstruments([thy, btc, aapl], later, t)).toHaveLength(3);
  });

  it('looks at a closed BIST once more after the close, then waits for the next session', () => {
    const fetchedAt = ist('2026-11-09T17:55');
    const after = ist('2026-11-09T18:20');
    expect(dueInstruments([thy], new Map([[thy.id, fetchedAt]]), after)).toHaveLength(1);
    expect(dueInstruments([thy], new Map([[thy.id, after]]), ist('2026-11-09T23:00'))).toHaveLength(
      0,
    );
  });
});

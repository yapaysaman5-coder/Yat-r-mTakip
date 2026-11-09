import { describe, expect, it } from '@jest/globals';

import { instrumentFor } from '../instruments';
import { cpiDaily, parseCpiPage, tcmbCpi } from '../providers/tcmbCpi';
import { MarketError } from '../types';
import { fakeHttp, fixture } from './fakeHttp';

/** Recorded from the TCMB "Tüketici Fiyatları" page on 9 Nov 2026. */
const PAGE = fixture('tcmb-tufe.html');

describe('TÜFE from TCMB', () => {
  it('reads every month since January 2005, oldest first', () => {
    const months = parseCpiPage(PAGE);
    const check = (m: (typeof months)[number], month: string, monthly: number, annual: number) => {
      expect(m.month).toBe(month);
      expect(m.monthly).toBeCloseTo(monthly, 10);
      expect(m.annual).toBeCloseTo(annual, 10);
    };
    check(months[0], '2005-01', 0.0055, 0.0924);
    check(months.at(-1)!, '2026-10', 0.0258, 0.2977);
    expect(months).toHaveLength(262); // Jan 2005 – Oct 2026
  });

  it('chains the monthly changes: twelve months give the published annual change', () => {
    const months = parseCpiPage(PAGE);
    const last12 = months.slice(-12);
    const chained = last12.reduce((a, m) => a * (1 + m.monthly), 1) - 1;
    // Monthly figures are rounded to two decimals, so allow a few tenths of a point.
    expect(chained).toBeCloseTo(months.at(-1)!.annual, 2);
  });

  it('spreads each month over its days and holds the last level after it', () => {
    const months = parseCpiPage(PAGE);
    const days = cpiDaily(months, '2026-09-30', '2026-11-09');
    const at = (d: string) => days.find((x) => x.date === d)!.close;
    // October: +2,58 % from the end of September to the end of October.
    expect(at('2026-10-31') / at('2026-09-30') - 1).toBeCloseTo(0.0258, 8);
    // Half-way through October about half of it (geometrically).
    expect(at('2026-10-16') / at('2026-09-30')).toBeCloseTo(1.0258 ** (16 / 31), 8);
    // November is not published yet: flat.
    expect(at('2026-11-09')).toBe(at('2026-10-31'));
    expect(cpiDaily(months, '2004-12-30', '2005-01-02').map((d) => d.date)).toEqual([
      '2005-01-01',
      '2005-01-02',
    ]);
  });

  it('refuses a page without the table or with a gap', () => {
    expect(() => parseCpiPage('<html></html>')).toThrow(MarketError);
    const gap = PAGE.replace(/<tr[^>]*>\s*<td[^>]*>\s*(<[^>]+>\s*)*06-2026[\s\S]*?<\/tr>/, '');
    expect(gap).not.toBe(PAGE);
    expect(() => parseCpiPage(gap)).toThrow(/boşluk/);
  });

  it('is the source of the TÜFE benchmark, refetching two months each time', async () => {
    const inst = instrumentFor('MACRO:CPI')!;
    expect(inst.sources).toEqual([{ source: 'tcmbcpi', ref: 'TUFE' }]);
    expect(inst.refreshDays).toBe(62);
    const http = fakeHttp([[/Tuketici\+Fiyatlari/, PAGE]]);
    const h = await tcmbCpi.history('TUFE', '2026-10-01', '2026-10-31', http);
    expect(h.closes).toHaveLength(31);
  });
});

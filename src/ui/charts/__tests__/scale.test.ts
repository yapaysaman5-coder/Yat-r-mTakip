import { describe, expect, it } from '@jest/globals';

import { downsampleIndices, niceTicks, rebasePercent, valueAxis } from '../scale';
import { monotonePath, scalePoints } from '../path';

describe('niceTicks', () => {
  it('produces round steps that cover the range', () => {
    expect(niceTicks(0, 100, 4)).toEqual([0, 25, 50, 75, 100]);
  });

  it('covers money ranges with round values', () => {
    const t = niceTicks(380_124, 1_412_300, 4);
    expect(t[0]).toBeLessThanOrEqual(380_124);
    expect(t[t.length - 1]).toBeGreaterThanOrEqual(1_412_300);
    expect(t).toEqual([0, 500_000, 1_000_000, 1_500_000]);
  });

  it('handles percentages around zero', () => {
    expect(niceTicks(-0.08, 0.32, 4)).toEqual([-0.1, 0, 0.1, 0.2, 0.3, 0.4]);
  });

  it('handles a flat series', () => {
    expect(niceTicks(10, 10).length).toBeGreaterThan(1);
  });
});

describe('valueAxis', () => {
  it('keeps the domain tight around the data with round ticks inside', () => {
    const a = valueAxis(330_000, 1_550_000, 5);
    expect(a.domainMin).toBeLessThan(330_000);
    expect(a.domainMin).toBeGreaterThan(250_000);
    expect(a.domainMax).toBeLessThan(1_650_000);
    expect(a.ticks).toEqual([500_000, 1_000_000, 1_500_000]);
    for (const t of a.ticks) {
      expect(t).toBeGreaterThanOrEqual(a.domainMin);
      expect(t).toBeLessThanOrEqual(a.domainMax);
    }
  });

  it('works for a flat series', () => {
    const a = valueAxis(100, 100);
    expect(a.domainMax).toBeGreaterThan(a.domainMin);
  });
});

describe('downsampleIndices', () => {
  it('keeps everything when short enough', () => {
    expect(downsampleIndices(5, 10)).toEqual([0, 1, 2, 3, 4]);
  });

  it('keeps first and last and caps the count', () => {
    const idx = downsampleIndices(666, 120);
    expect(idx[0]).toBe(0);
    expect(idx[idx.length - 1]).toBe(665);
    expect(idx.length).toBeLessThanOrEqual(120);
  });
});

describe('rebasePercent', () => {
  it('is value / net invested − 1 from the start', () => {
    expect(rebasePercent([100, 110, 220], [100, 100, 200])).toEqual([
      0, 0.10000000000000009, 0.10000000000000009,
    ]);
  });

  it('rebases inside a window, adding later flows to the base', () => {
    const r = rebasePercent([100, 120, 230], [100, 100, 200], 1);
    expect(r[0]).toBe(0);
    expect(r[1]).toBeCloseTo(230 / 220 - 1, 12);
  });
});

describe('path helpers', () => {
  it('maps the max value to the top and min to the bottom', () => {
    const pts = scalePoints([1, 3, 2], { width: 100, height: 50, padTop: 0, padBottom: 0 });
    expect(pts.map((p) => p.y)).toEqual([50, 0, 25]);
    expect(pts.map((p) => p.x)).toEqual([0, 50, 100]);
  });

  it('builds a smooth path that starts and ends on the data', () => {
    const d = monotonePath([
      { x: 0, y: 10 },
      { x: 10, y: 0 },
      { x: 20, y: 5 },
    ]);
    expect(d.startsWith('M0,10C')).toBe(true);
    expect(d.endsWith(',20,5')).toBe(true);
  });
});

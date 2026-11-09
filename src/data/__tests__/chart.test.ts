import { describe, expect, it } from '@jest/globals';

import { migrate } from '../db/migrations';
import { openNodeDriver } from '../db/nodeDriver';
import { DEMO_PORTFOLIO_ID, seedDemo } from '../demo/seed';
import { loadPortfolioData } from '../service/load';
import { changeBetween, customChart, homeChart } from '../view/chart';
import { buildPortfolioView } from '../view/portfolioView';

const NOW = new Date('2026-11-09T13:00:00Z');

async function demoView() {
  const db = openNodeDriver();
  await migrate(db);
  await seedDemo(db, { now: NOW });
  return buildPortfolioView((await loadPortfolioData(db, DEMO_PORTFOLIO_ID, { now: NOW }))!);
}

describe('home chart', () => {
  it('labels every point and carries net invested for reading the chart', async () => {
    const view = await demoView();
    const c = homeChart(view, '3A', NOW.getTime());
    expect(c.labels).toHaveLength(c.values.length);
    expect(c.netInvested).toHaveLength(c.values.length);
    expect(c.labels.at(-1)).toBe('09.11.2026');
    const day = homeChart(view, '1G', NOW.getTime());
    expect(day.labels[0]).toBe('Bugün 00:00');
    expect(day.labels.at(-1)).toBe('Bugün 16:00');
    expect(day.values.at(-1)).toBeCloseTo(view.summary.totalValue, 6);
  });

  it('measures the change between two points without the money added in between', async () => {
    const view = await demoView();
    const c = homeChart(view, 'Tümü', NOW.getTime());
    // Over the whole range: the market gain only (the total minus everything put in).
    const whole = changeBetween(c, 0, c.values.length - 1);
    expect(whole.amount).toBeCloseTo(
      c.values.at(-1)! - c.values[0] - (c.netInvested.at(-1)! - c.netInvested[0]),
      6,
    );
    // The last ₺50.000 deposit's day does not count it as gain.
    const i = view.series.flows.lastIndexOf(50_000);
    const step = changeBetween(c, i - 1, i);
    expect(c.values[i] - c.values[i - 1]).toBeGreaterThan(40_000);
    expect(Math.abs(step.amount)).toBeLessThan(40_000);
  });

  it('shows a custom range of days', async () => {
    const view = await demoView();
    const c = customChart(view, '2026-06-01', '2026-06-30');
    expect(c.labels[0]).toBe('01.06.2026');
    expect(c.labels.at(-1)).toBe('30.06.2026');
    expect(c.values).toHaveLength(30);
    expect(c.changeRatio).not.toBeNull();
    expect(customChart(view, '2030-01-01', '2030-02-01').values).toEqual([]);
  });
});

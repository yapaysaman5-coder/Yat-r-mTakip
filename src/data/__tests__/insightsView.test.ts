import { describe, expect, it } from '@jest/globals';

import { migrate } from '../db/migrations';
import { openNodeDriver } from '../db/nodeDriver';
import { DEMO_PORTFOLIO_ID, seedDemo } from '../demo/seed';
import { loadPortfolioData } from '../service/load';
import {
  assetResults,
  concentration,
  distribution,
  drawdownSeries,
  sectorOf,
  squarify,
} from '../view/insightsView';
import { buildPortfolioView } from '../view/portfolioView';

const NOW = new Date('2026-11-09T13:00:00Z');

async function demoView() {
  const db = openNodeDriver();
  await migrate(db);
  await seedDemo(db, { now: NOW });
  return buildPortfolioView((await loadPortfolioData(db, DEMO_PORTFOLIO_ID, { now: NOW }))!);
}

describe('drawdown', () => {
  it('measures the fall from the last peak', () => {
    expect(drawdownSeries([1, 1.2, 0.9, 1.3, 1.17])).toEqual([0, 0, -0.25, 0, expect.any(Number)]);
    expect(drawdownSeries([1, 1.2, 0.9, 1.3, 1.17])[4]).toBeCloseTo(-0.1, 10);
  });
});

describe('asset results', () => {
  it('adds unrealized, realized and dividends per asset, closed ones included', async () => {
    const view = await demoView();
    const r = assetResults(view);
    const sum = r.reduce((s, a) => s + a.total, 0);
    // Everything the assets earned, minus account fees, is the net P/L.
    expect(sum - view.summary.accountFees).toBeCloseTo(view.summary.netPnl, 4);
    expect(r[0].total).toBeGreaterThanOrEqual(r[r.length - 1].total);
    const thyao = r.find((a) => a.symbol === 'THYAO')!;
    expect(thyao.open).toBe(true);
    expect(thyao.dividends).toBeCloseTo(2295, 2);
  });
});

describe('concentration', () => {
  it('reports the largest positions and warns above the limits', async () => {
    const view = await demoView();
    const c = concentration(view);
    expect(c.largest?.symbol).toBe('THYAO');
    expect(c.largest!.weight).toBeCloseTo(312400 / view.summary.totalValue, 10);
    expect(c.top5).toBeGreaterThan(c.top3);
    expect(c.hhi).toBeGreaterThan(0);
    expect(c.hhi).toBeLessThan(1);
    // THYAO is about %21,8 and the top three about %52: no warning.
    expect(c.warning).toBeNull();
    const one = { ...view, holdings: view.holdings.slice(0, 1) };
    const big = concentration({ ...one, summary: { ...view.summary, totalValue: 400000 } });
    expect(big.warning).toMatch(/THYAO hesabının %78/);
  });
});

describe('distribution', () => {
  it('splits the account by market, currency and sector, adding up to the total', async () => {
    const view = await demoView();
    const d = distribution(view);
    const total = (s: { value: number }[]) => s.reduce((a, b) => a + b.value, 0);
    expect(total(d.byMarket)).toBeCloseTo(view.summary.totalValue, 4);
    expect(total(d.byCurrency)).toBeCloseTo(view.summary.totalValue, 4);
    expect(total(d.bySector)).toBeCloseTo(view.summary.totalValue, 4);
    expect(d.byCurrency.map((s) => s.key)).toEqual(['TRY', 'USD']);
    expect(d.tiles[0].symbol).toBe('THYAO');
  });

  it('knows sectors from the catalogs', () => {
    expect(sectorOf('ASELS', 'bist')).toBe('Savunma');
    expect(sectorOf('NVDA', 'us')).toBe('Teknoloji');
    expect(sectorOf('QQQ', 'us')).toBe('Endeks fonu (ETF)');
    expect(sectorOf('BTC', 'crypto')).toBe('Kripto');
    expect(sectorOf('ZZZZ', 'us')).toBe('Diğer (ABD)');
  });
});

describe('treemap layout', () => {
  it('gives each value a share of the area and fills the box', () => {
    const values = [6, 6, 4, 3, 2, 2, 1];
    const rects = squarify(values, 600, 400);
    const area = (r: { w: number; h: number }) => r.w * r.h;
    const total = values.reduce((a, b) => a + b, 0);
    rects.forEach((r, i) => expect(area(r)).toBeCloseTo((values[i] / total) * 600 * 400, 6));
    for (const r of rects) {
      expect(r.x).toBeGreaterThanOrEqual(-1e-9);
      expect(r.y).toBeGreaterThanOrEqual(-1e-9);
      expect(r.x + r.w).toBeLessThanOrEqual(600 + 1e-9);
      expect(r.y + r.h).toBeLessThanOrEqual(400 + 1e-9);
    }
    // The classic example lays the first two side by side as near-squares.
    expect(rects[0].w / rects[0].h).toBeGreaterThan(0.6);
  });
});

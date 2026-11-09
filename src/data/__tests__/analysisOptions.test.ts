import { describe, expect, it } from '@jest/globals';

import { migrate } from '../db/migrations';
import { openNodeDriver } from '../db/nodeDriver';
import { DEMO_PORTFOLIO_ID, seedDemo } from '../demo/seed';
import { loadPortfolioData } from '../service/load';
import { buildAnalysis } from '../view/analysisView';
import { buildPortfolioView } from '../view/portfolioView';

const NOW = new Date('2026-11-09T13:00:00Z');

async function demoView() {
  const db = openNodeDriver();
  await migrate(db);
  await seedDemo(db, { now: NOW });
  return buildPortfolioView((await loadPortfolioData(db, DEMO_PORTFOLIO_ID, { now: NOW }))!);
}

describe('"Ya Olsaydı?" options', () => {
  it('in US dollars: every amount at that day’s rate; holding dollars is flat', async () => {
    const view = await demoView();
    const a = buildAnalysis(view, { currency: 'USD', basis: 'flows' });
    expect(a.usdAvailable).toBe(true);
    expect(a.options.currency).toBe('USD');
    const usdTry = view.data.benchmarks.find((b) => b.key === 'usd')!.prices;
    const last = usdTry.length - 1;
    const me = a.series[0];
    expect(me.values[last]).toBeCloseTo(view.summary.totalValue / usdTry[last], 6);
    // "Dolar/TL" in dollars does not move: its replay is just the dollars put in.
    const usd = a.series.find((s) => s.key === 'usd')!;
    expect(Math.max(...usd.prices)).toBeCloseTo(1, 12);
    expect(Math.min(...usd.prices)).toBeCloseTo(1, 12);
    expect(usd.values[last]).toBeCloseTo(a.netInvested[last], 4);
    // Net invested in dollars: each deposit at its day's rate.
    const expected = view.series.flows.reduce((s, f, i) => s + f / usdTry[i], 0);
    expect(a.netInvested[last]).toBeCloseTo(expected, 6);
  });

  it('on buys and sells: positions only, money in = buys − sells', async () => {
    const view = await demoView();
    const a = buildAnalysis(view, { currency: 'TRY', basis: 'trades' });
    const last = a.dates.length - 1;
    const trades = view.history
      .filter((h) => h.type === 'BUY' || h.type === 'SELL')
      .reduce((s, h) => s - h.amountTRY, 0);
    expect(a.netInvested[last]).toBeCloseTo(trades, 4);
    expect(a.series[0].values[last]).toBeCloseTo(view.summary.positions, 4);
  });

  it('falls back to TL when there is no Dolar/TL series', async () => {
    const view = await demoView();
    const noUsd = {
      ...view,
      data: { ...view.data, benchmarks: view.data.benchmarks.filter((b) => b.key !== 'usd') },
    };
    const a = buildAnalysis(noUsd, { currency: 'USD', basis: 'flows' });
    expect(a.usdAvailable).toBe(false);
    expect(a.options.currency).toBe('TRY');
  });
});

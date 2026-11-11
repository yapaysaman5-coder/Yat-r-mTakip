import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from '@jest/globals';

import { addDays, normCdf, normInv, seededRandom } from '@/domain';

import { migrate } from '../db/migrations';
import { openNodeDriver } from '../db/nodeDriver';
import { DEMO_PORTFOLIO_ID, seedDemo } from '../demo/seed';
import { MarketError } from '../market/types';
import { joinFactors, parseFrenchCsv, unzipCsv } from '../market/providers/french';
import type { AssetHistory, AssetPrices } from '../service/assetHistory';
import { loadAssetHistory } from '../service/assetHistory';
import { demoFactors, loadFactors, syncFactors } from '../service/factors';
import { loadPortfolioData } from '../service/load';
import { buildAnalysis, type AnalysisView } from '../view/analysisView';
import { factorReport } from '../view/factorsView';
import { simulateGoal } from '../view/goalView';
import { healthReport } from '../view/healthView';
import { DEFAULT_PLAN, planCheck } from '../view/planView';
import { buildPortfolioView, type PortfolioView } from '../view/portfolioView';
import { skillReport } from '../view/skillView';

const FIXTURES = join(__dirname, '../market/__tests__/fixtures');
const zip = (name: string) => new Uint8Array(readFileSync(join(FIXTURES, name)));
const FIVE = 'F-F_Research_Data_5_Factors_2x3_daily_CSV.zip';
const MOM = 'F-F_Momentum_Factor_daily_CSV.zip';

/** A calendar of `n` days from 2026-01-01 with each asset's prices (TRY). */
function history(prices: Record<string, number[]>): AssetHistory {
  const n = Object.values(prices)[0].length;
  const dates = Array.from({ length: n }, (_, i) => addDays('2026-01-01', i));
  const assets = new Map<string, AssetPrices>();
  for (const [id, p] of Object.entries(prices)) {
    assets.set(id, { assetId: id, currency: 'TRY', local: p, adjusted: p, fx: p.map(() => 1) });
  }
  return { dates, assets, splits: new Map() };
}

/** Only what the science views read from a portfolio view. */
function fakeView(
  holdings: { id: string; value: number; market?: 'bist' | 'us' | 'crypto' }[],
  cash = 0,
): PortfolioView {
  const allocation = { bist: 0, us: 0, crypto: 0 };
  for (const h of holdings) allocation[h.market ?? 'bist'] += h.value;
  const total = holdings.reduce((s, h) => s + h.value, 0) + cash;
  return {
    summary: { totalValue: total, cash, allocation },
    holdings: holdings.map((h) => ({
      assetId: h.id,
      symbol: h.id,
      market: h.market ?? 'bist',
      valueTRY: h.value,
    })),
  } as unknown as PortfolioView;
}

const path = (returns: number[], start = 100) => {
  const out = [start];
  for (const r of returns) out.push(out[out.length - 1] * (1 + r));
  return out;
};

async function demo() {
  const now = new Date('2026-11-09T12:00:00Z');
  const db = openNodeDriver();
  await migrate(db);
  await seedDemo(db, { now });
  const view = buildPortfolioView((await loadPortfolioData(db, DEMO_PORTFOLIO_ID, { now }))!);
  return { db, view };
}

describe('skill or luck (PSR, MinTRL, alpha t)', () => {
  const analysis = (me: number[], bench: number[], riskFree = 0) =>
    ({
      series: [{ key: 'me', prices: me }],
      mainBenchmark: { key: 'xu100', prices: bench },
      riskFree,
    }) as unknown as AnalysisView;

  it('needs 20 daily returns', () => {
    const p = path(Array(10).fill(0.001));
    expect(skillReport(analysis(p, p))).toMatchObject({ enough: false, verdict: 'veri-az' });
  });

  it('finds a steady alpha and ties PSR to the minimum track record', () => {
    const rnd = seededRandom(7);
    const market = Array.from({ length: 500 }, () => 0.012 * rnd.normal());
    const mine = market.map((m) => 0.002 + m + 0.004 * rnd.normal());
    const r = skillReport(analysis(path(mine), path(market)));
    expect(r.enough).toBe(true);
    expect(r.alphaAnnual!).toBeCloseTo(0.002 * 365, 0);
    expect(r.alphaT!).toBeGreaterThan(5);
    expect(r.alphaProbability!).toBeGreaterThan(0.99);
    // n − 1 and MinTRL − 1 scale with (z ÷ z₉₅)² (same Sharpe, skew and kurtosis).
    const zPsr = normInv(r.psr!);
    expect((r.minTrackYears! * 365 - 1) / (r.n - 1)).toBeCloseTo((normInv(0.95) / zPsr) ** 2, 6);
    expect(r.alphaYearsNeeded!).toBeLessThan(r.yearsSoFar);
  });

  it('calls pure noise undecided and a steady loss negative', () => {
    const rnd = seededRandom(11);
    const market = Array.from({ length: 300 }, () => 0.01 * rnd.normal());
    const noise = market.map(() => 0.01 * rnd.normal());
    const r = skillReport(analysis(path(noise), path(market)));
    expect(Math.abs(r.alphaT!)).toBeLessThan(3);
    const losing = market.map((m) => m - 0.003 + 0.002 * rnd.normal());
    const l = skillReport(analysis(path(losing), path(market)));
    expect(l.verdict).toBe('olumsuz');
    expect(l.minTrackYears).toBeNull();
    expect(l.alphaYearsNeeded).toBeNull();
  });

  it('PSR follows Bailey & López de Prado for normal returns', () => {
    // Sharpe 0,1 a day over 253 days, no skew, kurtosis 3: Φ(0,1·√252 ÷ √(1 + 0,5·0,01)).
    const expected = normCdf((0.1 * Math.sqrt(252)) / Math.sqrt(1 + 0.5 * 0.01));
    expect(expected).toBeCloseTo(0.9434, 3);
  });
});

describe('portfolio health (risk contributions, diversification)', () => {
  // A: + − + −, B: + + − −: same volatility, correlation exactly 0.
  const a = Array.from({ length: 40 }, (_, i) => (i % 2 === 0 ? 0.01 : -0.01));
  const b = Array.from({ length: 40 }, (_, i) => (i % 4 < 2 ? 0.01 : -0.01));

  it('splits the risk of two unrelated assets in half', () => {
    const h = history({ A: path(a), B: path(b) });
    const r = healthReport(
      fakeView(
        [
          { id: 'A', value: 50 },
          { id: 'B', value: 50 },
        ],
        100,
      ),
      h,
    );
    expect(r.enough).toBe(true);
    expect(r.days).toBe(40);
    expect(r.averageCorrelation!).toBeCloseTo(0, 10);
    expect(r.diversificationRatio!).toBeCloseTo(Math.SQRT2, 10);
    expect(r.assets.map((x) => x.riskShare)).toEqual([0.5, 0.5].map((x) => expect.closeTo(x, 10)));
    expect(r.effectivePositions).toBeCloseTo(2, 10);
    expect(r.effectiveRiskPositions!).toBeCloseTo(2, 10);
    expect(r.matrix[0][1]).toBeCloseTo(0, 10);
    // Cash (half the money) has no risk: σₚ = σ·√(0,25² + 0,25²).
    expect(r.volatility!).toBeCloseTo(r.assets[0].volatility * Math.sqrt(0.125), 10);
  });

  it('gives no benefit to assets that move together', () => {
    const h = history({ A: path(a), B: path(a.map((x) => 2 * x)) });
    const r = healthReport(
      fakeView([
        { id: 'A', value: 50 },
        { id: 'B', value: 50 },
      ]),
      h,
    );
    expect(r.averageCorrelation!).toBeCloseTo(1, 10);
    expect(r.diversificationRatio!).toBeCloseTo(1, 10);
    // B moves twice as much: two thirds of the risk.
    expect(r.assets[0]).toMatchObject({ assetId: 'B', riskShare: expect.closeTo(2 / 3, 8) });
  });

  it('waits for 30 common days', () => {
    const h = history({ A: path(a.slice(0, 20)) });
    expect(healthReport(fakeView([{ id: 'A', value: 1 }]), h)).toMatchObject({
      enough: false,
      days: 20,
    });
  });
});

describe('Fama–French factors', () => {
  it('reads the library files (percent → decimal, YYYYMMDD → day)', () => {
    const five = parseFrenchCsv(unzipCsv(zip(FIVE)));
    expect(five.header).toEqual(['Mkt-RF', 'SMB', 'HML', 'RMW', 'CMA', 'RF']);
    const mom = parseFrenchCsv(unzipCsv(zip(MOM)));
    expect(mom.header[0]).toMatch(/Mom/i);
    expect([...five.rows.keys()].at(-1)).toBe('2026-09-30');
    const rows = joinFactors(unzipCsv(zip(FIVE)), unzipCsv(zip(MOM)), '2025-01-01');
    expect(rows[0].date >= '2025-01-01').toBe(true);
    expect(rows.at(-1)!.date).toBe('2026-09-30');
    for (const r of rows.slice(-50)) {
      expect(Math.abs(r.values['Mkt-RF'])).toBeLessThan(0.2);
      expect(r.rf).toBeGreaterThanOrEqual(0);
    }
  });

  it('rejects files that are not zips', () => {
    expect(() => unzipCsv(new Uint8Array([1, 2, 3]))).toThrow(MarketError);
  });

  it('recovers known loadings from the real factor returns', () => {
    const factors = joinFactors(unzipCsv(zip(FIVE)), unzipCsv(zip(MOM)), '2025-09-01');
    const rnd = seededRandom(3);
    const byDay = new Map(
      factors.map((f) => [
        f.date,
        f.rf +
          1.2 * f.values['Mkt-RF'] +
          0.5 * f.values.SMB -
          0.4 * f.values.HML +
          0.001 * rnd.normal(),
      ]),
    );
    const start = addDays(factors[0].date, -1);
    const dates: string[] = [];
    for (let d = start; d <= factors.at(-1)!.date; d = addDays(d, 1)) dates.push(d);
    let p = 100;
    const prices = dates.map((d) => (p *= 1 + (byDay.get(d) ?? 0)));
    const h: AssetHistory = {
      dates,
      assets: new Map([
        ['US:X', { assetId: 'US:X', currency: 'USD', local: prices, adjusted: prices, fx: [] }],
      ]),
      splits: new Map(),
    };
    const r = factorReport(fakeView([{ id: 'US:X', value: 100, market: 'us' }], 300), h, factors);
    expect(r.enough).toBe(true);
    expect(r.n).toBe(factors.length - 1);
    expect(r.coverage).toBeCloseTo(0.25, 10);
    const beta = Object.fromEntries(r.loadings.map((l) => [l.key, l]));
    expect(beta['Mkt-RF'].beta).toBeCloseTo(1.2, 1);
    expect(beta.SMB.beta).toBeCloseTo(0.5, 1);
    expect(beta.HML.beta).toBeCloseTo(-0.4, 1);
    expect(beta['Mkt-RF'].significant && beta.SMB.significant && beta.HML.significant).toBe(true);
    expect(Math.abs(beta.MOM.beta)).toBeLessThan(0.1);
    expect(r.r2!).toBeGreaterThan(0.9);
    expect(Math.abs(r.alphaT!)).toBeLessThan(3);
  });

  it('downloads once a week and keeps the rows in the price table', async () => {
    const db = openNodeDriver();
    await migrate(db);
    const requests: string[] = [];
    const get = async (url: string) => {
      requests.push(url);
      return zip(url.endsWith('Momentum_Factor_daily_CSV.zip') ? MOM : FIVE);
    };
    const now = new Date('2026-11-09T12:00:00Z');
    expect(await syncFactors(db, get, { now })).toEqual({
      status: 'synced',
      lastDate: '2026-09-30',
    });
    expect(requests).toHaveLength(2);
    const rows = await loadFactors(db, '2026-09-01');
    expect(rows[0].date).toBe('2026-09-01');
    expect(rows.at(-1)!.date).toBe('2026-09-30');
    const direct = joinFactors(unzipCsv(zip(FIVE)), unzipCsv(zip(MOM)), '2026-09-01');
    expect(rows).toEqual(direct);
    // Three days later: nothing fetched.
    const later = new Date(now.getTime() + 3 * 86_400_000);
    expect((await syncFactors(db, get, { now: later })).status).toBe('fresh');
    expect(requests).toHaveLength(2);
    // A failure is recorded and the old rows stay.
    const failing = async () => {
      throw new MarketError('network', 'Bağlantı yok');
    };
    const fail = await syncFactors(db, failing, { now: later, force: true });
    expect(fail).toMatchObject({ status: 'failed', lastDate: '2026-09-30' });
    expect((await loadFactors(db, '2026-09-01')).length).toBe(rows.length);
  });
});

describe('investment plan', () => {
  const plan = {
    ...DEFAULT_PLAN('2026-01-01'),
    targets: { bist: 0.4, us: 0.4, crypto: 0.1, cash: 0.1 },
    band: 0.05,
    maxSingle: 0.2,
  };
  const view = fakeView([
    { id: 'A', value: 30, market: 'bist' },
    { id: 'B', value: 20, market: 'bist' },
    { id: 'C', value: 30, market: 'us' },
    { id: 'D', value: 20, market: 'crypto' },
  ]);

  it('measures drift, the trades back to target and adherence', () => {
    const c = planCheck(view, plan, { today: '2026-11-11' });
    const drift = Object.fromEntries(c.rows.map((r) => [r.key, r.drift]));
    expect(drift.bist).toBeCloseTo(0.1, 12);
    expect(drift.us).toBeCloseTo(-0.1, 12);
    expect(drift.crypto).toBeCloseTo(0.1, 12);
    expect(drift.cash).toBeCloseTo(-0.1, 12);
    expect(c.outside).toHaveLength(4);
    expect(c.adherence).toBeCloseTo(0.8, 12);
    expect(c.rows.map((r) => r.toTarget)).toEqual(
      [-10, 10, -10, 10].map((x) => expect.closeTo(x, 9)),
    );
    expect(c.tradeVolume).toBeCloseTo(20, 9);
    expect(c.oversized.map((o) => o.symbol)).toEqual(['A', 'C']);
    expect(c.nextReview).toBe('2027-01-01');
    expect(c.reviewDue).toBe(false);
    expect(planCheck(view, plan, { today: '2027-01-01' }).reviewDue).toBe(true);
  });

  it('places new money where the plan is short', () => {
    const c = planCheck(view, plan, { today: '2026-11-11', newMoney: 20 });
    const placed = Object.fromEntries(c.rows.map((r) => [r.key, r.fromNewMoney]));
    // After 120: wanted 48 / 48 / 12 / 12 → short 0 / 18 / 0 / 12; 20 split 18 : 12.
    expect(placed.us).toBeCloseTo(12, 9);
    expect(placed.cash).toBeCloseTo(8, 9);
    expect(placed.bist + placed.crypto).toBeCloseTo(0, 9);
    expect(c.driftAfterNewMoney).toBeCloseTo(20 / 120 - 0.1, 9);
    // More money than the shortfall: the rest goes by the targets.
    const big = planCheck(view, plan, { today: '2026-11-11', newMoney: 100 });
    expect(big.rows.reduce((s, r) => s + r.fromNewMoney, 0)).toBeCloseTo(100, 9);
  });
});

describe('goal planning (Monte Carlo in real lira)', () => {
  it('compounds exactly with no volatility', () => {
    const r = simulateGoal({
      start: 1000,
      monthly: 0,
      years: 10,
      target: 1600,
      realReturn: 0.05,
      volatility: 0,
      paths: 50,
    });
    expect(r.median).toBeCloseTo(1000 * 1.05 ** 10, 6);
    expect(r.probability).toBe(1);
    expect(r.fan).toHaveLength(11);
    expect(r.fan[1].p50).toBeCloseTo(1050, 6);
    // Monthly needed for 2000: (2000 − 1000·1,05¹⁰) ÷ Σₖ₌₁¹²⁰ g^k.
    const g = 1.05 ** (1 / 12);
    let annuity = 0;
    for (let k = 1; k <= 120; k++) annuity += g ** k;
    const need = simulateGoal({
      start: 1000,
      monthly: 0,
      years: 10,
      target: 2000,
      realReturn: 0.05,
      volatility: 0,
      paths: 50,
    });
    expect(need.probability).toBe(0);
    expect(need.monthlyFor80!).toBeCloseTo((2000 - 1000 * 1.05 ** 10) / annuity, 6);
    expect(
      simulateGoal({
        start: 1000,
        monthly: need.monthlyFor80! + 0.01,
        years: 10,
        target: 2000,
        realReturn: 0.05,
        volatility: 0,
        paths: 50,
      }).probability,
    ).toBe(1);
  });

  it('keeps the expected return and spreads the outcomes', () => {
    const r = simulateGoal({
      start: 100,
      monthly: 0,
      years: 1,
      target: 100,
      realReturn: 0.05,
      volatility: 0.17,
      paths: 20000,
    });
    // E[end] = start · (1 + μ) for a lognormal with the chosen mean.
    const mean = (r.fan[1].p10 + r.fan[1].p90) / 2; // rough check of the spread below
    expect(r.fan[1].p10).toBeLessThan(r.fan[1].p50);
    expect(r.fan[1].p50).toBeLessThan(r.fan[1].p90);
    expect(mean).toBeGreaterThan(95);
    const again = simulateGoal({
      start: 100,
      monthly: 0,
      years: 1,
      target: 100,
      realReturn: 0.05,
      volatility: 0.17,
      paths: 20000,
    });
    expect(again).toEqual(r); // seeded
    const riskier = simulateGoal({
      start: 100,
      monthly: 10,
      years: 20,
      target: 5000,
      realReturn: 0.05,
      volatility: 0.17,
    });
    const safer = simulateGoal({
      start: 100,
      monthly: 10,
      years: 20,
      target: 5000,
      realReturn: 0.02,
      volatility: 0.06,
    });
    expect(riskier.fan.at(-1)!.p90 - riskier.fan.at(-1)!.p10).toBeGreaterThan(
      safer.fan.at(-1)!.p90 - safer.fan.at(-1)!.p10,
    );
    expect(safer.lossProbability).toBeLessThan(riskier.lossProbability);
  });

  it('matches the lognormal mean over many paths', () => {
    const r = simulateGoal({
      start: 1,
      monthly: 0,
      years: 1,
      target: 0,
      realReturn: 0.05,
      volatility: 0.17,
      paths: 20000,
    });
    // Median of a lognormal: exp(m) = (1 + μ) ÷ √(1 + σ²/(1 + μ)²).
    const median = 1.05 / Math.sqrt(1 + 0.17 ** 2 / 1.05 ** 2);
    expect(r.fan[1].p50).toBeCloseTo(median, 2);
  });
});

describe('science views on the example portfolio', () => {
  it('runs end to end', async () => {
    const { db, view } = await demo();
    const skill = skillReport(buildAnalysis(view));
    expect(skill.enough).toBe(true);
    expect(skill.psr).not.toBeNull();
    const h = await loadAssetHistory(db, view, { from: addDays(view.today, -400) });
    const health = healthReport(view, h);
    expect(health.enough).toBe(true);
    expect(health.assets.reduce((s, a) => s + a.riskShare, 0)).toBeCloseTo(1, 10);
    const usIds = view.holdings.filter((x) => x.market === 'us').map((x) => x.assetId);
    const f = factorReport(view, h, demoFactors(h, usIds));
    expect(f.enough).toBe(true);
    expect(f.loadings.find((l) => l.key === 'Mkt-RF')!.significant).toBe(true);
  });
});

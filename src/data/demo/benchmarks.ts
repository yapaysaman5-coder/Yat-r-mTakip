/**
 * Fictional benchmark prices for the example portfolio's "Ya Olsaydı?" screen. Bitcoin and
 * Dolar/TL use exactly the prices behind the example holdings; the others are generated from
 * the same market moves and tilted so that the example's cash flows end at plausible values.
 */
import { shocks, type DemoMarket } from './market';

/** End value as a multiple of net invested, for the generated (tilted) benchmarks. */
const TARGET_MULTIPLE: Record<string, number> = {
  gold: 1.3203,
  deposit: 1.27,
  cpi: 1.23,
  ndx: 1.1792,
  spx: 1.1593,
  xu030: 1.1206,
  xu100: 1.1099,
  silver: 1.1001,
  eur: 1.095,
  rut: 1.0847,
};

const logReturns = (p: number[]) => p.map((x, i) => (i === 0 ? 0 : Math.log(x / p[i - 1])));
const fromLogReturns = (r: number[]) => {
  const out = [1];
  for (let i = 1; i < r.length; i++) out.push(out[i - 1] * Math.exp(r[i]));
  return out;
};

/** Multiplies the path by a smooth exponential trend: ×e^logF at the last day. */
function tilt(path: number[], logF: number): number[] {
  const step = Math.exp(logF / (path.length - 1));
  let factor = 1;
  return path.map((p) => {
    const out = p * factor;
    factor *= step;
    return out;
  });
}

/** End value of the cash flows replayed on a tilted path (only flow days are visited). */
function tiltedEndValue(path: number[], flows: [number, number][], logF: number): number {
  const n = path.length - 1;
  let units = 0;
  for (const [index, amount] of flows) {
    const price = path[index] * Math.exp((logF * index) / n);
    if (price > 0) units = Math.max(0, units + amount / price);
  }
  return units * path[n] * Math.exp(logF);
}

function calibrate(path: number[], flows: [number, number][], target: number): number[] {
  let lo = -4;
  let hi = 4;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (tiltedEndValue(path, flows, mid) < target) lo = mid;
    else hi = mid;
  }
  return tilt(path, (lo + hi) / 2);
}

/**
 * Benchmark closes in TRY per benchmark key. `flows` are the example's net deposits per day
 * index (several on one day summed).
 */
export function demoBenchmarks(
  market: DemoMarket,
  flows: Map<number, number>,
): Record<string, number[]> {
  const n = market.dates.length;
  const steps = [...flows.entries()].sort((a, b) => a[0] - b[0]);
  const netInvested = steps.reduce((s, [, a]) => s + a, 0);

  const r = Object.fromEntries(Object.entries(market.closes).map(([k, v]) => [k, logReturns(v)]));
  const rUsd = logReturns(market.usdtry);
  const mix = (...parts: [number, number[]][]) =>
    Array.from({ length: n }, (_, i) => parts.reduce((s, [w, x]) => s + w * x[i], 0));
  const noise = (seed: number, vol: number) => shocks(seed, n).map((z) => z * vol);
  const rBist = mix([1 / 3, r.THYAO], [1 / 3, r.ASELS], [1 / 3, r.TUPRS]);
  const rUs = mix([0.5, r.AAPL], [0.5, r.NVDA]);
  const flat = Array.from({ length: n }, () => 1);

  const base: Record<string, number[]> = {
    xu100: fromLogReturns(mix([0.85, rBist], [1, noise(103, 0.006)])),
    xu030: fromLogReturns(mix([0.95, rBist], [1, noise(104, 0.006)])),
    spx: fromLogReturns(mix([0.55, rUs], [1, noise(105, 0.006)], [1, rUsd])),
    ndx: fromLogReturns(mix([0.8, rUs], [1, noise(106, 0.007)], [1, rUsd])),
    rut: fromLogReturns(mix([0.4, rUs], [1, noise(107, 0.011)], [1, rUsd])),
    gold: fromLogReturns(mix([1, noise(109, 0.009)], [1, rUsd])),
    silver: fromLogReturns(mix([1, noise(110, 0.016)], [1, rUsd])),
    eur: fromLogReturns(mix([1, noise(102, 0.004)], [1.05, rUsd])),
    cpi: flat,
    deposit: flat,
  };
  // Index-like levels: start at 100 (or the rate for currencies) for readable prices.
  const level: Record<string, number> = { eur: 38.2 };
  return {
    btc: market.closes.BTC.map((p, i) => p * market.usdtry[i]),
    usd: market.usdtry,
    ...Object.fromEntries(
      Object.entries(base).map(([k, path]) => {
        const calibrated = calibrate(path, steps, netInvested * TARGET_MULTIPLE[k]);
        const scale = (level[k] ?? 100) / calibrated[0];
        return [k, calibrated.map((p) => p * scale)];
      }),
    ),
  };
}

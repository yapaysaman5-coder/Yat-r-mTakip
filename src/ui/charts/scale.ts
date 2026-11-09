/** Chart helpers: tidy axis ticks, downsampling and percentage rebasing. */

/** "Nice" round tick values covering [min, max] (≈ `count` intervals). */
export function niceTicks(min: number, max: number, count = 4): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [];
  if (min === max) {
    const pad = Math.abs(min) * 0.05 || 1;
    min -= pad;
    max += pad;
  }
  const rawStep = (max - min) / Math.max(1, count);
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const residual = rawStep / magnitude;
  const niceResidual =
    residual > 5 ? 10 : residual > 2.5 ? 5 : residual > 2 ? 2.5 : residual > 1 ? 2 : 1;
  const step = niceResidual * magnitude;
  const start = Math.floor(min / step) * step;
  const end = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= end + step / 2; v += step) ticks.push(Number(v.toPrecision(12)));
  return ticks;
}

/**
 * Value axis for a chart: a tight domain around the data (small padding, so lines use the
 * full height) with round tick values that fall inside it.
 */
export function valueAxis(min: number, max: number, tickCount = 5) {
  const span = max - min || Math.abs(max) * 0.1 || 1;
  const domainMin = min - span * 0.06;
  const domainMax = max + span * 0.06;
  const ticks = niceTicks(domainMin, domainMax, tickCount).filter(
    (t) => t >= domainMin && t <= domainMax,
  );
  return { domainMin, domainMax, ticks };
}

/**
 * Indices to keep when drawing `length` points with at most `max` points:
 * an even stride that always keeps the first and the last point.
 */
export function downsampleIndices(length: number, max: number): number[] {
  if (length <= max) return Array.from({ length }, (_, i) => i);
  const out: number[] = [];
  const step = (length - 1) / (max - 1);
  for (let k = 0; k < max; k++) out.push(Math.round(k * step));
  return [...new Set(out)];
}

/**
 * Cumulative return of a cash-flow-driven value series inside a window, so lines that
 * received the same deposits can be compared in %:
 *   r(t) = V(t) / (V(start) + netFlows(start → t)) − 1
 * At the very start of the history this is simply V / netInvested − 1.
 */
export function rebasePercent(values: number[], netInvested: number[], start = 0): number[] {
  const v0 = values[start];
  const n0 = netInvested[start];
  return values.slice(start).map((v, k) => {
    const base = v0 + (netInvested[start + k] - n0);
    return base > 0 ? v / base - 1 : 0;
  });
}

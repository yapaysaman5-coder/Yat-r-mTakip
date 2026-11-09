/**
 * Helpers for charts whose shape animates between ranges. Every series is resampled to the
 * same number of points, so two shapes can be blended point by point on the UI thread.
 */

export const MORPH_POINTS = 96;

/** Linear resampling of `values` to `n` evenly spaced points. */
export function resample(values: readonly number[], n = MORPH_POINTS): number[] {
  if (values.length === 0) return Array.from({ length: n }, () => 0);
  if (values.length === 1) return Array.from({ length: n }, () => values[0]);
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const t = (i / (n - 1)) * (values.length - 1);
    const a = Math.floor(t);
    const b = Math.min(values.length - 1, a + 1);
    out.push(values[a] + (values[b] - values[a]) * (t - a));
  }
  return out;
}

/** y pixel positions for values within [min, max] (top padding included). */
export function toYs(
  values: readonly number[],
  height: number,
  padTop: number,
  padBottom: number,
  min: number,
  max: number,
): number[] {
  const span = max - min || 1;
  const usable = Math.max(1, height - padTop - padBottom);
  return values.map((v) => padTop + (1 - (v - min) / span) * usable);
}

/** Smooth path through (x_i, y_i) with evenly spaced x (monotone cubic, runs as a worklet). */
export function smoothPath(ys: readonly number[], width: number): string {
  'worklet';
  const n = ys.length;
  if (n === 0 || !(width > 0)) return '';
  const dx = n > 1 ? width / (n - 1) : 0;
  if (n === 1) return `M0,${ys[0]}`;
  const slopes: number[] = [];
  for (let i = 0; i < n - 1; i++) slopes.push((ys[i + 1] - ys[i]) / dx);
  const tangents: number[] = [slopes[0]];
  for (let i = 1; i < n - 1; i++) {
    const a = slopes[i - 1];
    const b = slopes[i];
    tangents.push(a * b <= 0 ? 0 : (2 * a * b) / (a + b)); // harmonic mean: no overshoot
  }
  tangents.push(slopes[n - 2]);
  let d = `M0,${ys[0]}`;
  for (let i = 0; i < n - 1; i++) {
    const x0 = i * dx;
    const x1 = (i + 1) * dx;
    const c = dx / 3;
    d += `C${x0 + c},${ys[i] + tangents[i] * c} ${x1 - c},${ys[i + 1] - tangents[i + 1] * c} ${x1},${ys[i + 1]}`;
  }
  return d;
}

/** Blend two shapes (same length) at `t` (0 → a, 1 → b). */
export function blend(a: readonly number[], b: readonly number[], t: number): number[] {
  'worklet';
  const out: number[] = [];
  for (let i = 0; i < b.length; i++) out.push((a[i] ?? b[i]) + (b[i] - (a[i] ?? b[i])) * t);
  return out;
}

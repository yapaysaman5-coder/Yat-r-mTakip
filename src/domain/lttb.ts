/**
 * Largest-Triangle-Three-Buckets downsampling (doc §7): reduces a long series to `threshold`
 * points while keeping its visual shape (peaks and dips survive). Returns the kept indices.
 */
export function lttbIndices(values: readonly number[], threshold: number): number[] {
  const n = values.length;
  if (threshold >= n || threshold < 3) return Array.from({ length: n }, (_, i) => i);

  const out = [0];
  const bucketSize = (n - 2) / (threshold - 2);
  let a = 0;
  for (let b = 0; b < threshold - 2; b++) {
    // Average of the next bucket (the third point of the triangle).
    const nextStart = Math.floor((b + 1) * bucketSize) + 1;
    const nextEnd = Math.min(Math.floor((b + 2) * bucketSize) + 1, n);
    let avgX = 0;
    let avgY = 0;
    for (let i = nextStart; i < nextEnd; i++) {
      avgX += i;
      avgY += values[i];
    }
    const count = Math.max(1, nextEnd - nextStart);
    avgX /= count;
    avgY /= count;

    // Point in this bucket that forms the largest triangle with the previous pick and the average.
    const start = Math.floor(b * bucketSize) + 1;
    const end = Math.floor((b + 1) * bucketSize) + 1;
    let best = start;
    let bestArea = -1;
    for (let i = start; i < end; i++) {
      const area = Math.abs((a - avgX) * (values[i] - values[a]) - (a - i) * (avgY - values[a]));
      if (area > bestArea) {
        bestArea = area;
        best = i;
      }
    }
    out.push(best);
    a = best;
  }
  out.push(n - 1);
  return out;
}

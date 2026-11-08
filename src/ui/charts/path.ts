export interface Point {
  x: number;
  y: number;
}

export interface ScaleOptions {
  width: number;
  height: number;
  padTop?: number;
  padBottom?: number;
  /** Force the y-domain (e.g. to include a baseline series). */
  min?: number;
  max?: number;
}

/** Maps values to evenly spaced points; larger values are higher on screen. */
export function scalePoints(values: number[], opts: ScaleOptions): Point[] {
  const { width, height, padTop = 8, padBottom = 8 } = opts;
  if (values.length === 0) return [];
  const min = opts.min ?? Math.min(...values);
  const max = opts.max ?? Math.max(...values);
  const span = max - min || 1;
  const usable = Math.max(1, height - padTop - padBottom);
  const step = values.length > 1 ? width / (values.length - 1) : 0;
  return values.map((v, i) => ({
    x: values.length > 1 ? i * step : width / 2,
    y: padTop + (1 - (v - min) / span) * usable,
  }));
}

function sign(n: number) {
  return n < 0 ? -1 : 1;
}

/**
 * Smooth path through the points using monotone cubic interpolation (same idea as d3's
 * curveMonotoneX): soft curves that never overshoot the data, so peaks and dips stay honest.
 */
export function monotonePath(points: Point[]): string {
  const n = points.length;
  if (n === 0) return '';
  if (n === 1) return `M${points[0].x},${points[0].y}`;
  if (n === 2) return `M${points[0].x},${points[0].y}L${points[1].x},${points[1].y}`;

  const tangents = new Array<number>(n).fill(0);
  for (let i = 1; i < n - 1; i++) {
    const h0 = points[i].x - points[i - 1].x;
    const h1 = points[i + 1].x - points[i].x;
    const s0 = (points[i].y - points[i - 1].y) / (h0 || 1);
    const s1 = (points[i + 1].y - points[i].y) / (h1 || 1);
    const p = (s0 * h1 + s1 * h0) / (h0 + h1 || 1);
    tangents[i] =
      (sign(s0) + sign(s1)) * Math.min(Math.abs(s0), Math.abs(s1), 0.5 * Math.abs(p)) || 0;
  }
  const endTangent = (a: Point, b: Point, t: number) => {
    const h = b.x - a.x;
    return h ? ((3 * (b.y - a.y)) / h - t) / 2 : t;
  };
  tangents[0] = endTangent(points[0], points[1], tangents[1]);
  tangents[n - 1] = endTangent(points[n - 2], points[n - 1], tangents[n - 2]);

  let d = `M${points[0].x},${points[0].y}`;
  for (let i = 0; i < n - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const dx = (b.x - a.x) / 3;
    d += `C${a.x + dx},${a.y + dx * tangents[i]},${b.x - dx},${b.y - dx * tangents[i + 1]},${b.x},${b.y}`;
  }
  return d;
}

/** Closes a line path down to the bottom edge to make a fillable area. */
export function areaPath(points: Point[], line: string, bottom: number): string {
  if (points.length === 0) return '';
  const first = points[0];
  const last = points[points.length - 1];
  return `${line}L${last.x},${bottom}L${first.x},${bottom}Z`;
}

/** Straight step path (used for the dashed "net invested" line, which changes in steps). */
export function stepPath(points: Point[]): string {
  if (points.length === 0) return '';
  let d = `M${points[0].x},${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    d += `H${points[i].x}V${points[i].y}`;
  }
  return d;
}

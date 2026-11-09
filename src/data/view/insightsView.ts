import bistCatalog from '../market/catalog/bist.json';
import { US_SECTOR } from '../market/catalog/us';
import type { HoldingMarket, PortfolioView } from './portfolioView';

/**
 * Analiz › Performans extras and Analiz › Dağılım (docs/01-PROJE-DOKUMANI.md §6.7): the
 * drawdown curve, what each asset earned, concentration and the split of the account by
 * market, currency and sector.
 */

// ── Düşüş grafiği ────────────────────────────────────────────────────────────

/** How far below its previous peak the (time-weighted) value is each day: 0 or negative. */
export function drawdownSeries(unitValues: readonly number[]): number[] {
  let peak = -Infinity;
  return unitValues.map((u) => {
    peak = Math.max(peak, u);
    return peak > 0 ? u / peak - 1 : 0;
  });
}

// ── En çok kazandıran / kaybettiren ─────────────────────────────────────────

export interface AssetResult {
  assetId: string;
  symbol: string;
  market: HoldingMarket;
  /** Unrealized + realized + net dividends, TRY. */
  total: number;
  unrealized: number;
  realized: number;
  dividends: number;
  /** Still held. */
  open: boolean;
}

/** Every asset ever held, by what it earned in total (best first). */
export function assetResults(view: PortfolioView): AssetResult[] {
  const out = new Map<string, AssetResult>();
  for (const h of view.holdings) {
    out.set(h.assetId, {
      assetId: h.assetId,
      symbol: h.symbol,
      market: h.market,
      unrealized: h.unrealizedTRY,
      realized: h.realizedTRY,
      dividends: h.dividendsTRY,
      total: h.unrealizedTRY + h.realizedTRY + h.dividendsTRY,
      open: true,
    });
  }
  // Closed positions: what their sales and dividends brought.
  for (const r of view.history) {
    if (!r.assetId || out.get(r.assetId)?.open) continue;
    if (r.type !== 'SELL' && r.type !== 'DIVIDEND') continue;
    const a = out.get(r.assetId) ?? {
      assetId: r.assetId,
      symbol: r.symbol ?? r.assetId,
      market: r.market ?? 'us',
      unrealized: 0,
      realized: 0,
      dividends: 0,
      total: 0,
      open: false,
    };
    if (r.type === 'SELL') a.realized += r.realized?.pnlTRY ?? 0;
    else a.dividends += r.amountTRY;
    a.total = a.realized + a.dividends;
    out.set(r.assetId, a);
  }
  return [...out.values()].sort((a, b) => b.total - a.total);
}

// ── Yoğunlaşma ───────────────────────────────────────────────────────────────

export interface Concentration {
  /** Largest position's share of the account. */
  largest: { symbol: string; weight: number } | null;
  top3: number;
  top5: number;
  /** Herfindahl index of the positions (1 = a single position). */
  hhi: number;
  /** Why the account looks concentrated, if it does. */
  warning: string | null;
}

/** Thresholds: one position over %25 of the account, or three over %60. */
export const CONCENTRATION_LIMITS = { single: 0.25, top3: 0.6 };

export function concentration(view: PortfolioView): Concentration {
  const total = view.summary.totalValue;
  const weights = view.holdings
    .map((h) => ({ symbol: h.symbol, weight: total > 0 ? h.valueTRY / total : 0 }))
    .sort((a, b) => b.weight - a.weight);
  const sum = (k: number) => weights.slice(0, k).reduce((s, w) => s + w.weight, 0);
  const positions = weights.reduce((s, w) => s + w.weight, 0);
  const hhi = positions > 0 ? weights.reduce((s, w) => s + (w.weight / positions) ** 2, 0) : 0;
  const largest = weights[0] ?? null;
  let warning: string | null = null;
  if (largest && largest.weight > CONCENTRATION_LIMITS.single) {
    warning = `${largest.symbol} hesabının %${Math.round(largest.weight * 100)}'i: tek bir varlıktaki düşüş hesabı çok etkiler.`;
  } else if (sum(3) > CONCENTRATION_LIMITS.top3) {
    warning = `En büyük 3 pozisyon hesabın %${Math.round(sum(3) * 100)}'i: dağılım az.`;
  }
  return { largest, top3: sum(3), top5: sum(5), hhi, warning };
}

// ── Dağılım ──────────────────────────────────────────────────────────────────

export interface Slice {
  key: string;
  label: string;
  value: number;
}

const BIST_SECTOR = new Map(
  (bistCatalog as [string, string, string, number][]).map((r) => [r[0], r[2]]),
);

export function sectorOf(symbol: string, market: HoldingMarket): string {
  if (market === 'crypto') return 'Kripto';
  if (market === 'bist') return BIST_SECTOR.get(symbol) ?? 'Diğer (BIST)';
  return US_SECTOR[symbol] ?? 'Diğer (ABD)';
}

export interface Distribution {
  byMarket: Slice[];
  /** What the value moves with: TL (BIST, cash) or the dollar (US stocks, crypto). */
  byCurrency: Slice[];
  bySector: Slice[];
  /** Positions for the heat map: size = value, change = today's and total change. */
  tiles: {
    assetId: string;
    symbol: string;
    market: HoldingMarket;
    value: number;
    daily: number;
    total: number;
  }[];
}

const bySize = (a: Slice, b: Slice) => b.value - a.value;

export function distribution(view: PortfolioView): Distribution {
  const { summary } = view;
  const group = (key: (h: (typeof view.holdings)[number]) => string) => {
    const m = new Map<string, number>();
    for (const h of view.holdings) m.set(key(h), (m.get(key(h)) ?? 0) + h.valueTRY);
    return m;
  };
  const markets = group((h) => h.market);
  const byMarket: Slice[] = [
    { key: 'bist', label: 'BIST', value: markets.get('bist') ?? 0 },
    { key: 'us', label: 'ABD', value: markets.get('us') ?? 0 },
    { key: 'crypto', label: 'Kripto', value: markets.get('crypto') ?? 0 },
    { key: 'cash', label: 'Nakit', value: summary.cash },
  ].filter((s) => s.value > 0);
  const usd = view.holdings.filter((h) => h.currency === 'USD').reduce((s, h) => s + h.valueTRY, 0);
  const byCurrency: Slice[] = [
    { key: 'TRY', label: 'Türk lirası', value: summary.totalValue - usd },
    { key: 'USD', label: 'ABD doları', value: usd },
  ].filter((s) => s.value > 0);
  const sectors = group((h) => sectorOf(h.symbol, h.market));
  const bySector: Slice[] = [...sectors.entries()]
    .map(([label, value]) => ({ key: label, label, value }))
    .sort(bySize);
  if (summary.cash > 0) bySector.push({ key: 'cash', label: 'Nakit', value: summary.cash });
  return {
    byMarket: byMarket.sort(bySize),
    byCurrency,
    bySector,
    tiles: view.holdings
      .map((h) => ({
        assetId: h.assetId,
        symbol: h.symbol,
        market: h.market,
        value: h.valueTRY,
        daily: h.prevClose > 0 ? h.price / h.prevClose - 1 : 0,
        total: h.costTRY > 0 ? h.valueTRY / h.costTRY - 1 : 0,
      }))
      .sort((a, b) => b.value - a.value),
  };
}

// ── Isı haritası yerleşimi ───────────────────────────────────────────────────

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Squarified treemap (Bruls, Huizing, van Wijk): rectangles whose areas match the values,
 * as close to squares as possible, in the order given (largest first works best).
 */
export function squarify(values: readonly number[], width: number, height: number): Rect[] {
  const total = values.reduce((s, v) => s + Math.max(0, v), 0);
  const out: Rect[] = values.map(() => ({ x: 0, y: 0, w: 0, h: 0 }));
  if (total <= 0 || width <= 0 || height <= 0) return out;
  const scale = (width * height) / total;
  const areas = values.map((v) => Math.max(0, v) * scale);
  let x = 0;
  let y = 0;
  let w = width;
  let h = height;
  let i = 0;
  const worst = (row: number[], side: number) => {
    const s = row.reduce((a, b) => a + b, 0);
    const max = Math.max(...row);
    const min = Math.min(...row);
    return Math.max((side * side * max) / (s * s), (s * s) / (side * side * min));
  };
  while (i < areas.length) {
    const side = Math.min(w, h);
    const row: number[] = [areas[i]];
    let j = i + 1;
    while (j < areas.length && worst([...row, areas[j]], side) <= worst(row, side)) {
      row.push(areas[j]);
      j++;
    }
    const sum = row.reduce((a, b) => a + b, 0);
    if (w >= h) {
      // A column on the left.
      const colW = sum / h;
      let yy = y;
      for (let k = 0; k < row.length; k++) {
        const rh = row[k] / colW;
        out[i + k] = { x, y: yy, w: colW, h: rh };
        yy += rh;
      }
      x += colW;
      w -= colW;
    } else {
      // A row on top.
      const rowH = sum / w;
      let xx = x;
      for (let k = 0; k < row.length; k++) {
        const rw = row[k] / rowH;
        out[i + k] = { x: xx, y, w: rw, h: rowH };
        xx += rw;
      }
      y += rowH;
      h -= rowH;
    }
    i = j;
  }
  return out;
}

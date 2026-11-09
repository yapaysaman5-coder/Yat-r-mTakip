import { trDayStart } from '@/domain';
import { rebasePercent } from '@/ui/charts/scale';
import { formatDate, formatTime } from '@/utils/format';

import { bridge } from '../demo/market';
import { rangeStartIndex, type ChartRange, type PortfolioView } from './portfolioView';

export type HomeRange = '1G' | ChartRange;

export interface HomeChart {
  values: number[];
  /** What each point is (date or time), for reading the chart with a finger. */
  labels: string[];
  /** Net invested on each point (daily ranges); empty for "1G". */
  netInvested: number[];
  /** Net invested (dashed line) for the longer ranges. */
  baseline?: number[];
  /** Change over the range with deposits and withdrawals taken out; null without data. */
  changeRatio: number | null;
}

/**
 * The home screen's balance chart. Daily ranges come from the cached daily values. "1G"
 * runs from the start-of-day value to now (intraday prices per asset are not stored); the
 * example portfolio shows an illustrative intraday path.
 */
export function homeChart(view: PortfolioView, range: HomeRange, now = Date.now()): HomeChart {
  const { values, netInvested, dates } = view.series;
  const { totalValue, dailyChange, dailyChangeRatio } = view.summary;
  if (range === '1G') {
    const start = totalValue - dailyChange;
    const pts =
      !view.isDemo || start <= 0 || totalValue <= 0
        ? [start, totalValue]
        : bridge(Number(view.today.replaceAll('-', '')) % 100_000, start, totalValue, 0.0016, 60);
    const t0 = trDayStart(view.today);
    const labels = pts.map(
      (_, i) => `Bugün ${formatTime(t0 + ((now - t0) * i) / Math.max(1, pts.length - 1))}`,
    );
    return { values: pts, labels, netInvested: [], changeRatio: dailyChangeRatio };
  }
  if (values.length === 0) return { values: [], labels: [], netInvested: [], changeRatio: null };
  const start = rangeStartIndex(dates, range);
  const ratios = rebasePercent(values, netInvested, start);
  const showBaseline = range !== '1H' && range !== '1A';
  return {
    values: values.slice(start),
    labels: dates.slice(start).map((d) => formatDate(`${d}T12:00:00Z`)),
    netInvested: netInvested.slice(start),
    baseline: showBaseline ? netInvested.slice(start) : undefined,
    changeRatio: values[start] > 0 ? ratios[ratios.length - 1] : null,
  };
}

/**
 * Change between two points of a chart with deposits and withdrawals taken out:
 * (value_b − money added in between) ÷ value_a − 1.
 */
export function changeBetween(
  chart: HomeChart,
  a: number,
  b: number,
): { ratio: number | null; amount: number } {
  const va = chart.values[a];
  const vb = chart.values[b];
  const added = chart.netInvested.length ? chart.netInvested[b] - chart.netInvested[a] : 0;
  const amount = vb - va - added;
  return { ratio: va > 0 ? amount / va : null, amount };
}

/** "Özel" range: the days from `from` to `to` (inclusive), net invested shown as a line. */
export function customChart(view: PortfolioView, from: string, to: string): HomeChart {
  const { values, netInvested, dates } = view.series;
  const a = dates.findIndex((d) => d >= from);
  let b = -1;
  for (let i = dates.length - 1; i >= 0; i--) {
    if (dates[i] <= to) {
      b = i;
      break;
    }
  }
  if (a === -1 || b === -1 || b <= a) {
    return { values: [], labels: [], netInvested: [], changeRatio: null };
  }
  const chart: HomeChart = {
    values: values.slice(a, b + 1),
    labels: dates.slice(a, b + 1).map((d) => formatDate(`${d}T12:00:00Z`)),
    netInvested: netInvested.slice(a, b + 1),
    baseline: netInvested.slice(a, b + 1),
    changeRatio: null,
  };
  chart.changeRatio = changeBetween(chart, 0, chart.values.length - 1).ratio;
  return chart;
}

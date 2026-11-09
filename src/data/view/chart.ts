import { rebasePercent } from '@/ui/charts/scale';

import { bridge } from '../demo/market';
import { rangeStartIndex, type ChartRange, type PortfolioView } from './portfolioView';

export type HomeRange = '1G' | ChartRange;

export interface HomeChart {
  values: number[];
  /** Net invested (dashed line) for the longer ranges. */
  baseline?: number[];
  /** Change over the range with deposits and withdrawals taken out; null without data. */
  changeRatio: number | null;
}

/**
 * The home screen's balance chart. Daily ranges come from the cached daily values. "1G"
 * (intraday) needs intraday prices (Phase 4): until then it runs from the start-of-day value
 * to now; the example portfolio shows an illustrative intraday path.
 */
export function homeChart(view: PortfolioView, range: HomeRange): HomeChart {
  const { values, netInvested, dates } = view.series;
  const { totalValue, dailyChange, dailyChangeRatio } = view.summary;
  if (range === '1G') {
    const start = totalValue - dailyChange;
    if (!view.isDemo || start <= 0 || totalValue <= 0) {
      return { values: [start, totalValue], changeRatio: dailyChangeRatio };
    }
    const seed = Number(view.today.replaceAll('-', '')) % 100_000;
    return {
      values: bridge(seed, start, totalValue, 0.0016, 60),
      changeRatio: dailyChangeRatio,
    };
  }
  if (values.length === 0) return { values: [], changeRatio: null };
  const start = rangeStartIndex(dates, range);
  const ratios = rebasePercent(values, netInvested, start);
  const showBaseline = range !== '1H' && range !== '1A';
  return {
    values: values.slice(start),
    baseline: showBaseline ? netInvested.slice(start) : undefined,
    changeRatio: values[start] > 0 ? ratios[ratios.length - 1] : null,
  };
}

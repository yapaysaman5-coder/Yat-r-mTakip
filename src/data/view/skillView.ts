import { kurtosis, mean, normCdf, normInv, ols, skewness, stepReturns, variance } from '@/domain';

import { MIN_RISK_DAYS, type AnalysisView } from './analysisView';

/**
 * Beceri mi, şans mı? (docs/02-HESAPLAMA-MOTORU.md §16.3)
 * - Alpha against BIST 100 with its t statistic (CAPM regression on daily excess returns).
 * - Probabilistic Sharpe Ratio and Minimum Track Record Length (Bailey & López de Prado 2012):
 *   how sure one can be that the true Sharpe ratio is above zero, and how long a record would
 *   be needed to say so with 95 % confidence, allowing for skewed and fat-tailed returns.
 */
export interface SkillReport {
  /** Daily returns used. */
  n: number;
  enough: boolean;
  yearsSoFar: number;
  sharpeAnnual: number | null;
  /** Probability that the true Sharpe ratio is above 0. */
  psr: number | null;
  /** Years of record needed for 95 % confidence (null when the Sharpe ratio is not above 0). */
  minTrackYears: number | null;
  alphaAnnual: number | null;
  alphaT: number | null;
  /** Probability that the true alpha is above 0 (normal approximation). */
  alphaProbability: number | null;
  /** Years needed for the alpha to reach t = 1,96 at the same size and noise. */
  alphaYearsNeeded: number | null;
  verdict: 'veri-az' | 'anlamli' | 'belirsiz' | 'olumsuz';
}

const Z95 = normInv(0.95);

export function skillReport(analysis: AnalysisView): SkillReport {
  const me = analysis.series[0];
  const r = me ? stepReturns(me.prices) : [];
  const n = r.length;
  const yearsSoFar = n / 365;
  const empty: SkillReport = {
    n,
    enough: false,
    yearsSoFar,
    sharpeAnnual: null,
    psr: null,
    minTrackYears: null,
    alphaAnnual: null,
    alphaT: null,
    alphaProbability: null,
    alphaYearsNeeded: null,
    verdict: 'veri-az',
  };
  if (n < MIN_RISK_DAYS) return empty;

  const rfDaily = (1 + analysis.riskFree) ** (1 / 365) - 1;
  const ex = r.map((x) => x - rfDaily);
  const sd = Math.sqrt(variance(ex));
  const sr = sd > 0 ? mean(ex) / sd : 0;
  const g3 = skewness(ex);
  const g4 = kurtosis(ex);
  const spread = Math.max(1e-12, 1 - g3 * sr + ((g4 - 1) / 4) * sr * sr);
  const psr = normCdf((sr * Math.sqrt(n - 1)) / Math.sqrt(spread));
  const minTrl = sr > 0 ? 1 + spread * (Z95 / sr) ** 2 : null;

  let alphaAnnual: number | null = null;
  let alphaT: number | null = null;
  let alphaProbability: number | null = null;
  let alphaYearsNeeded: number | null = null;
  const main = analysis.mainBenchmark;
  if (main) {
    const rb = stepReturns(main.prices).map((x) => x - rfDaily);
    const fit = ols(ex, [rb]);
    if (fit) {
      const a = fit.coef[0];
      alphaAnnual = a * 365;
      alphaT = fit.t[0];
      alphaProbability = normCdf(fit.t[0]);
      // t grows with √n: n needed = (1,96 · SE·√n / α)².
      const seOne = fit.se[0] * Math.sqrt(n);
      alphaYearsNeeded = a > 0 ? ((1.96 * seOne) / a) ** 2 / 365 : null;
    }
  }

  const verdict: SkillReport['verdict'] =
    psr >= 0.95 && (alphaT === null || alphaT >= 1.96)
      ? 'anlamli'
      : psr <= 0.5 && (alphaT === null || alphaT <= 0)
        ? 'olumsuz'
        : 'belirsiz';
  return {
    n,
    enough: true,
    yearsSoFar,
    sharpeAnnual: sr * Math.sqrt(365),
    psr,
    minTrackYears: minTrl !== null ? minTrl / 365 : null,
    alphaAnnual,
    alphaT,
    alphaProbability,
    alphaYearsNeeded,
    verdict,
  };
}

import { addDays } from '@/domain';

import type { PortfolioView } from './portfolioView';

/**
 * Yatırım planı ve yeniden dengeleme (docs/02-HESAPLAMA-MOTORU.md §16.5).
 * The person writes down a target mix once (an "investment policy statement"); the app
 * measures how far the portfolio has drifted, what it would take to return to the plan, and
 * how much of that new money alone could do. Rules from Vanguard's rebalancing research:
 * check once or twice a year and act only when a class is a few points outside its band.
 */
export const PLAN_CLASSES = ['bist', 'us', 'crypto', 'cash'] as const;
export type PlanClass = (typeof PLAN_CLASSES)[number];

export const PLAN_CLASS_NAME: Record<PlanClass, string> = {
  bist: 'BIST',
  us: 'ABD',
  crypto: 'Kripto',
  cash: 'Nakit',
};

export type RiskProfile = 'temkinli' | 'dengeli' | 'buyume';

export interface InvestmentPlan {
  /** Target weights per class (they add up to 1). */
  targets: Record<PlanClass, number>;
  /** Allowed drift either side of a target, in percentage points (0,05 = 5 points). */
  band: number;
  /** Largest weight one position should have (0,2 = %20). */
  maxSingle: number;
  risk: RiskProfile;
  horizonYears: number;
  /** Review every 6 or 12 months. */
  reviewMonths: 6 | 12;
  /** ISO day of the last review (or of the plan). */
  reviewedOn: string;
  /** Own notes: why this plan, what would make it change. */
  note?: string;
}

/** Long-run real return and volatility assumptions per profile (editable in Hedefler). */
export const RISK_PROFILES: Record<
  RiskProfile,
  { name: string; realReturn: number; volatility: number; text: string }
> = {
  temkinli: {
    name: 'Temkinli',
    realReturn: 0.02,
    volatility: 0.06,
    text: 'Ağırlık mevduat, tahvil ve altında; dalgalanma az, getiri beklentisi düşük.',
  },
  dengeli: {
    name: 'Dengeli',
    realReturn: 0.04,
    volatility: 0.11,
    text: 'Hisse ve güvenli varlıklar yarı yarıya; orta dalgalanma.',
  },
  buyume: {
    name: 'Büyüme',
    realReturn: 0.05,
    volatility: 0.17,
    text: 'Ağırlık hisselerde; uzun vadede daha yüksek getiri beklentisi, sert düşüşler olağan.',
  },
};

export const DEFAULT_PLAN = (today: string): InvestmentPlan => ({
  targets: { bist: 0.4, us: 0.3, crypto: 0.05, cash: 0.25 },
  band: 0.05,
  maxSingle: 0.2,
  risk: 'dengeli',
  horizonYears: 10,
  reviewMonths: 12,
  reviewedOn: today,
});

export interface PlanClassRow {
  key: PlanClass;
  value: number;
  weight: number;
  target: number;
  /** weight − target (percentage points as a ratio). */
  drift: number;
  outside: boolean;
  /** TL to buy (+) or sell (−) to reach the target with no new money. */
  toTarget: number;
  /** TL of the new money that goes here (only buys). */
  fromNewMoney: number;
}

export interface PlanCheck {
  total: number;
  rows: PlanClassRow[];
  /** 1 − Σ|drift| ÷ 2: share of the portfolio already where the plan wants it. */
  adherence: number;
  outside: PlanClassRow[];
  /** Positions above the single-position limit. */
  oversized: { assetId: string; symbol: string; weight: number }[];
  /** Turnover needed to rebalance: Σ max(0, toTarget). */
  tradeVolume: number;
  newMoney: number;
  /** Largest |drift| left after placing the new money only. */
  driftAfterNewMoney: number;
  nextReview: string;
  reviewDue: boolean;
}

export function planCheck(
  view: PortfolioView,
  plan: InvestmentPlan,
  { newMoney = 0, today }: { newMoney?: number; today: string },
): PlanCheck {
  const value: Record<PlanClass, number> = {
    bist: view.summary.allocation.bist,
    us: view.summary.allocation.us,
    crypto: view.summary.allocation.crypto,
    cash: Math.max(0, view.summary.cash),
  };
  const total = PLAN_CLASSES.reduce((s, k) => s + value[k], 0);
  const sumT = PLAN_CLASSES.reduce((s, k) => s + plan.targets[k], 0) || 1;
  const target = (k: PlanClass) => plan.targets[k] / sumT;

  // New money goes to the classes furthest below target first (cash-flow rebalancing).
  const after = total + Math.max(0, newMoney);
  const deficit = PLAN_CLASSES.map((k) => Math.max(0, target(k) * after - value[k]));
  const sumDef = deficit.reduce((a, b) => a + b, 0);
  const money = Math.max(0, newMoney);
  const placed = PLAN_CLASSES.map((k, i) =>
    sumDef > 0 ? (money * deficit[i]) / Math.max(sumDef, money) : money * target(k),
  );
  // Whatever the deficits cannot take goes in by the targets.
  const rest = money - placed.reduce((a, b) => a + b, 0);
  PLAN_CLASSES.forEach((k, i) => (placed[i] += rest > 1e-9 ? rest * target(k) : 0));

  const rows: PlanClassRow[] = PLAN_CLASSES.map((k, i) => {
    const weight = total > 0 ? value[k] / total : 0;
    const drift = weight - target(k);
    return {
      key: k,
      value: value[k],
      weight,
      target: target(k),
      drift,
      outside: Math.abs(drift) > plan.band + 1e-9,
      toTarget: target(k) * total - value[k],
      fromNewMoney: placed[i],
    };
  });
  const driftAfterNewMoney =
    after > 0
      ? Math.max(
          ...PLAN_CLASSES.map((k, i) => Math.abs((value[k] + placed[i]) / after - target(k))),
        )
      : 0;
  const nextReview = addDays(plan.reviewedOn, Math.round(plan.reviewMonths * 30.44));
  return {
    total,
    rows,
    adherence: total > 0 ? 1 - rows.reduce((s, r) => s + Math.abs(r.drift), 0) / 2 : 0,
    outside: rows.filter((r) => r.outside),
    oversized: view.holdings
      .filter((h) => total > 0 && h.valueTRY / total > plan.maxSingle + 1e-9)
      .map((h) => ({ assetId: h.assetId, symbol: h.symbol, weight: h.valueTRY / total })),
    tradeVolume: rows.reduce((s, r) => s + Math.max(0, r.toTarget), 0),
    newMoney: money,
    driftAfterNewMoney,
    nextReview,
    reviewDue: today >= nextReview,
  };
}

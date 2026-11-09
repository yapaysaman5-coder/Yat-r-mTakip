import { trDay } from '@/domain';

import type { HistoryItem, PortfolioView } from './portfolioView';

/**
 * Figures for the Geçmiş tab (docs/01-PROJE-DOKUMANI.md §6.5), all read from the loaded
 * portfolio view: closed sales, cash movements and the monthly statement.
 */

// ── Gerçekleşen K/Z ──────────────────────────────────────────────────────────

export interface RealizedItem {
  item: HistoryItem;
  pnlTRY: number;
  costTRY: number;
  proceedsTRY: number;
  /** null when the cost was zero. */
  ratio: number | null;
  holdingDays: number;
}

export interface RealizedTotals {
  pnl: number;
  cost: number;
  proceeds: number;
  count: number;
  wins: number;
  losses: number;
  /** Wins ÷ (wins + losses); null without any sale. */
  winRate: number | null;
  /** Average holding period weighted by cost (days). */
  avgHoldingDays: number | null;
}

export interface RealizedYear extends RealizedTotals {
  year: string;
}

export interface RealizedView {
  /** Newest first. */
  items: RealizedItem[];
  /** Newest first. */
  years: RealizedYear[];
  total: RealizedTotals;
}

function totals(items: readonly RealizedItem[]): RealizedTotals {
  let pnl = 0;
  let cost = 0;
  let proceeds = 0;
  let wins = 0;
  let losses = 0;
  let weightedDays = 0;
  for (const r of items) {
    pnl += r.pnlTRY;
    cost += r.costTRY;
    proceeds += r.proceedsTRY;
    if (r.pnlTRY > 0) wins++;
    else if (r.pnlTRY < 0) losses++;
    weightedDays += r.holdingDays * r.costTRY;
  }
  return {
    pnl,
    cost,
    proceeds,
    count: items.length,
    wins,
    losses,
    winRate: wins + losses > 0 ? wins / (wins + losses) : null,
    avgHoldingDays: cost > 0 ? weightedDays / cost : null,
  };
}

export function buildRealized(view: PortfolioView): RealizedView {
  const items: RealizedItem[] = view.history.flatMap((item) =>
    item.type === 'SELL' && item.realized
      ? [
          {
            item,
            ...item.realized,
            ratio: item.realized.costTRY > 0 ? item.realized.pnlTRY / item.realized.costTRY : null,
          },
        ]
      : [],
  );
  const byYear = new Map<string, RealizedItem[]>();
  for (const r of items) {
    const y = trDay(r.item.ts).slice(0, 4);
    byYear.set(y, [...(byYear.get(y) ?? []), r]);
  }
  return {
    items,
    years: [...byYear.entries()]
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([year, list]) => ({ year, ...totals(list) })),
    total: totals(items),
  };
}

/** Holding period in words: "12 gün", "3 ay", "1 yıl 4 ay". */
export function holdingText(days: number): string {
  const d = Math.round(days);
  if (d < 1) return 'aynı gün';
  if (d < 45) return `${d} gün`;
  const months = Math.round(d / 30.44);
  if (months < 12) return `${months} ay`;
  const y = Math.floor(months / 12);
  const m = months % 12;
  return m ? `${y} yıl ${m} ay` : `${y} yıl`;
}

// ── Nakit Hareketleri ────────────────────────────────────────────────────────

export interface CashTotals {
  /** Manual deposits and the automatic ones made for purchases. */
  deposited: number;
  depositedAuto: number;
  withdrawn: number;
  /** Net of withholding tax. */
  dividends: number;
  dividendTax: number;
  commissions: number;
  accountFees: number;
}

export interface CashYear extends CashTotals {
  year: string;
}

export interface CashView {
  /** Deposits, withdrawals, dividends and account fees, newest first. */
  items: HistoryItem[];
  years: CashYear[];
  total: CashTotals;
  /** Net invested over time (for the chart). */
  netInvested: { dates: string[]; values: number[] };
}

const CASH_TYPES = new Set<HistoryItem['type']>(['DEPOSIT', 'WITHDRAW', 'DIVIDEND', 'FEE']);

function emptyCash(): CashTotals {
  return {
    deposited: 0,
    depositedAuto: 0,
    withdrawn: 0,
    dividends: 0,
    dividendTax: 0,
    commissions: 0,
    accountFees: 0,
  };
}

function addCash(t: CashTotals, h: HistoryItem) {
  switch (h.type) {
    case 'DEPOSIT':
      t.deposited += h.amountTRY;
      if (h.isAuto) t.depositedAuto += h.amountTRY;
      break;
    case 'WITHDRAW':
      t.withdrawn += -h.amountTRY;
      break;
    case 'DIVIDEND':
      t.dividends += h.amountTRY;
      t.dividendTax += h.taxTRY ?? 0;
      break;
    case 'FEE':
      t.accountFees += -h.amountTRY;
      break;
    case 'BUY':
    case 'SELL':
      t.commissions += h.feeTRY ?? 0;
      break;
  }
}

export function buildCash(view: PortfolioView): CashView {
  const total = emptyCash();
  const byYear = new Map<string, CashTotals>();
  for (const h of view.history) {
    addCash(total, h);
    const y = trDay(h.ts).slice(0, 4);
    if (!byYear.has(y)) byYear.set(y, emptyCash());
    addCash(byYear.get(y)!, h);
  }
  return {
    items: view.history.filter((h) => CASH_TYPES.has(h.type)),
    years: [...byYear.entries()]
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([year, t]) => ({ year, ...t })),
    total,
    netInvested: { dates: view.series.dates, values: view.series.netInvested },
  };
}

// ── Aylık Ekstre ─────────────────────────────────────────────────────────────

export interface MonthStatement {
  /** yyyy-mm */
  month: string;
  /** Value at the end of the previous month (0 before the first record). */
  open: number;
  /** Money put in (incl. automatic deposits) and taken out. */
  inflow: number;
  outflow: number;
  /** close − open − (inflow − outflow): what the market (and income) added. */
  market: number;
  close: number;
  /** Time-weighted return of the month; null when nothing was invested. */
  return: number | null;
  dividends: number;
  accountFees: number;
  realized: number;
  trades: number;
  /** The month is still running (its close is today's value). */
  partial: boolean;
  firstDay: string;
  lastDay: string;
}

export function buildStatement(view: PortfolioView): MonthStatement[] {
  const { dates, values, unitValues } = view.series;
  if (dates.length === 0) return [];
  const byMonth = new Map<string, HistoryItem[]>();
  for (const h of view.history) {
    const m = trDay(h.ts).slice(0, 7);
    byMonth.set(m, [...(byMonth.get(m) ?? []), h]);
  }
  const out: MonthStatement[] = [];
  let i = 0;
  while (i < dates.length) {
    const month = dates[i].slice(0, 7);
    let j = i;
    while (j + 1 < dates.length && dates[j + 1].slice(0, 7) === month) j++;
    const open = i > 0 ? values[i - 1] : 0;
    const close = values[j];
    const records = byMonth.get(month) ?? [];
    let inflow = 0;
    let outflow = 0;
    let dividends = 0;
    let accountFees = 0;
    let realized = 0;
    let trades = 0;
    for (const h of records) {
      if (h.type === 'DEPOSIT') inflow += h.amountTRY;
      else if (h.type === 'WITHDRAW') outflow += -h.amountTRY;
      else if (h.type === 'DIVIDEND') dividends += h.amountTRY;
      else if (h.type === 'FEE') accountFees += -h.amountTRY;
      if (h.type === 'BUY' || h.type === 'SELL') trades++;
      if (h.realized) realized += h.realized.pnlTRY;
    }
    const startUnit = i > 0 ? unitValues[i - 1] : 1;
    const invested = open > 0 || inflow > 0;
    out.push({
      month,
      open,
      inflow,
      outflow,
      market: close - open - (inflow - outflow),
      close,
      return: invested && startUnit > 0 ? unitValues[j] / startUnit - 1 : null,
      dividends,
      accountFees,
      realized,
      trades,
      partial: j === dates.length - 1 && dates[j] >= view.today && !isMonthEnd(dates[j]),
      firstDay: dates[i],
      lastDay: dates[j],
    });
    i = j + 1;
  }
  return out.reverse();
}

/** The records of one month (yyyy-mm), newest first. */
export function monthRecords(view: PortfolioView, month: string): HistoryItem[] {
  return view.history.filter((h) => trDay(h.ts).slice(0, 7) === month);
}

function isMonthEnd(day: string): boolean {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.getUTCDate() === 1;
}

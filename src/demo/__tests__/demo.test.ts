import { describe, expect, it } from '@jest/globals';

import { identityGap } from '@/domain';

import { DEMO_METRICS, DEMO_VALUES } from '../analysis';
import { DEMO_HOLDINGS, DEMO_TOTAL_VALUE, DEMO_TXNS, demoSummary } from '../data';
import { DEMO_DAYS } from '../market';
import {
  DEMO_LEDGER,
  DEMO_SERIES,
  DEMO_TODAY,
  DEMO_TRANSACTIONS,
  DEMO_VALUATION,
} from '../portfolio';

describe('demo data runs cleanly through the engine', () => {
  it('has no ledger warnings and balances', () => {
    expect(DEMO_LEDGER.issues).toEqual([]);
    expect(identityGap(DEMO_VALUATION).abs().lt('1e-20')).toBe(true);
    expect(DEMO_LEDGER.cash.gte(0)).toBe(true);
  });

  it('ends the daily series at the headline total', () => {
    expect(DEMO_SERIES[DEMO_DAYS - 1].value).toBeCloseTo(DEMO_TOTAL_VALUE, 6);
    expect(DEMO_VALUES.me[DEMO_DAYS - 1]).toBeCloseTo(DEMO_TOTAL_VALUE, 6);
  });

  it('holds the intended positions', () => {
    expect(Object.fromEntries(DEMO_HOLDINGS.map((h) => [h.symbol, h.quantity]))).toEqual({
      THYAO: 1000,
      ASELS: 1500,
      TUPRS: 750,
      AAPL: 20,
      NVDA: 30,
      BTC: 0.042,
      ETH: 0.35,
    });
  });

  it('lists every transaction in the history, newest first', () => {
    expect(DEMO_TXNS.length).toBe(DEMO_TRANSACTIONS.length);
    expect(DEMO_TXNS[0].ts >= DEMO_TXNS[DEMO_TXNS.length - 1].ts).toBe(true);
  });

  it('prints the figures shown on the screens', () => {
    const s = demoSummary();
    const auto = DEMO_TRANSACTIONS.filter((t) => t.isAuto);
    console.log(
      JSON.stringify(
        {
          total: s.totalValue.toFixed(2),
          cash: s.cash.toFixed(2),
          deposited: s.deposited,
          withdrawn: s.withdrawn,
          netPnl: s.netPnl.toFixed(2),
          netPnlRatio: s.netPnlRatio.toFixed(4),
          today: DEMO_TODAY.total.toFixed(2),
          todayRatio: s.dailyChangeRatio.toFixed(4),
          autoDeposits: auto.map((t) => `${t.ts.slice(0, 10)} ${t.amount}`),
          twr: DEMO_METRICS.twr.toFixed(4),
          xirr: DEMO_METRICS.xirr.toFixed(4),
          alpha: DEMO_METRICS.alpha.toFixed(4),
          beta: DEMO_METRICS.beta.toFixed(2),
          vol: DEMO_METRICS.volatility.toFixed(3),
          maxDD: DEMO_METRICS.maxDrawdown.toFixed(3),
          risk: DEMO_METRICS.riskLevel,
          holdings: DEMO_HOLDINGS.map(
            (h) =>
              `${h.symbol} ${h.valueTRY.toFixed(0)} avg ${h.avgCost.toFixed(2)} day ${h.dailyChangeTRY.toFixed(0)}`,
          ),
        },
        null,
        1,
      ),
    );
  });
});

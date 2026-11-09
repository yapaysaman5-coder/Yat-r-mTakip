/**
 * DEMO PORTFOLIO — a fictional transaction history that runs through the real calculation
 * engine (src/domain). Every figure on the preview screens comes from here.
 * Replaced by the user's own records in Phase 3.
 */
import {
  buildDailySeries,
  buildLedger,
  dailyChange,
  reconcileAutoRecords,
  trDayStart,
  unitize,
  valuePortfolio,
  type Quote,
  type Transaction,
} from '@/domain';

import {
  DEMO_ASSET_DEFS,
  DEMO_ASSETS,
  DEMO_CLOSES,
  DEMO_DATES,
  DEMO_DAYS,
  DEMO_END,
  dayIndex,
  USDTRY,
} from './market';

/** Istanbul local time → UTC ISO timestamp. */
const at = (date: string, hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return new Date(trDayStart(date) + (h * 60 + m) * 60_000).toISOString();
};

const usd = (date: string) => USDTRY[dayIndex(date)].toFixed(4);
const closeOn = (assetId: string, date: string) => DEMO_CLOSES[assetId][dayIndex(date)];

/** Typical commissions: BIST ‰2, US $1 per order, crypto 0,1%. */
function trade(type: 'BUY' | 'SELL', date: string, assetId: string, quantity: string): Transaction {
  const asset = DEMO_ASSETS.get(assetId)!;
  const price = closeOn(assetId, date);
  const gross = Number(quantity) * price;
  const fee = asset.market === 'BIST' ? gross * 0.002 : asset.market === 'US' ? 1 : gross * 0.001;
  const time = asset.market === 'BIST' ? '10:30' : asset.market === 'US' ? '17:00' : '21:00';
  return {
    id: `${type === 'BUY' ? 'b' : 's'}-${assetId}-${date}`,
    type,
    ts: at(date, time),
    assetId,
    quantity,
    price: price.toFixed(2),
    fee: fee.toFixed(2),
    fxRate: asset.currency === 'TRY' ? '1' : usd(date),
  };
}

const cash = (type: 'DEPOSIT' | 'WITHDRAW' | 'FEE', date: string, amount: string): Transaction => ({
  id: `${type.toLowerCase()}-${date}`,
  type,
  ts: at(date, '09:00'),
  amount,
});

const dividend = (date: string, assetId: string, gross: string, tax: string): Transaction => ({
  id: `div-${assetId}-${date}`,
  type: 'DIVIDEND',
  ts: at(date, '11:00'),
  assetId,
  amount: gross,
  tax,
  fxRate: DEMO_ASSETS.get(assetId)!.currency === 'TRY' ? '1' : usd(date),
});

const MANUAL: Transaction[] = [
  cash('DEPOSIT', '2025-01-12', '400000'),
  trade('BUY', '2025-01-13', 'THYAO', '500'),
  trade('BUY', '2025-01-13', 'ASELS', '1750'),
  trade('BUY', '2025-01-13', 'AAPL', '10'),
  trade('BUY', '2025-02-03', 'BTC', '0.02'),
  cash('DEPOSIT', '2025-03-03', '150000'),
  trade('BUY', '2025-03-04', 'NVDA', '20'),
  trade('BUY', '2025-03-04', 'ETH', '0.35'),
  cash('DEPOSIT', '2025-06-02', '200000'),
  trade('BUY', '2025-06-03', 'TUPRS', '750'),
  trade('BUY', '2025-06-03', 'AAPL', '10'),
  dividend('2025-07-15', 'TUPRS', '4875', '487.5'),
  cash('DEPOSIT', '2025-09-01', '150000'),
  trade('BUY', '2025-09-02', 'THYAO', '400'),
  trade('SELL', '2025-09-24', 'ASELS', '250'),
  cash('DEPOSIT', '2025-12-01', '130000'),
  trade('BUY', '2025-12-02', 'BTC', '0.032'),
  cash('FEE', '2026-01-05', '120'),
  trade('SELL', '2026-02-20', 'BTC', '0.01'),
  cash('WITHDRAW', '2026-03-02', '60318'),
  trade('BUY', '2026-04-10', 'NVDA', '10'),
  dividend('2026-05-20', 'THYAO', '2700', '405'),
  cash('DEPOSIT', '2026-06-01', '120000'),
  dividend('2026-08-12', 'AAPL', '5.2', '0.78'),
  cash('WITHDRAW', '2026-10-15', '20000'),
  cash('DEPOSIT', '2026-11-01', '50000'),
  { ...trade('BUY', DEMO_END, 'THYAO', '100'), ts: at(DEMO_END, '14:32') },
];

/** All transactions, including automatic deposits where cash ran short. */
export const DEMO_TRANSACTIONS: Transaction[] = reconcileAutoRecords(MANUAL, { autoDeposit: true });

export const DEMO_LEDGER = buildLedger(DEMO_TRANSACTIONS);

const last = DEMO_DAYS - 1;
export const DEMO_QUOTES: Record<string, Quote> = Object.fromEntries(
  DEMO_ASSET_DEFS.map((d) => [
    d.asset.id,
    {
      price: d.price,
      prevClose: d.prevClose,
      fx: d.asset.currency === 'TRY' ? 1 : USDTRY[last],
      fxPrev: d.asset.currency === 'TRY' ? 1 : USDTRY[last - 1],
    },
  ]),
);

export const DEMO_VALUATION = valuePortfolio(DEMO_LEDGER, DEMO_QUOTES, {
  foreignCurrency: (id) => DEMO_ASSETS.get(id)?.currency !== 'TRY',
});

/** Today = the last demo day, starting at Istanbul midnight. */
export const DEMO_TODAY = dailyChange(DEMO_TRANSACTIONS, DEMO_QUOTES, trDayStart(DEMO_END));

/** Daily value series (TRY) from the first deposit to today. */
export const DEMO_SERIES = buildDailySeries(
  DEMO_TRANSACTIONS,
  DEMO_ASSETS,
  Object.fromEntries(
    DEMO_ASSET_DEFS.map((d) => [
      d.asset.id,
      Object.fromEntries(DEMO_DATES.map((date, i) => [date, DEMO_CLOSES[d.asset.id][i]])),
    ]),
  ),
  { USD: Object.fromEntries(DEMO_DATES.map((date, i) => [date, USDTRY[i]])) },
  { from: DEMO_DATES[0], to: DEMO_END },
);

/** Internal unit values for the time-weighted return (never shown as such). */
export const DEMO_UNITS = unitize(DEMO_SERIES);

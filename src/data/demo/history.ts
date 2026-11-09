/**
 * The example portfolio's records: two years of a fictional investor (7 assets, trades,
 * dividends, an account fee, deposits and withdrawals). Written against reference dates
 * ending on 8 Nov 2026 and shifted so the history always ends on the day it is created.
 */
import { addDays, trDay, trDayStart, type Transaction } from '@/domain';

import { DEMO_ASSET_DEFS, type DemoMarket } from './market';

const REF_END = '2026-11-08';

const dayDiff = (a: string, b: string) =>
  Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);

export function demoTransactions(market: DemoMarket, now: Date): Transaction[] {
  const end = market.dates[market.dates.length - 1];
  const shift = dayDiff(REF_END, end);
  const index = (refDate: string) => market.dates.indexOf(addDays(refDate, shift));
  /** Istanbul local time on a (shifted) reference day → UTC ISO timestamp. */
  const at = (refDate: string, hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number);
    return new Date(trDayStart(addDays(refDate, shift)) + (h * 60 + m) * 60_000).toISOString();
  };
  const usd = (refDate: string) => market.usdtry[index(refDate)].toFixed(4);
  const def = (symbol: string) => DEMO_ASSET_DEFS.find((d) => d.asset.symbol === symbol)!;

  /** Typical commissions: BIST ‰2, US $1 per order, crypto 0,1%. */
  const trade = (type: 'BUY' | 'SELL', refDate: string, symbol: string, quantity: string) => {
    const { asset } = def(symbol);
    const price = market.closes[symbol][index(refDate)];
    const gross = Number(quantity) * price;
    const fee = asset.market === 'BIST' ? gross * 0.002 : asset.market === 'US' ? 1 : gross * 0.001;
    const time = asset.market === 'BIST' ? '10:30' : asset.market === 'US' ? '17:00' : '21:00';
    const t: Transaction = {
      id: `demo-${type === 'BUY' ? 'b' : 's'}-${symbol}-${refDate}`,
      type,
      ts: at(refDate, time),
      assetId: asset.id,
      quantity,
      price: price.toFixed(2),
      fee: fee.toFixed(2),
      fxRate: asset.currency === 'TRY' ? '1' : usd(refDate),
    };
    return t;
  };
  const cash = (type: 'DEPOSIT' | 'WITHDRAW' | 'FEE', refDate: string, amount: string) => ({
    id: `demo-${type.toLowerCase()}-${refDate}`,
    type,
    ts: at(refDate, '09:00'),
    amount,
  });
  const dividend = (refDate: string, symbol: string, gross: string, tax: string): Transaction => ({
    id: `demo-div-${symbol}-${refDate}`,
    type: 'DIVIDEND',
    ts: at(refDate, '11:00'),
    assetId: def(symbol).asset.id,
    amount: gross,
    tax,
    fxRate: def(symbol).asset.currency === 'TRY' ? '1' : usd(refDate),
  });

  // Today's purchase happened "a little while ago" (never in the future).
  const todayAt = Math.min(Date.parse(at(REF_END, '14:32')), now.getTime() - 2 * 60_000);
  const todayTs = new Date(Math.max(todayAt, trDayStart(end))).toISOString();

  const list: Transaction[] = [
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
    { ...trade('BUY', REF_END, 'THYAO', '100'), ts: todayTs },
  ];
  // Keep only records on the generated days (all of them, unless the clock is odd).
  return list.filter((t) => market.dates.includes(trDay(t.ts)));
}

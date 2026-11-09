/**
 * Domain model (docs/02-HESAPLAMA-MOTORU.md §1–§3, docs/03-TEKNIK-MIMARI.md §5).
 * Money and quantities are decimal strings; timestamps are ISO-8601 UTC.
 * The reporting (base) currency is TRY.
 */

export type Market = 'BIST' | 'US' | 'CRYPTO' | 'FX' | 'COMMODITY' | 'INDEX' | 'CUSTOM';
export type Currency = 'TRY' | 'USD' | 'EUR';

export interface Asset {
  id: string;
  symbol: string;
  market: Market;
  /** Currency the asset is priced in. */
  currency: Currency;
  name?: string;
}

export type TxnType = 'BUY' | 'SELL' | 'DEPOSIT' | 'WITHDRAW' | 'DIVIDEND' | 'FEE' | 'SPLIT';

export interface Transaction {
  id: string;
  type: TxnType;
  /** ISO-8601 UTC timestamp. */
  ts: string;
  /** BUY, SELL, DIVIDEND, SPLIT. */
  assetId?: string;
  /** BUY / SELL: number of units. */
  quantity?: string;
  /** BUY / SELL: unit price in the asset's currency. */
  price?: string;
  /** BUY / SELL: commission in the asset's currency. */
  fee?: string;
  /** Value of 1 unit of the asset's currency in TRY at the transaction time ("1" for TRY). */
  fxRate?: string;
  /** DEPOSIT / WITHDRAW / FEE: amount in TRY. DIVIDEND: gross amount in the asset's currency. */
  amount?: string;
  /** DIVIDEND: withholding tax in the asset's currency. */
  tax?: string;
  /** SPLIT: units after ÷ units before (a 100% bonus issue = "2"). */
  splitRatio?: string;
  /** SELL: also withdraw the proceeds from the portfolio (creates a linked WITHDRAW). */
  withdrawProceeds?: boolean;
  /** Created automatically for another transaction (auto deposit / proceeds withdrawal). */
  isAuto?: boolean;
  /** The transaction this automatic record belongs to. */
  linkedTo?: string;
  note?: string;
}

export type CostMethod = 'average' | 'fifo';

/** A live (or historical) quote used for valuation. */
export interface Quote {
  /** Current price in the asset's currency. */
  price: string | number;
  /** Previous close in the asset's currency (for today's change). */
  prevClose?: string | number;
  /** Current value of 1 unit of the asset's currency in TRY ("1" for TRY assets). */
  fx?: string | number;
  /** Value of 1 unit of the asset's currency in TRY at the previous close. */
  fxPrev?: string | number;
}

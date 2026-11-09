import type { Currency, Market } from '@/domain';

import cryptoCatalog from './catalog/crypto.json';
import type { SourceId } from './types';

/**
 * What can be priced, and where each price comes from (docs/03-TEKNIK-MIMARI.md §6.2).
 * Sources are listed in order of preference; the router falls back down the list.
 *
 * A source reference can be scaled (ounce → gram) and multiplied by another instrument's
 * price (an index in USD × USD/TRY, a USD price → TRY).
 */
export interface SourceRef {
  source: SourceId;
  ref: string;
  scale?: number;
  times?: string;
}

export interface Instrument {
  /** Same as the asset id stored in the database (e.g. "BIST:THYAO", "FX:USDTRY"). */
  id: string;
  symbol: string;
  name: string;
  market: Market;
  /** Currency the price is in. */
  currency: Currency;
  sources: readonly SourceRef[];
}

const GRAM = 1 / 31.1034768; // troy ounce → gram

export const FIXED_INSTRUMENTS: readonly Instrument[] = [
  {
    id: 'FX:USDTRY',
    symbol: 'USD/TRY',
    name: 'Dolar/TL',
    market: 'FX',
    currency: 'TRY',
    sources: [
      { source: 'yahoo', ref: 'USDTRY=X' },
      { source: 'binance', ref: 'USDTTRY' },
      { source: 'isyatirim', ref: '@USDTRY' },
      { source: 'tcmb', ref: 'USD' },
    ],
  },
  {
    id: 'FX:EURTRY',
    symbol: 'EUR/TRY',
    name: 'Euro/TL',
    market: 'FX',
    currency: 'TRY',
    sources: [
      { source: 'yahoo', ref: 'EURTRY=X' },
      { source: 'binance', ref: 'EURUSDT', times: 'FX:USDTRY' },
      { source: 'tcmb', ref: 'EUR' },
    ],
  },
  {
    id: 'INDEX:XU100',
    symbol: 'XU100',
    name: 'BIST 100',
    market: 'INDEX',
    currency: 'TRY',
    sources: [
      { source: 'yahoo', ref: 'XU100.IS' },
      { source: 'isyatirim', ref: '@XU100' },
    ],
  },
  {
    id: 'INDEX:XU030',
    symbol: 'XU030',
    name: 'BIST 30',
    market: 'INDEX',
    currency: 'TRY',
    sources: [{ source: 'yahoo', ref: 'XU030.IS' }],
  },
  {
    id: 'INDEX:SPX',
    symbol: 'SPX',
    name: 'S&P 500',
    market: 'INDEX',
    currency: 'USD',
    sources: [{ source: 'yahoo', ref: '^GSPC' }],
  },
  {
    id: 'INDEX:NDX',
    symbol: 'NDX',
    name: 'Nasdaq 100',
    market: 'INDEX',
    currency: 'USD',
    sources: [{ source: 'yahoo', ref: '^NDX' }],
  },
  {
    id: 'INDEX:RUT',
    symbol: 'RUT',
    name: 'Russell 2000',
    market: 'INDEX',
    currency: 'USD',
    sources: [{ source: 'yahoo', ref: '^RUT' }],
  },
  {
    id: 'COMMODITY:GAU',
    symbol: 'GAU',
    name: 'Gram Altın',
    market: 'COMMODITY',
    currency: 'TRY',
    sources: [
      { source: 'binance', ref: 'PAXGTRY', scale: GRAM },
      { source: 'yahoo', ref: 'GC=F', scale: GRAM, times: 'FX:USDTRY' },
    ],
  },
  {
    id: 'COMMODITY:XAG',
    symbol: 'XAG',
    name: 'Gram Gümüş',
    market: 'COMMODITY',
    currency: 'TRY',
    sources: [{ source: 'yahoo', ref: 'SI=F', scale: GRAM, times: 'FX:USDTRY' }],
  },
];

const FIXED = new Map(FIXED_INSTRUMENTS.map((i) => [i.id, i]));

type CryptoRow = [symbol: string, name: string, coingeckoId: string, binancePair: string | null];
const CRYPTO = new Map((cryptoCatalog as CryptoRow[]).map((r) => [r[0], r]));

/** The instrument behind an asset id; null for ids no source covers (demo:, custom…). */
export function instrumentFor(assetId: string, name?: string): Instrument | null {
  const fixed = FIXED.get(assetId);
  if (fixed) return fixed;
  const [market, symbol] = assetId.split(':');
  if (!symbol) return null;
  switch (market) {
    case 'BIST':
      return {
        id: assetId,
        symbol,
        name: name ?? symbol,
        market: 'BIST',
        currency: 'TRY',
        sources: [
          { source: 'yahoo', ref: `${symbol}.IS` },
          { source: 'isyatirim', ref: symbol },
        ],
      };
    case 'US':
      return {
        id: assetId,
        symbol,
        name: name ?? symbol,
        market: 'US',
        currency: 'USD',
        sources: [{ source: 'yahoo', ref: symbol }],
      };
    case 'CRYPTO': {
      const row = CRYPTO.get(symbol);
      const sources: SourceRef[] = [];
      // Unknown coins still get a try on Binance; a stablecoin without a USDT pair is ~1 USD.
      if (row?.[3] ?? !row) sources.push({ source: 'binance', ref: row?.[3] ?? `${symbol}USDT` });
      if (row) sources.push({ source: 'coingecko', ref: row[2] });
      return {
        id: assetId,
        symbol,
        name: name ?? row?.[1] ?? symbol,
        market: 'CRYPTO',
        currency: 'USD',
        sources,
      };
    }
    default:
      return null;
  }
}

/** The instrument that converts a currency to TRY. */
export const fxInstrumentId = (currency: Currency) => `FX:${currency}TRY`;

import { Platform } from 'react-native';

import { createHttp } from './http';
import { lookupCoins, mockLookup, type LookupResult } from './lookup';
import { binance } from './providers/binance';
import { coingecko } from './providers/coingecko';
import { isyatirim } from './providers/isyatirim';
import { mock } from './providers/mock';
import { tcmb } from './providers/tcmb';
import { yahoo } from './providers/yahoo';
import { MarketRouter } from './router';

let router: MarketRouter | null = null;

/**
 * The app's market data router. On the phone it talks to the real sources; the web preview
 * uses fictional prices (browsers block these sources with CORS).
 */
export function getMarketRouter(): MarketRouter {
  router ??=
    Platform.OS === 'web'
      ? new MarketRouter(
          { yahoo: mock, binance: mock, coingecko: mock, isyatirim: mock, tcmb: mock },
          createHttp(),
        )
      : new MarketRouter({ yahoo, binance, coingecko, isyatirim, tcmb }, createHttp());
  return router;
}

export const usesMockPrices = () => Platform.OS === 'web';

/** Looks a coin up on Binance and CoinGecko (fictional results in the web preview). */
export function lookupCoinsOnline(query: string): Promise<LookupResult> {
  if (usesMockPrices()) {
    return new Promise((resolve) => setTimeout(() => resolve(mockLookup(query)), 400));
  }
  return lookupCoins(query, createHttp(fetch, 10_000));
}

import type { PortfolioKind } from './types';

/**
 * "Ya Olsaydı?" comparison series (doc §12). Each one is the daily close of an asset in TRY.
 * The demo portfolio has fictional ones; real ones arrive with market data (Phase 4, 9).
 */
export interface BenchmarkDef {
  key: string;
  name: string;
}

export const BENCHMARKS: readonly BenchmarkDef[] = [
  { key: 'gold', name: 'Gram Altın' },
  { key: 'btc', name: 'Bitcoin' },
  { key: 'deposit', name: 'Mevduat' },
  { key: 'cpi', name: 'TÜFE (enflasyon)' },
  { key: 'ndx', name: 'Nasdaq 100' },
  { key: 'spx', name: 'S&P 500' },
  { key: 'xu030', name: 'BIST 30' },
  { key: 'xu100', name: 'BIST 100' },
  { key: 'silver', name: 'Gram Gümüş' },
  { key: 'eur', name: 'Euro/TL' },
  { key: 'rut', name: 'Russell 2000' },
  { key: 'usd', name: 'Dolar/TL' },
];

/** Benchmark used for Beta and Alpha. */
export const MAIN_BENCHMARK = 'xu100';

const DEMO_IDS: Record<string, string> = {
  gold: 'demo:GAUTRY',
  btc: 'demo:BTCTRY',
  deposit: 'demo:DEPOSIT',
  cpi: 'demo:CPI',
  ndx: 'demo:NDX',
  spx: 'demo:SPX',
  xu030: 'demo:XU030',
  xu100: 'demo:XU100',
  silver: 'demo:XAGTRY',
  eur: 'demo:EURTRY',
  rut: 'demo:RUT',
  usd: 'demo:USDTRY',
};

const REAL_IDS: Record<string, string> = {
  gold: 'COMMODITY:GAUTRY',
  btc: 'CRYPTO:BTCTRY',
  deposit: 'CUSTOM:DEPOSIT',
  cpi: 'CUSTOM:CPI',
  ndx: 'INDEX:NDX',
  spx: 'INDEX:SPX',
  xu030: 'INDEX:XU030',
  xu100: 'INDEX:XU100',
  silver: 'COMMODITY:XAGTRY',
  eur: 'FX:EURTRY',
  rut: 'INDEX:RUT',
  usd: 'FX:USDTRY',
};

export function benchmarkAssetId(kind: PortfolioKind, key: string): string {
  return (kind === 'demo' ? DEMO_IDS : REAL_IDS)[key];
}

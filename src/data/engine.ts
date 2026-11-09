import type { CostMethod } from '@/domain';

import type { PortfolioKind } from './types';

/** Calculation settings (Ayarlar › Hesaplama, Phase 10). Defaults per the approved decisions. */
export interface EngineOptions {
  method: CostMethod;
  /** Add a deposit automatically when a purchase needs more cash than the portfolio holds. */
  autoDeposit: boolean;
}

export const DEFAULT_ENGINE: EngineOptions = { method: 'average', autoDeposit: true };

/**
 * Exchange rates are stored as daily closes of FX assets. Demo portfolios use their own
 * fictional rates so they never mix with real market data.
 */
export function fxAssetId(kind: PortfolioKind, currency: string): string {
  return kind === 'demo' ? `demo:${currency}TRY` : `FX:${currency}TRY`;
}

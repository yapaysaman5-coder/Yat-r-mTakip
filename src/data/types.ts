import type { Asset } from '@/domain';

/** 'user': the person's own records. 'demo': the example portfolio with fictional prices. */
export type PortfolioKind = 'user' | 'demo';

export interface Portfolio {
  id: string;
  name: string;
  kind: PortfolioKind;
  color?: string;
  sortOrder: number;
  /** Demo portfolios: the last day of their generated prices (yyyy-mm-dd). */
  demoEnd?: string;
  /** First day whose cached daily value must be recomputed; null when the cache is current. */
  seriesDirtyFrom: string | null;
  createdAt: string;
}

export interface StoredAsset extends Asset {
  /** Symbol at the price source (e.g. THYAO.IS); empty for demo assets. */
  providerSymbol?: string;
}

/** Daily closes per asset: { assetId: { 'yyyy-mm-dd': close } }. */
export type CloseHistory = Record<string, Record<string, number>>;

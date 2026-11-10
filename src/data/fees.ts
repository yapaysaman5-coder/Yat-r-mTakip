/** Commissions suggested by the trade form (Ayarlar › Hesaplama). */
export interface FeeSettings {
  /** BIST: share of the trade value (0.002 = ‰2). */
  bistRate: number;
  /** US: dollars per order. */
  usPerOrder: number;
  /** Crypto: share of the trade value (0.001 = %0,1). */
  cryptoRate: number;
}

export const DEFAULT_FEES: FeeSettings = { bistRate: 0.002, usPerOrder: 1, cryptoRate: 0.001 };

import { Decimal } from 'decimal.js';

/**
 * Decimal arithmetic for money and quantities (docs/02-HESAPLAMA-MOTORU.md §14).
 * 40 significant digits, round-half-up; amounts are stored and exchanged as strings.
 */
export const D = Decimal.clone({ precision: 40, rounding: Decimal.ROUND_HALF_UP });
export type Dec = InstanceType<typeof D>;
export type DecInput = Dec | Decimal | string | number;

export const ZERO: Dec = new D(0);
export const ONE: Dec = new D(1);

export function dec(value: DecInput | undefined | null): Dec {
  if (value === undefined || value === null || value === '') return ZERO;
  return Decimal.isDecimal(value) ? new D(value.toString()) : new D(value);
}

export function sum(values: DecInput[]): Dec {
  return values.reduce<Dec>((acc, v) => acc.plus(dec(v)), ZERO);
}

/** Exact canonical string for storage (no exponent, trailing zeros trimmed). */
export function toStr(value: Dec): string {
  return value.toFixed();
}

export function toNum(value: Dec): number {
  return value.toNumber();
}

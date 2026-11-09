/** A number for an input field, Turkish style: 312,4 → "312,40"; no thousands separators. */
export function toInput(n: number, decimals: number): string {
  if (!Number.isFinite(n)) return '';
  return n.toFixed(decimals).replace('.', ',');
}

/** Decimal places that suit a price: 2 above 1, more for small prices (crypto). */
export function priceDecimals(n: number): number {
  return n >= 1 ? 2 : n >= 0.01 ? 4 : 8;
}

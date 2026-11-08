import { Decimal } from 'decimal.js';

/**
 * Turkish number, money, percent and date formatting.
 *
 * Implemented by hand (not Intl) so output is identical on every Android device and in tests,
 * and so values keep full decimal precision (amounts may arrive as strings from the database).
 */

export type Numeric = number | string | Decimal;
export type CurrencyCode = 'TRY' | 'USD' | 'EUR';
export type SignMode = 'auto' | 'always' | 'never';

const D = Decimal.clone({ precision: 40, rounding: Decimal.ROUND_HALF_UP });

export const CURRENCY_SYMBOL: Record<CurrencyCode, string> = { TRY: '₺', USD: '$', EUR: '€' };

/** Shown instead of amounts while privacy mode is on. */
export const MASK = '•••••';

const MINUS = '-';

function toDecimal(value: Numeric): Decimal {
  return Decimal.isDecimal(value) ? new D(value.toString()) : new D(value);
}

function groupThousands(intPart: string): string {
  return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function signPrefix(isNegative: boolean, isZero: boolean, mode: SignMode): string {
  if (mode === 'never' || isZero) return '';
  if (isNegative) return MINUS;
  return mode === 'always' ? '+' : '';
}

export interface NumberFormatOptions {
  /** Minimum fraction digits (default 0). */
  minDecimals?: number;
  /** Maximum fraction digits (default 2). Trailing zeros beyond `minDecimals` are trimmed. */
  maxDecimals?: number;
  grouping?: boolean;
}

/** Formats an unsigned magnitude: `1284562.4` → `1.284.562,40` (with min/max 2). */
function formatMagnitude(abs: Decimal, opts: NumberFormatOptions = {}): string {
  const { minDecimals = 0, maxDecimals = 2, grouping = true } = opts;
  const fixed = abs.toFixed(maxDecimals, Decimal.ROUND_HALF_UP);
  let [intPart, frac = ''] = fixed.split('.');
  frac = frac.replace(/0+$/, '');
  if (frac.length < minDecimals) frac = frac.padEnd(minDecimals, '0');
  const int = grouping ? groupThousands(intPart) : intPart;
  return frac.length > 0 ? `${int},${frac}` : int;
}

/** `1234.5` → `1.234,5`; negatives get a leading minus. */
export function formatNumber(value: Numeric, opts: NumberFormatOptions & { sign?: SignMode } = {}) {
  const d = toDecimal(value);
  const body = formatMagnitude(d.abs(), opts);
  const rounded = body.replace(/[.,]/g, '').replace(/^0+$/, '') === '';
  return `${signPrefix(d.isNegative(), rounded, opts.sign ?? 'auto')}${body}`;
}

export interface MoneyFormatOptions {
  currency?: CurrencyCode;
  /** Fixed number of decimals (default 2). */
  decimals?: number;
  sign?: SignMode;
  /** Abbreviate large values: `₺1,28 Mn`. */
  compact?: boolean;
}

/** `formatMoney(1284562.4)` → `₺1.284.562,40`; `formatMoney(-12, {sign:'always'})` → `-₺12,00`. */
export function formatMoney(value: Numeric, opts: MoneyFormatOptions = {}): string {
  const { currency = 'TRY', decimals = 2, sign = 'auto', compact = false } = opts;
  const d = toDecimal(value);
  const symbol = CURRENCY_SYMBOL[currency];
  const abs = d.abs();
  const body =
    compact && abs.gte(1000)
      ? formatCompactMagnitude(abs)
      : formatMagnitude(abs, { minDecimals: decimals, maxDecimals: decimals });
  const isZero = /^[0.,]+$/.test(body.replace(/\s.*$/, ''));
  return `${signPrefix(d.isNegative(), isZero, sign)}${symbol}${body}`;
}

/**
 * Price with precision that adapts to magnitude:
 * ≥ 1 → 2 decimals, ≥ 0.01 → 4 decimals, smaller → up to 8 significant decimals.
 */
export function formatPrice(value: Numeric, currency: CurrencyCode = 'TRY'): string {
  const d = toDecimal(value);
  const abs = d.abs();
  let body: string;
  if (abs.gte(1) || abs.isZero()) {
    body = formatMagnitude(abs, { minDecimals: 2, maxDecimals: 2 });
  } else if (abs.gte(0.01)) {
    body = formatMagnitude(abs, { minDecimals: 2, maxDecimals: 4 });
  } else {
    body = formatMagnitude(abs, { minDecimals: 2, maxDecimals: 8 });
  }
  return `${d.isNegative() ? MINUS : ''}${CURRENCY_SYMBOL[currency]}${body}`;
}

const COMPACT_UNITS: { threshold: Decimal; suffix: string }[] = [
  { threshold: new D('1e12'), suffix: 'Tn' },
  { threshold: new D('1e9'), suffix: 'Mr' },
  { threshold: new D('1e6'), suffix: 'Mn' },
  { threshold: new D('1e3'), suffix: 'B' },
];

/** Three significant digits with a Turkish unit: `1284562` → `1,28 Mn`, `12430` → `12,4 B`. */
function formatCompactMagnitude(abs: Decimal): string {
  for (let i = 0; i < COMPACT_UNITS.length; i++) {
    const unit = COMPACT_UNITS[i];
    if (abs.gte(unit.threshold)) {
      let scaled = abs.div(unit.threshold).toSignificantDigits(3, Decimal.ROUND_HALF_UP);
      // 999.6 B rounds to 1000 B → promote to the next unit (1 Mn).
      if (scaled.gte(1000) && i > 0) {
        const bigger = COMPACT_UNITS[i - 1];
        scaled = abs.div(bigger.threshold).toSignificantDigits(3, Decimal.ROUND_HALF_UP);
        return `${formatMagnitude(scaled, { maxDecimals: 2 })} ${bigger.suffix}`;
      }
      return `${formatMagnitude(scaled, { maxDecimals: 2 })} ${unit.suffix}`;
    }
  }
  return formatMagnitude(abs, { minDecimals: 0, maxDecimals: 2 });
}

/** `formatCompact(1284562)` → `1,28 Mn` (no currency). */
export function formatCompact(value: Numeric, sign: SignMode = 'auto'): string {
  const d = toDecimal(value);
  return `${signPrefix(d.isNegative(), d.isZero(), sign)}${formatCompactMagnitude(d.abs())}`;
}

export interface PercentFormatOptions {
  decimals?: number;
  sign?: SignMode;
}

/**
 * Takes a ratio: `formatPercent(0.0881)` → `%8,81`. Turkish puts the sign before `%`:
 * `formatPercent(-0.004)` → `-%0,40`, with `sign:'always'` → `+%1,20`.
 */
export function formatPercent(ratio: Numeric, opts: PercentFormatOptions = {}): string {
  const { decimals = 2, sign = 'auto' } = opts;
  const pct = toDecimal(ratio).times(100);
  const body = formatMagnitude(pct.abs(), { minDecimals: decimals, maxDecimals: decimals });
  const isZero = /^[0,]+$/.test(body);
  return `${signPrefix(pct.isNegative(), isZero, sign)}%${body}`;
}

/** Quantity with trailing zeros removed: `0.04215000` → `0,04215`, `1000` → `1.000`. */
export function formatQuantity(value: Numeric, maxDecimals = 8): string {
  return formatNumber(value, { minDecimals: 0, maxDecimals });
}

/* ───────────────────────────── Dates ───────────────────────────── */

/** Turkey has used a fixed UTC+3 offset since 2016 (no daylight saving). */
const TR_OFFSET_MS = 3 * 60 * 60 * 1000;

export const MONTHS_TR = [
  'Ocak',
  'Şubat',
  'Mart',
  'Nisan',
  'Mayıs',
  'Haziran',
  'Temmuz',
  'Ağustos',
  'Eylül',
  'Ekim',
  'Kasım',
  'Aralık',
] as const;

export const MONTHS_TR_SHORT = [
  'Oca',
  'Şub',
  'Mar',
  'Nis',
  'May',
  'Haz',
  'Tem',
  'Ağu',
  'Eyl',
  'Eki',
  'Kas',
  'Ara',
] as const;

interface TrParts {
  year: number;
  month: number; // 0-11
  day: number;
  hours: number;
  minutes: number;
}

function trParts(date: Date | number | string): TrParts {
  const t = new Date(new Date(date).getTime() + TR_OFFSET_MS);
  return {
    year: t.getUTCFullYear(),
    month: t.getUTCMonth(),
    day: t.getUTCDate(),
    hours: t.getUTCHours(),
    minutes: t.getUTCMinutes(),
  };
}

const pad2 = (n: number) => String(n).padStart(2, '0');

/** `08.11.2026` (Istanbul time). */
export function formatDate(date: Date | number | string): string {
  const p = trParts(date);
  return `${pad2(p.day)}.${pad2(p.month + 1)}.${p.year}`;
}

/** `14:32` (Istanbul time). */
export function formatTime(date: Date | number | string): string {
  const p = trParts(date);
  return `${pad2(p.hours)}:${pad2(p.minutes)}`;
}

/** `08.11.2026 14:32` */
export function formatDateTime(date: Date | number | string): string {
  return `${formatDate(date)} ${formatTime(date)}`;
}

/** `Kasım 2026` */
export function formatMonthYear(date: Date | number | string): string {
  const p = trParts(date);
  return `${MONTHS_TR[p.month]} ${p.year}`;
}

/** `8 Kas` */
export function formatDayMonthShort(date: Date | number | string): string {
  const p = trParts(date);
  return `${p.day} ${MONTHS_TR_SHORT[p.month]}`;
}

function dayIndex(date: Date | number | string): number {
  const p = trParts(date);
  return Math.floor(Date.UTC(p.year, p.month, p.day) / 86_400_000);
}

/** `Bugün 14:32`, `Dün 09:10`, otherwise `05.11.2026`. */
export function formatRelativeDay(
  date: Date | number | string,
  now: Date | number = Date.now(),
): string {
  const diff = dayIndex(now) - dayIndex(date);
  if (diff === 0) return `Bugün ${formatTime(date)}`;
  if (diff === 1) return `Dün ${formatTime(date)}`;
  return formatDate(date);
}

/* ───────────────────────────── Text ───────────────────────────── */

/** Turkish-aware upper case: `i` → `İ`, `ı` → `I` (plain `toUpperCase` gets `i` wrong). */
export function upperTR(text: string): string {
  return text.replace(/i/g, 'İ').replace(/ı/g, 'I').toUpperCase();
}

/* ───────────────────────────── Input ───────────────────────────── */

/**
 * Parses a number typed by the user into a canonical decimal string (`.` separator),
 * or `null` if it is not a number.
 *
 * - A comma is always the decimal separator; dots are then thousands separators: `1.234,56`.
 * - Without a comma, several dots are thousands separators: `1.234.567`.
 * - A single dot followed by exactly three digits after a non-zero integer is a thousands
 *   separator (`1.500` → 1500, Turkish habit); otherwise it is a decimal point (`0.125`, `12.5`).
 */
export function parseDecimalInput(input: string): string | null {
  let s = input
    .trim()
    .replace(/\s/g, '')
    .replace(/[₺$€%]/g, '');
  if (s === '') return null;
  let negative = false;
  if (s.startsWith('-') || s.startsWith('−')) {
    negative = true;
    s = s.slice(1);
  }
  if (!/^[\d.,]+$/.test(s)) return null;

  let normalized: string;
  const commas = (s.match(/,/g) ?? []).length;
  const dots = (s.match(/\./g) ?? []).length;

  if (commas > 1) return null;
  if (commas === 1) {
    const [intPart, frac] = s.split(',');
    if (dots > 0 && !/^\d{1,3}(\.\d{3})+$/.test(intPart)) return null;
    normalized = `${intPart.replace(/\./g, '')}.${frac}`;
  } else if (dots > 1) {
    if (!/^\d{1,3}(\.\d{3})+$/.test(s)) return null;
    normalized = s.replace(/\./g, '');
  } else if (dots === 1) {
    const [intPart, frac] = s.split('.');
    const isThousands = frac.length === 3 && /^[1-9]\d{0,2}$/.test(intPart);
    normalized = isThousands ? `${intPart}${frac}` : `${intPart}.${frac}`;
  } else {
    normalized = s;
  }

  if (normalized.startsWith('.')) normalized = `0${normalized}`;
  if (normalized.endsWith('.')) normalized = normalized.slice(0, -1);
  if (!/^\d+(\.\d+)?$/.test(normalized)) return null;

  const canonical = new D(normalized).toFixed();
  return negative && canonical !== '0' ? `-${canonical}` : canonical;
}

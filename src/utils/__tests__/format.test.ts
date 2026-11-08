import { describe, expect, it } from '@jest/globals';
import { Decimal } from 'decimal.js';

import {
  formatCompact,
  formatDate,
  formatDateTime,
  formatDayMonthShort,
  formatMoney,
  formatMonthYear,
  formatNumber,
  formatPercent,
  formatPrice,
  formatQuantity,
  formatRelativeDay,
  formatTime,
  parseDecimalInput,
  upperTR,
} from '../format';

describe('formatNumber', () => {
  it('groups thousands with dots and uses a decimal comma', () => {
    expect(formatNumber(1284562.4, { minDecimals: 2 })).toBe('1.284.562,40');
    expect(formatNumber(1000)).toBe('1.000');
    expect(formatNumber(999)).toBe('999');
  });

  it('trims trailing zeros beyond minDecimals', () => {
    expect(formatNumber('12.500', { maxDecimals: 4 })).toBe('12,5');
  });

  it('handles negatives and sign modes', () => {
    expect(formatNumber(-1234.5, { minDecimals: 2 })).toBe('-1.234,50');
    expect(formatNumber(5, { sign: 'always' })).toBe('+5');
    expect(formatNumber(0, { sign: 'always' })).toBe('0');
    expect(formatNumber(-0.001, { maxDecimals: 2 })).toBe('0');
  });

  it('accepts strings and Decimal instances without precision loss', () => {
    expect(formatNumber('0.1', { maxDecimals: 2 })).toBe('0,1');
    expect(formatNumber(new Decimal('123456789012345.678'), { maxDecimals: 3 })).toBe(
      '123.456.789.012.345,678',
    );
  });
});

describe('formatMoney', () => {
  it('formats Turkish lira with the symbol in front', () => {
    expect(formatMoney(1284562.4)).toBe('₺1.284.562,40');
    expect(formatMoney('31302.48')).toBe('₺31.302,48');
  });

  it('formats other currencies', () => {
    expect(formatMoney(241.3, { currency: 'USD' })).toBe('$241,30');
    expect(formatMoney(10, { currency: 'EUR' })).toBe('€10,00');
  });

  it('puts the sign before the symbol', () => {
    expect(formatMoney(-31302.48)).toBe('-₺31.302,48');
    expect(formatMoney(12430, { sign: 'always' })).toBe('+₺12.430,00');
    expect(formatMoney(0, { sign: 'always' })).toBe('₺0,00');
    expect(formatMoney(-50, { sign: 'never' })).toBe('₺50,00');
  });

  it('rounds half up', () => {
    expect(formatMoney(0.005)).toBe('₺0,01');
    expect(formatMoney(2.675)).toBe('₺2,68');
  });

  it('abbreviates large values in compact mode', () => {
    expect(formatMoney(1284562.4, { compact: true })).toBe('₺1,28 Mn');
    expect(formatMoney(12430, { compact: true })).toBe('₺12,4 B');
    expect(formatMoney(-2_100_000_000, { compact: true })).toBe('-₺2,1 Mr');
    expect(formatMoney(999.5, { compact: true })).toBe('₺999,50');
  });
});

describe('formatCompact', () => {
  it('uses three significant digits', () => {
    expect(formatCompact(1284562)).toBe('1,28 Mn');
    expect(formatCompact(12430)).toBe('12,4 B');
    expect(formatCompact(127738)).toBe('128 B');
    expect(formatCompact(1000)).toBe('1 B');
    expect(formatCompact(512)).toBe('512');
  });

  it('promotes to the next unit when rounding overflows', () => {
    expect(formatCompact(999_600)).toBe('1 Mn');
  });

  it('supports signs', () => {
    expect(formatCompact(-23162)).toBe('-23,2 B');
    expect(formatCompact(127738, 'always')).toBe('+128 B');
  });
});

describe('formatPercent', () => {
  it('takes a ratio and puts % in front (Turkish style)', () => {
    expect(formatPercent(0.0881)).toBe('%8,81');
    expect(formatPercent(0.2009)).toBe('%20,09');
    expect(formatPercent(1.5)).toBe('%150,00');
  });

  it('puts the sign before %', () => {
    expect(formatPercent(-0.004)).toBe('-%0,40');
    expect(formatPercent(0.012, { sign: 'always' })).toBe('+%1,20');
    expect(formatPercent(0, { sign: 'always' })).toBe('%0,00');
  });

  it('respects decimals', () => {
    expect(formatPercent(0.0313, { decimals: 1 })).toBe('%3,1');
  });
});

describe('formatPrice', () => {
  it('adapts precision to magnitude', () => {
    expect(formatPrice(312.4)).toBe('₺312,40');
    expect(formatPrice(98410, 'USD')).toBe('$98.410,00');
    expect(formatPrice(0.4321, 'USD')).toBe('$0,4321');
    expect(formatPrice(0.00001234, 'USD')).toBe('$0,00001234');
    expect(formatPrice(0.5, 'USD')).toBe('$0,50');
  });
});

describe('formatQuantity', () => {
  it('trims trailing zeros and groups thousands', () => {
    expect(formatQuantity('0.04215000')).toBe('0,04215');
    expect(formatQuantity(1000)).toBe('1.000');
    expect(formatQuantity('0.123456789', 8)).toBe('0,12345679');
  });
});

describe('dates (Europe/Istanbul, UTC+3)', () => {
  const ts = '2026-11-08T11:32:00Z'; // 14:32 in Istanbul

  it('formats dates and times in Istanbul time', () => {
    expect(formatDate(ts)).toBe('08.11.2026');
    expect(formatTime(ts)).toBe('14:32');
    expect(formatDateTime(ts)).toBe('08.11.2026 14:32');
    expect(formatMonthYear(ts)).toBe('Kasım 2026');
    expect(formatDayMonthShort(ts)).toBe('8 Kas');
  });

  it('crosses midnight correctly', () => {
    expect(formatDate('2026-11-08T22:30:00Z')).toBe('09.11.2026');
  });

  it('describes recent days relatively', () => {
    const now = new Date('2026-11-08T15:00:00Z');
    expect(formatRelativeDay(ts, now)).toBe('Bugün 14:32');
    expect(formatRelativeDay('2026-11-07T06:10:00Z', now)).toBe('Dün 09:10');
    expect(formatRelativeDay('2026-11-05T10:00:00Z', now)).toBe('05.11.2026');
  });
});

describe('upperTR', () => {
  it('handles dotted and dotless i', () => {
    expect(upperTR('değer')).toBe('DEĞER');
    expect(upperTR('işlemler')).toBe('İŞLEMLER');
    expect(upperTR('kapalı')).toBe('KAPALI');
  });
});

describe('parseDecimalInput', () => {
  it.each([
    ['1.234,56', '1234.56'],
    ['1234,56', '1234.56'],
    ['0,5', '0.5'],
    [',5', '0.5'],
    ['1.234.567', '1234567'],
    ['1.500', '1500'],
    ['12.5', '12.5'],
    ['0.125', '0.125'],
    ['0,04215', '0.04215'],
    ['1234', '1234'],
    ['₺ 31.302,48', '31302.48'],
    ['-12,5', '-12.5'],
    ['12,', '12'],
  ])('%s → %s', (input, expected) => {
    expect(parseDecimalInput(input)).toBe(expected);
  });

  it.each(['', 'abc', '1,2,3', '12.34.5', '1.23,4,5', '--1'])('rejects %p', (input) => {
    expect(parseDecimalInput(input)).toBeNull();
  });
});

import { dec } from './decimal';
import type { Asset, Transaction } from './types';

export type ValidationCode =
  | 'REQUIRED'
  | 'NOT_A_NUMBER'
  | 'MUST_BE_POSITIVE'
  | 'MUST_NOT_BE_NEGATIVE'
  | 'INVALID_DATE'
  | 'FUTURE_DATE'
  | 'UNKNOWN_ASSET'
  | 'TAX_EXCEEDS_AMOUNT'
  | 'SPLIT_RATIO_ONE';

export interface ValidationIssue {
  field: keyof Transaction;
  code: ValidationCode;
}

const NUMBER = /^-?\d+(\.\d+)?$/;
/** Clock skew allowed for "now" entries before a timestamp counts as being in the future. */
const FUTURE_TOLERANCE_MS = 5 * 60 * 1000;

type NumberRule = 'positive' | 'nonNegative';

function checkNumber(
  issues: ValidationIssue[],
  t: Transaction,
  field: keyof Transaction,
  rule: NumberRule,
  required: boolean,
) {
  const raw = t[field];
  if (raw === undefined || raw === null || raw === '') {
    if (required) issues.push({ field, code: 'REQUIRED' });
    return;
  }
  if (typeof raw !== 'string' || !NUMBER.test(raw)) {
    issues.push({ field, code: 'NOT_A_NUMBER' });
    return;
  }
  const v = dec(raw);
  if (rule === 'positive' && !v.gt(0)) issues.push({ field, code: 'MUST_BE_POSITIVE' });
  if (rule === 'nonNegative' && v.lt(0)) issues.push({ field, code: 'MUST_NOT_BE_NEGATIVE' });
}

/**
 * Field-level checks for a single transaction. Cross-transaction rules (selling more than
 * held, spending more cash than available) are found by replaying the ledger.
 */
export function validateTransaction(
  t: Transaction,
  options: { now?: number; assets?: ReadonlyMap<string, Asset> } = {},
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const time = Date.parse(t.ts);
  if (!t.ts || Number.isNaN(time)) {
    issues.push({ field: 'ts', code: 'INVALID_DATE' });
  } else if (time > (options.now ?? Date.now()) + FUTURE_TOLERANCE_MS) {
    issues.push({ field: 'ts', code: 'FUTURE_DATE' });
  }

  const needsAsset =
    t.type === 'BUY' || t.type === 'SELL' || t.type === 'DIVIDEND' || t.type === 'SPLIT';
  if (needsAsset) {
    if (!t.assetId) issues.push({ field: 'assetId', code: 'REQUIRED' });
    else if (options.assets && !options.assets.has(t.assetId)) {
      issues.push({ field: 'assetId', code: 'UNKNOWN_ASSET' });
    }
  }

  switch (t.type) {
    case 'BUY':
    case 'SELL':
      checkNumber(issues, t, 'quantity', 'positive', true);
      checkNumber(issues, t, 'price', 'nonNegative', true);
      checkNumber(issues, t, 'fee', 'nonNegative', false);
      checkNumber(issues, t, 'fxRate', 'positive', false);
      break;
    case 'DEPOSIT':
    case 'WITHDRAW':
    case 'FEE':
      checkNumber(issues, t, 'amount', 'positive', true);
      break;
    case 'DIVIDEND':
      checkNumber(issues, t, 'amount', 'positive', true);
      checkNumber(issues, t, 'tax', 'nonNegative', false);
      checkNumber(issues, t, 'fxRate', 'positive', false);
      if (
        t.amount &&
        t.tax &&
        NUMBER.test(t.amount) &&
        NUMBER.test(t.tax) &&
        dec(t.tax).gt(dec(t.amount))
      ) {
        issues.push({ field: 'tax', code: 'TAX_EXCEEDS_AMOUNT' });
      }
      break;
    case 'SPLIT':
      checkNumber(issues, t, 'splitRatio', 'positive', true);
      if (t.splitRatio && NUMBER.test(t.splitRatio) && dec(t.splitRatio).eq(1)) {
        issues.push({ field: 'splitRatio', code: 'SPLIT_RATIO_ONE' });
      }
      break;
  }
  return issues;
}

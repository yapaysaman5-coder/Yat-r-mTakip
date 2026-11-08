import { useSettings } from '@/state/settings';
import type { TextVariant } from '@/theme/tokens';
import {
  CURRENCY_SYMBOL,
  formatMoney,
  MASK,
  type CurrencyCode,
  type Numeric,
  type SignMode,
} from '@/utils/format';

import { Text, type TextProps } from './Text';

export interface MoneyProps extends Omit<TextProps, 'children'> {
  value: Numeric;
  currency?: CurrencyCode;
  variant?: TextVariant;
  sign?: SignMode;
  compact?: boolean;
  decimals?: number;
  /** Colour by sign (up / down). */
  colorize?: boolean;
  /** Personal amounts are hidden in privacy mode; set `false` for public data such as prices. */
  sensitive?: boolean;
}

export function Money({
  value,
  currency = 'TRY',
  variant = 'numM',
  sign = 'auto',
  compact,
  decimals,
  colorize,
  sensitive = true,
  tone,
  ...rest
}: MoneyProps) {
  const privacy = useSettings((s) => s.privacyMode);
  const hidden = sensitive && privacy;
  const text = hidden
    ? `${CURRENCY_SYMBOL[currency]}${MASK}`
    : formatMoney(value, { currency, sign, compact, decimals });
  const n = Number(value);
  const autoTone = colorize && !hidden ? (n > 0 ? 'up' : n < 0 ? 'down' : 'secondary') : undefined;
  return (
    <Text
      variant={variant}
      tone={autoTone ?? tone}
      accessibilityLabel={hidden ? 'Gizli tutar' : text}
      {...rest}>
      {text}
    </Text>
  );
}

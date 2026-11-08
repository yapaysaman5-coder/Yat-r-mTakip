import { View, type StyleProp, type ViewStyle } from 'react-native';

import { useSettings } from '@/state/settings';
import { useColors } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';
import { formatMoney, formatPercent, MASK, type CurrencyCode, type Numeric } from '@/utils/format';

import { PressableScale } from './PressableScale';
import { Text } from './Text';
import { Triangle } from './Triangle';

export interface ChangeBadgeProps {
  /** Ratio for `percent` (0.012 = %1,20), amount for `money`. */
  value: Numeric;
  kind?: 'percent' | 'money';
  currency?: CurrencyCode;
  /** Decimals for `money` (default 2). */
  decimals?: number;
  /** `soft` = tinted pill, `plain` = coloured text only, `hero` = glass pill on the gradient card. */
  variant?: 'soft' | 'plain' | 'hero';
  size?: 'sm' | 'md';
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function ChangeBadge({
  value,
  kind = 'percent',
  currency = 'TRY',
  decimals = 2,
  variant = 'soft',
  size = 'sm',
  onPress,
  style,
}: ChangeBadgeProps) {
  const colors = useColors();
  const privacy = useSettings((s) => s.privacyMode);
  const n = Number(value);
  const dir = n > 0 ? 'up' : n < 0 ? 'down' : 'flat';

  const fg =
    variant === 'hero'
      ? colors.heroText
      : dir === 'up'
        ? colors.up
        : dir === 'down'
          ? colors.down
          : colors.textSecondary;
  const bg =
    variant === 'plain'
      ? 'transparent'
      : variant === 'hero'
        ? colors.heroGlass
        : dir === 'up'
          ? colors.upSoft
          : dir === 'down'
            ? colors.downSoft
            : colors.neutralSoft;

  const label =
    kind === 'money'
      ? privacy
        ? MASK
        : formatMoney(Math.abs(n), { currency, decimals })
      : formatPercent(Math.abs(n));

  const body = (
    <>
      {dir !== 'flat' ? (
        <Triangle direction={dir} color={fg} size={size === 'sm' ? 8 : 10} />
      ) : null}
      <Text variant={size === 'sm' ? 'numS' : 'numM'} color={fg}>
        {label}
      </Text>
    </>
  );

  const container: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    alignSelf: 'flex-start',
    paddingHorizontal: variant === 'plain' ? 0 : size === 'sm' ? space.sm : space.md - 2,
    paddingVertical: variant === 'plain' ? 0 : size === 'sm' ? 3 : 5,
    borderRadius: radius.pill,
    backgroundColor: bg,
  };

  const a11y = `${dir === 'up' ? 'Artış' : dir === 'down' ? 'Düşüş' : 'Değişim yok'} ${label}`;

  if (onPress) {
    return (
      <PressableScale
        onPress={onPress}
        haptic="selection"
        scaleTo={0.92}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={a11y}
        style={[container, style]}>
        {body}
      </PressableScale>
    );
  }
  return (
    <View accessible accessibilityLabel={a11y} style={[container, style]}>
      {body}
    </View>
  );
}

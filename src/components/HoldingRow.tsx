import { View } from 'react-native';

import type { DemoHolding } from '@/demo/data';
import { holdingCostTRY, holdingDailyChangeTRY, holdingValueTRY } from '@/demo/data';
import { useSettings } from '@/state/settings';
import { useColors } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';
import { AssetAvatar, ChangeBadge, Money, PressableScale, Sparkline, Text } from '@/ui';
import { formatPrice, formatQuantity } from '@/utils/format';

/**
 * One holding in the portfolio list. Tapping the change badge cycles
 * daily % → daily ₺ → total % (remembered in settings).
 * Swipe actions (edit / buy / sell / delete) arrive in Phase 5.
 */
export function HoldingRow({ holding, onPress }: { holding: DemoHolding; onPress?: () => void }) {
  const colors = useColors();
  const changeDisplay = useSettings((s) => s.changeDisplay);
  const cycle = useSettings((s) => s.cycleChangeDisplay);

  const value = holdingValueTRY(holding);
  const dailyAmount = holdingDailyChangeTRY(holding);
  const dailyRatio = holding.price / holding.prevClose - 1;
  const totalRatio = value / holdingCostTRY(holding) - 1;
  const trendColor =
    holding.spark[holding.spark.length - 1] >= holding.spark[0] ? colors.up : colors.down;

  const unit = holding.market === 'crypto' ? '' : ' ad';
  const subtitle = `${formatQuantity(holding.quantity, 6)}${unit} · ${formatPrice(holding.price, holding.currency)}`;

  return (
    <PressableScale
      onPress={onPress}
      haptic="selection"
      scaleTo={0.985}
      accessibilityRole="button"
      accessibilityLabel={`${holding.symbol}, ${holding.name}`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.md,
        paddingVertical: space.md,
      }}>
      <AssetAvatar symbol={holding.symbol} market={holding.market} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {holding.symbol}
        </Text>
        <Text variant="caption" tone="secondary" numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      <Sparkline values={holding.spark} color={trendColor} width={52} height={26} />
      <View style={{ alignItems: 'flex-end', gap: 4, minWidth: 108 }}>
        <Money value={value} variant="numM" />
        {changeDisplay === 'dailyAmount' ? (
          <ChangeBadge
            value={dailyAmount}
            kind="money"
            onPress={cycle}
            style={{ alignSelf: 'flex-end' }}
          />
        ) : (
          <ChangeBadge
            value={changeDisplay === 'dailyPercent' ? dailyRatio : totalRatio}
            onPress={cycle}
            style={{ alignSelf: 'flex-end' }}
          />
        )}
      </View>
    </PressableScale>
  );
}

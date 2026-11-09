import { Pencil, ShoppingCart, Trash2, TrendingDown, type LucideIcon } from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import type { Holding } from '@/data/view/portfolioView';
import { haptics } from '@/lib/haptics';
import { useSettings } from '@/state/settings';
import { useColors } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';
import { AssetAvatar, ChangeBadge, Money, PressableScale, Sparkline, Text } from '@/ui';
import { formatPrice, formatQuantity } from '@/utils/format';

export interface HoldingActions {
  onDetail: () => void;
  onBuy: () => void;
  onSell: () => void;
  onDelete: () => void;
  onMenu: () => void;
}

/**
 * One holding in the portfolio list (docs/01-PROJE-DOKUMANI.md §6.2).
 * - Tap: detail. Long press: the action menu.
 * - Swipe right: Düzenle (detail) and Al. Swipe left: Sat and Sil.
 * - Tapping the change badge cycles daily % → daily ₺ → total %.
 * - The row flashes green or red when its price moves.
 */
export function HoldingRow({ holding, actions }: { holding: Holding; actions: HoldingActions }) {
  const colors = useColors();
  const changeDisplay = useSettings((s) => s.changeDisplay);
  const cycle = useSettings((s) => s.cycleChangeDisplay);
  const swipe = useRef<SwipeableMethods>(null);

  const value = holding.valueTRY;
  const dailyAmount = holding.dailyChangeTRY;
  const dailyRatio = holding.prevClose > 0 ? holding.price / holding.prevClose - 1 : 0;
  const totalRatio = holding.costTRY > 0 ? value / holding.costTRY - 1 : 0;
  const trendColor =
    holding.spark[holding.spark.length - 1] >= holding.spark[0] ? colors.up : colors.down;

  // Price tick: a short flash in the direction of the move.
  const flash = useSharedValue(0);
  const flashColor = useSharedValue(colors.up);
  const lastPrice = useRef(holding.price);
  useEffect(() => {
    if (holding.price !== lastPrice.current) {
      flashColor.set(holding.price > lastPrice.current ? colors.upSoft : colors.downSoft);
      flash.set(withSequence(withTiming(1, { duration: 120 }), withTiming(0, { duration: 900 })));
      lastPrice.current = holding.price;
    }
  }, [holding.price, flash, flashColor, colors.upSoft, colors.downSoft]);
  const flashStyle = useAnimatedStyle(() => ({
    opacity: flash.get(),
    backgroundColor: flashColor.get(),
  }));

  const unit = holding.market === 'crypto' ? '' : ' ad';
  const subtitle = `${formatQuantity(holding.quantity, 6)}${unit} · ${formatPrice(holding.price, holding.currency)}`;
  const run = (fn: () => void) => () => {
    swipe.current?.close();
    fn();
  };

  return (
    <ReanimatedSwipeable
      ref={swipe}
      friction={1.6}
      leftThreshold={40}
      rightThreshold={40}
      overshootLeft={false}
      overshootRight={false}
      onSwipeableWillOpen={() => haptics.selection()}
      renderLeftActions={() => (
        <View style={{ flexDirection: 'row' }}>
          <Action
            icon={Pencil}
            label="Düzenle"
            color={colors.accent}
            bg={colors.accentSoft}
            onPress={run(actions.onDetail)}
          />
          <Action
            icon={ShoppingCart}
            label="Al"
            color={colors.up}
            bg={colors.upSoft}
            onPress={run(actions.onBuy)}
          />
        </View>
      )}
      renderRightActions={() => (
        <View style={{ flexDirection: 'row' }}>
          <Action
            icon={TrendingDown}
            label="Sat"
            color={colors.down}
            bg={colors.downSoft}
            onPress={run(actions.onSell)}
          />
          <Action
            icon={Trash2}
            label="Sil"
            color={colors.textOnAccent}
            bg={colors.down}
            onPress={run(actions.onDelete)}
          />
        </View>
      )}>
      <PressableScale
        onPress={actions.onDetail}
        onLongPress={() => {
          haptics.medium();
          actions.onMenu();
        }}
        delayLongPress={350}
        haptic="selection"
        scaleTo={0.985}
        accessibilityRole="button"
        accessibilityLabel={`${holding.symbol}, ${holding.name}`}
        accessibilityHint="Ayrıntı için dokun, işlemler için basılı tut veya yana kaydır"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.md,
          paddingVertical: space.md,
          backgroundColor: colors.surface,
        }}>
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              left: -space.sm,
              right: -space.sm,
              top: 2,
              bottom: 2,
              borderRadius: radius.md,
            },
            flashStyle,
          ]}
        />
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
    </ReanimatedSwipeable>
  );
}

function Action({
  icon: Icon,
  label,
  color,
  bg,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  color: string;
  bg: string;
  onPress: () => void;
}) {
  return (
    <PressableScale
      onPress={onPress}
      haptic="light"
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{
        width: 72,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        backgroundColor: bg,
      }}>
      <Icon size={20} color={color} strokeWidth={2.4} />
      <Text variant="caption" color={color}>
        {label}
      </Text>
    </PressableScale>
  );
}

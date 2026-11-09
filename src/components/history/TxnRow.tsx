import { Pencil, Trash2 } from 'lucide-react-native';
import { useRef } from 'react';
import { View } from 'react-native';
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';

import { SwipeAction } from '@/components/SwipeAction';
import { txnVisual } from '@/components/txnVisual';
import type { HistoryItem } from '@/data/view/portfolioView';
import { tr } from '@/i18n/tr';
import { haptics } from '@/lib/haptics';
import { useColors } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';
import { ChangeBadge, IconWell, Money, PressableScale, Text } from '@/ui';
import { formatPrice, formatQuantity, formatRelativeDay } from '@/utils/format';

/**
 * One record in the history lists. Manual records can be swiped: right → Düzenle,
 * left → Sil (with undo). Automatic records follow the record they belong to, so they
 * only open their details.
 */
export function TxnRow({
  txn,
  onPress,
  onEdit,
  onDelete,
  trailing,
  background,
}: {
  txn: HistoryItem;
  onPress: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  /** Replaces the amount on the right (e.g. the realized P/L). */
  trailing?: React.ReactNode;
  /** Row colour (the card's; swiping uncovers the actions behind it). */
  background?: string;
}) {
  const colors = useColors();
  const swipe = useRef<SwipeableMethods>(null);
  const v = txnVisual(txn.type, colors);
  const label = txn.isAuto ? `${tr.txn[txn.type]} (${tr.txn.auto})` : tr.txn[txn.type];
  const title = txn.symbol ? `${label} · ${txn.symbol}` : label;
  const detail =
    txn.quantity !== undefined && txn.price !== undefined
      ? `${formatQuantity(txn.quantity)} × ${formatPrice(txn.price, txn.currency)} · `
      : '';
  const swipeable = !!txn.source && (onEdit || onDelete);
  const run = (fn?: () => void) => () => {
    swipe.current?.close();
    fn?.();
  };

  const row = (
    <PressableScale
      haptic="selection"
      scaleTo={0.985}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={swipeable ? 'Düzenlemek için sağa, silmek için sola kaydır' : undefined}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.md,
        paddingVertical: space.md,
        backgroundColor: background ?? colors.surface,
      }}>
      <IconWell background={v.bg} size={40}>
        <v.icon size={19} color={v.color} strokeWidth={2.4} />
      </IconWell>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="callout" numberOfLines={1}>
          {title}
        </Text>
        <Text variant="caption" tone="secondary" numberOfLines={1}>
          {detail}
          {formatRelativeDay(txn.ts, new Date())}
        </Text>
      </View>
      {trailing ?? (
        <View style={{ alignItems: 'flex-end', gap: 3 }}>
          <Money value={txn.amountTRY} variant="numM" sign="always" colorize={txn.amountTRY > 0} />
          {txn.realizedRatio !== undefined ? <ChangeBadge value={txn.realizedRatio} /> : null}
        </View>
      )}
    </PressableScale>
  );

  if (!swipeable) return row;
  return (
    <ReanimatedSwipeable
      ref={swipe}
      friction={1.6}
      leftThreshold={40}
      rightThreshold={40}
      overshootLeft={false}
      overshootRight={false}
      onSwipeableWillOpen={() => haptics.selection()}
      renderLeftActions={
        onEdit
          ? () => (
              <SwipeAction
                icon={Pencil}
                label="Düzenle"
                color={colors.accent}
                bg={colors.accentSoft}
                onPress={run(onEdit)}
              />
            )
          : undefined
      }
      renderRightActions={
        onDelete
          ? () => (
              <SwipeAction
                icon={Trash2}
                label="Sil"
                color={colors.textOnAccent}
                bg={colors.down}
                onPress={run(onDelete)}
              />
            )
          : undefined
      }>
      {row}
    </ReanimatedSwipeable>
  );
}

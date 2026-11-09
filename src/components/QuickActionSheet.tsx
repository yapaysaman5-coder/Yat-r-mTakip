import { useRouter } from 'expo-router';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  HandCoins,
  ShoppingCart,
  Split,
  TrendingDown,
  type LucideIcon,
} from 'lucide-react-native';
import { View } from 'react-native';

import { tr } from '@/i18n/tr';
import { useColors } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';
import { IconWell, ListRow, PressableScale, Sheet, Text } from '@/ui';

/** Sheet opened by the "+" button: buy / sell first, then cash movements. */
export function QuickActionSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const colors = useColors();
  const router = useRouter();

  const cash = (type: 'DEPOSIT' | 'WITHDRAW') => {
    onClose();
    router.push({ pathname: '/islem/nakit', params: { type } });
  };
  const trade = (side: 'BUY' | 'SELL') => {
    onClose();
    router.push({ pathname: '/islem/al-sat', params: { side } });
  };
  const go = (pathname: '/islem/temettu' | '/islem/bolunme') => {
    onClose();
    router.push(pathname);
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={tr.quick.title} subtitle={tr.quick.subtitle}>
      <View style={{ flexDirection: 'row', gap: space.md, marginBottom: space.md }}>
        <BigTile
          label={tr.quick.buy}
          hint={tr.quick.buyHint}
          icon={ShoppingCart}
          color={colors.up}
          background={colors.upSoft}
          onPress={() => trade('BUY')}
        />
        <BigTile
          label={tr.quick.sell}
          hint={tr.quick.sellHint}
          icon={TrendingDown}
          color={colors.down}
          background={colors.downSoft}
          onPress={() => trade('SELL')}
        />
      </View>
      <View
        style={{
          backgroundColor: colors.surfaceAlt,
          borderRadius: radius.lg,
          paddingHorizontal: space.lg,
        }}>
        <ListRow
          title={tr.quick.deposit}
          subtitle={tr.quick.depositHint}
          leading={
            <IconWell background={colors.accentSoft}>
              <ArrowDownToLine size={18} color={colors.accent} strokeWidth={2.4} />
            </IconWell>
          }
          showChevron
          onPress={() => cash('DEPOSIT')}
        />
        <ListRow
          title={tr.quick.withdraw}
          subtitle={tr.quick.withdrawHint}
          leading={
            <IconWell background={colors.warningSoft}>
              <ArrowUpFromLine size={18} color={colors.warning} strokeWidth={2.4} />
            </IconWell>
          }
          showChevron
          onPress={() => cash('WITHDRAW')}
        />
        <ListRow
          title={tr.quick.dividend}
          subtitle={tr.quick.dividendHint}
          leading={
            <IconWell background={colors.accent2Soft}>
              <HandCoins size={18} color={colors.accent2} strokeWidth={2.4} />
            </IconWell>
          }
          showChevron
          onPress={() => go('/islem/temettu')}
        />
        <ListRow
          title="Bölünme / Bedelsiz"
          subtitle="Adetin arttığı sermaye artırımı"
          leading={
            <IconWell background={colors.neutralSoft}>
              <Split size={18} color={colors.textSecondary} strokeWidth={2.4} />
            </IconWell>
          }
          showChevron
          onPress={() => go('/islem/bolunme')}
        />
      </View>
    </Sheet>
  );
}

function BigTile({
  label,
  hint,
  icon: Icon,
  color,
  background,
  onPress,
}: {
  label: string;
  hint: string;
  icon: LucideIcon;
  color: string;
  background: string;
  onPress: () => void;
}) {
  return (
    <PressableScale
      onPress={onPress}
      haptic="medium"
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{
        flex: 1,
        borderRadius: radius.lg,
        backgroundColor: background,
        padding: space.lg,
        gap: space.md,
      }}>
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 16,
          backgroundColor: color,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Icon size={22} color="#FFFFFF" strokeWidth={2.5} />
      </View>
      <View style={{ gap: 2 }}>
        <Text variant="title3" color={color}>
          {label}
        </Text>
        <Text variant="caption" tone="secondary">
          {hint}
        </Text>
      </View>
    </PressableScale>
  );
}

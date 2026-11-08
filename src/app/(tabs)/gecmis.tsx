import {
  ArrowDownToLine,
  ArrowUpFromLine,
  CalendarDays,
  HandCoins,
  ReceiptText,
  Search,
  ShoppingCart,
  TrendingDown,
  Trophy,
  Wallet,
  type LucideIcon,
} from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { PreviewNote } from '@/components/PreviewNote';
import { DEMO_TXNS, type DemoTxn, type DemoTxnType } from '@/demo/data';
import { tr } from '@/i18n/tr';
import { useTheme } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/types';
import { GUTTER, space } from '@/theme/tokens';
import {
  Card,
  ChangeBadge,
  Chip,
  EmptyState,
  IconButton,
  IconWell,
  Money,
  PressableScale,
  Screen,
  SegmentedControl,
  TabHeader,
  Text,
  toast,
} from '@/ui';
import {
  formatMonthYear,
  formatPrice,
  formatQuantity,
  formatRelativeDay,
  upperTR,
} from '@/utils/format';

type Section = 'txns' | 'realized' | 'cash' | 'statement';
type Filter = 'all' | 'BUY' | 'SELL' | 'CASH' | 'DIVIDEND';

const NOW = new Date('2026-11-08T15:00:00Z');

export default function HistoryScreen() {
  const [section, setSection] = useState<Section>('txns');
  return (
    <Screen
      withTabBar
      header={
        <TabHeader
          title="Geçmiş"
          right={
            <IconButton
              icon={Search}
              accessibilityLabel="İşlem ara"
              onPress={() => toast.show({ message: 'Arama Faz 7’de geliyor ✨' })}
            />
          }
        />
      }>
      <SegmentedControl
        value={section}
        onChange={setSection}
        options={[
          { key: 'txns', label: 'İşlemler' },
          { key: 'realized', label: 'K/Z' },
          { key: 'cash', label: 'Nakit' },
          { key: 'statement', label: 'Ekstre' },
        ]}
      />
      {section === 'txns' ? <Transactions /> : null}
      {section === 'realized' ? (
        <EmptyState
          icon={Trophy}
          title="Gerçekleşen Kâr / Zarar"
          message="Kapanan satışların alış maliyeti, satış tutarı, K/Z ve elde tutma süresi burada listelenecek. (Faz 7)"
        />
      ) : null}
      {section === 'cash' ? (
        <EmptyState
          icon={Wallet}
          title="Nakit Hareketleri"
          message="Para yatırma, çekme, temettü ve komisyon toplamları burada olacak. (Faz 7)"
        />
      ) : null}
      {section === 'statement' ? (
        <EmptyState
          icon={ReceiptText}
          title="Aylık Ekstre"
          message="Her ay için ay başı değer, giren-çıkan para, piyasa K/Z ve ay sonu değer. (Faz 7)"
        />
      ) : null}
    </Screen>
  );
}

function Transactions() {
  const [filter, setFilter] = useState<Filter>('all');
  const visible = DEMO_TXNS.filter((t) => {
    if (filter === 'all') return true;
    if (filter === 'CASH') return t.type === 'DEPOSIT' || t.type === 'WITHDRAW';
    return t.type === filter;
  });

  const groups = new Map<string, DemoTxn[]>();
  for (const t of visible) {
    const key = formatMonthYear(t.ts);
    groups.set(key, [...(groups.get(key) ?? []), t]);
  }

  return (
    <View style={{ gap: space.lg }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -GUTTER }}
        contentContainerStyle={{ gap: space.sm, paddingHorizontal: GUTTER }}>
        <Chip label="Tümü" selected={filter === 'all'} onPress={() => setFilter('all')} />
        <Chip label="Alış" selected={filter === 'BUY'} onPress={() => setFilter('BUY')} />
        <Chip label="Satış" selected={filter === 'SELL'} onPress={() => setFilter('SELL')} />
        <Chip label="Para" selected={filter === 'CASH'} onPress={() => setFilter('CASH')} />
        <Chip
          label="Temettü"
          selected={filter === 'DIVIDEND'}
          onPress={() => setFilter('DIVIDEND')}
        />
        <Chip
          icon={CalendarDays}
          accessibilityLabel="Tarih aralığı"
          onPress={() => toast.show({ message: 'Tarih filtresi Faz 7’de geliyor ✨' })}
        />
      </ScrollView>
      <PreviewNote />
      {[...groups.entries()].map(([month, txns]) => {
        const net = txns.reduce((s, t) => s + t.amountTRY, 0);
        return (
          <View key={month} style={{ gap: space.sm }}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
              <Text variant="overline" tone="tertiary">
                {upperTR(month)}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
                <Text variant="caption" tone="tertiary">
                  Net
                </Text>
                <Money value={net} variant="numS" sign="always" tone="secondary" />
              </View>
            </View>
            <Card padding={0} style={{ paddingHorizontal: space.lg, paddingVertical: space.xs }}>
              {txns.map((t, i) => (
                <View key={t.id}>
                  {i > 0 ? <Separator /> : null}
                  <TxnRow txn={t} />
                </View>
              ))}
            </Card>
          </View>
        );
      })}
    </View>
  );
}

function Separator() {
  const { colors } = useTheme();
  return <View style={{ height: 1, backgroundColor: colors.border, marginLeft: 52 }} />;
}

function txnVisual(
  type: DemoTxnType,
  c: ThemeColors,
): { icon: LucideIcon; color: string; bg: string } {
  switch (type) {
    case 'BUY':
      return { icon: ShoppingCart, color: c.up, bg: c.upSoft };
    case 'SELL':
      return { icon: TrendingDown, color: c.down, bg: c.downSoft };
    case 'DEPOSIT':
      return { icon: ArrowDownToLine, color: c.accent, bg: c.accentSoft };
    case 'WITHDRAW':
      return { icon: ArrowUpFromLine, color: c.warning, bg: c.warningSoft };
    case 'DIVIDEND':
      return { icon: HandCoins, color: c.accent2, bg: c.accent2Soft };
  }
}

function TxnRow({ txn }: { txn: DemoTxn }) {
  const { colors } = useTheme();
  const v = txnVisual(txn.type, colors);
  const title = txn.symbol ? `${tr.txn[txn.type]} · ${txn.symbol}` : tr.txn[txn.type];
  const detail =
    txn.quantity !== undefined && txn.price !== undefined
      ? `${formatQuantity(txn.quantity)} × ${formatPrice(txn.price, txn.currency)} · `
      : '';
  return (
    <PressableScale
      haptic="selection"
      scaleTo={0.985}
      onPress={() => toast.show({ message: 'İşlem detayı ve düzenleme Faz 7’de geliyor ✨' })}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.md,
        paddingVertical: space.md,
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
          {formatRelativeDay(txn.ts, NOW)}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 3 }}>
        <Money value={txn.amountTRY} variant="numM" sign="always" colorize={txn.amountTRY > 0} />
        {txn.realizedRatio !== undefined ? <ChangeBadge value={txn.realizedRatio} /> : null}
      </View>
    </PressableScale>
  );
}

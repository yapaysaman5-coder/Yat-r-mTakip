import { CalendarDays, ReceiptText, Search, Trophy, Wallet } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { EmptyPortfolio } from '@/components/EmptyPortfolio';
import { PreviewNote } from '@/components/PreviewNote';
import { TxnDetailSheet } from '@/components/TxnDetailSheet';
import { txnVisual } from '@/components/txnVisual';
import type { HistoryItem } from '@/data/view/portfolioView';
import { tr } from '@/i18n/tr';
import { usePortfolioView } from '@/state/portfolio';
import { useTheme } from '@/theme/ThemeProvider';
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
  const view = usePortfolioView();
  const [filter, setFilter] = useState<Filter>('all');
  const [selected, setSelected] = useState<HistoryItem | null>(null);
  if (view.empty) return <EmptyPortfolio />;
  const visible = view.history.filter((t) => {
    if (t.type === 'SPLIT') return false;
    if (filter === 'all') return true;
    if (filter === 'CASH') return t.type === 'DEPOSIT' || t.type === 'WITHDRAW';
    return t.type === filter;
  });

  const groups = new Map<string, HistoryItem[]>();
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
      {view.isDemo ? <PreviewNote /> : null}
      <TxnDetailSheet item={selected} onClose={() => setSelected(null)} />
      {visible.length === 0 ? (
        <Text variant="footnote" tone="tertiary" align="center">
          Bu filtrede kayıt yok.
        </Text>
      ) : null}
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
                  <TxnRow txn={t} onPress={() => setSelected(t)} />
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

function TxnRow({ txn, onPress }: { txn: HistoryItem; onPress: () => void }) {
  const { colors } = useTheme();
  const v = txnVisual(txn.type, colors);
  const label = txn.isAuto ? `${tr.txn[txn.type]} (${tr.txn.auto})` : tr.txn[txn.type];
  const title = txn.symbol ? `${label} · ${txn.symbol}` : label;
  const detail =
    txn.quantity !== undefined && txn.price !== undefined
      ? `${formatQuantity(txn.quantity)} × ${formatPrice(txn.price, txn.currency)} · `
      : '';
  return (
    <PressableScale
      haptic="selection"
      scaleTo={0.985}
      onPress={onPress}
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
          {formatRelativeDay(txn.ts, new Date())}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 3 }}>
        <Money value={txn.amountTRY} variant="numM" sign="always" colorize={txn.amountTRY > 0} />
        {txn.realizedRatio !== undefined ? <ChangeBadge value={txn.realizedRatio} /> : null}
      </View>
    </PressableScale>
  );
}

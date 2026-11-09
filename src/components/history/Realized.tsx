import { Trophy } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { TxnDetailSheet } from '@/components/TxnDetailSheet';
import { buildRealized, holdingText, type RealizedTotals } from '@/data/view/historyView';
import type { HistoryItem } from '@/data/view/portfolioView';
import { trDay } from '@/domain';
import { usePortfolioView } from '@/state/portfolio';
import { useTheme } from '@/theme/ThemeProvider';
import { GUTTER, radius, space } from '@/theme/tokens';
import { Card, ChangeBadge, Chip, EmptyState, Money, Text } from '@/ui';
import { formatMoney, formatPercent } from '@/utils/format';

import { TxnRow } from './TxnRow';

/**
 * Gerçekleşen K/Z (docs/01-PROJE-DOKUMANI.md §6.5): closed sales with cost, proceeds, P/L and
 * holding period; the year's total and the share of winning sales on top.
 */
export function Realized() {
  const { colors } = useTheme();
  const view = usePortfolioView();
  const [year, setYear] = useState<string | null>(null);
  const [selected, setSelected] = useState<HistoryItem | null>(null);
  const r = buildRealized(view);

  if (r.items.length === 0) {
    return (
      <EmptyState
        icon={Trophy}
        title="Henüz satış yok"
        message="Bir varlığı sattığında alış maliyeti, satış tutarı, kâr/zarar ve elde tutma süresi burada listelenir."
      />
    );
  }

  const totals: RealizedTotals = (year && r.years.find((y) => y.year === year)) || r.total;
  const items = year ? r.items.filter((i) => trDay(i.item.ts).startsWith(year)) : r.items;

  return (
    <View style={{ gap: space.lg }}>
      {r.years.length > 1 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginHorizontal: -GUTTER }}
          contentContainerStyle={{ gap: space.sm, paddingHorizontal: GUTTER }}>
          <Chip label="Tüm yıllar" selected={!year} onPress={() => setYear(null)} />
          {r.years.map((y) => (
            <Chip
              key={y.year}
              label={y.year}
              selected={year === y.year}
              onPress={() => setYear(y.year)}
            />
          ))}
        </ScrollView>
      ) : null}

      <Card style={{ gap: space.md }}>
        <Text variant="overline" tone="secondary">
          {year ? `${year} · GERÇEKLEŞEN K/Z` : 'GERÇEKLEŞEN K/Z'}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <Money value={totals.pnl} variant="numXL" colorize sign="always" />
          {totals.cost > 0 ? <ChangeBadge value={totals.pnl / totals.cost} size="md" /> : null}
        </View>
        {totals.winRate !== null ? (
          <View style={{ gap: space.xs }}>
            <View
              style={{
                flexDirection: 'row',
                height: 8,
                borderRadius: radius.pill,
                overflow: 'hidden',
                backgroundColor: colors.surfaceAlt,
              }}>
              <View style={{ flex: totals.wins, backgroundColor: colors.up }} />
              <View style={{ flex: totals.losses, backgroundColor: colors.down }} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text variant="caption" tone="up">
                {totals.wins} kazanan
              </Text>
              <Text variant="caption" tone="secondary">
                başarı {formatPercent(totals.winRate, { decimals: 0 })}
              </Text>
              <Text variant="caption" tone="down">
                {totals.losses} kaybeden
              </Text>
            </View>
          </View>
        ) : null}
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <Stat label="Satış" value={`${totals.count} işlem`} />
          <Stat label="Satış tutarı" value={formatMoney(totals.proceeds, { decimals: 0 })} />
          <Stat
            label="Ort. elde tutma"
            value={totals.avgHoldingDays !== null ? holdingText(totals.avgHoldingDays) : '—'}
          />
        </View>
      </Card>

      <TxnDetailSheet item={selected} onClose={() => setSelected(null)} />
      <Card padding={0} style={{ paddingHorizontal: space.lg, paddingVertical: space.xs }}>
        {items.map((i, k) => (
          <View key={i.item.id}>
            {k > 0 ? (
              <View style={{ height: 1, backgroundColor: colors.border, marginLeft: 52 }} />
            ) : null}
            <TxnRow
              txn={i.item}
              onPress={() => setSelected(i.item)}
              trailing={
                <View style={{ alignItems: 'flex-end', gap: 3 }}>
                  <Money value={i.pnlTRY} variant="numM" sign="always" colorize />
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
                    <Text variant="caption" tone="tertiary">
                      {holdingText(i.holdingDays)}
                    </Text>
                    {i.ratio !== null ? <ChangeBadge value={i.ratio} /> : null}
                  </View>
                </View>
              }
            />
          </View>
        ))}
      </Card>
      <Text variant="caption" tone="tertiary">
        Maliyet, alış günlerinin kuruyla TL’dir; komisyonlar maliyete ve satış tutarına dahildir.
        Elde tutma süresi, satılan adetlerin ortalama süresidir (önce en eski alışlar).
      </Text>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.surfaceAlt,
        borderRadius: radius.md,
        padding: space.sm,
        gap: 2,
      }}>
      <Text variant="caption" tone="secondary" numberOfLines={1}>
        {label}
      </Text>
      <Text variant="numS" numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

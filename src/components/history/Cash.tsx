import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Coins,
  Landmark,
  Receipt,
  Wallet,
  type LucideIcon,
} from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { EmptyPortfolio } from '@/components/EmptyPortfolio';
import { TxnDetailSheet, useTxnActions } from '@/components/TxnDetailSheet';
import { buildCash } from '@/data/view/historyView';
import type { HistoryItem } from '@/data/view/portfolioView';
import { usePortfolioView } from '@/state/portfolio';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';
import { Card, IconWell, Money, SectionHeader, Text } from '@/ui';
import { PriceChart } from '@/ui/charts/PriceChart';
import { formatDate, formatMoney } from '@/utils/format';

import { TxnRow } from './TxnRow';

const SHOWN = 30;

/**
 * Nakit Hareketleri (docs/01-PROJE-DOKUMANI.md §6.5): money in and out, dividends, commissions
 * and account fees, net invested over time and by year.
 */
export function Cash() {
  const { colors } = useTheme();
  const view = usePortfolioView();
  const actions = useTxnActions();
  const [selected, setSelected] = useState<HistoryItem | null>(null);
  const [all, setAll] = useState(false);
  if (view.empty) return <EmptyPortfolio />;
  const c = buildCash(view);
  const t = c.total;
  const tiles: {
    label: string;
    value: number;
    note?: string;
    icon: LucideIcon;
    color: string;
    bg: string;
  }[] = [
    {
      label: 'Yatırılan',
      value: t.deposited,
      note:
        t.depositedAuto > 0
          ? `${formatMoney(t.depositedAuto, { decimals: 0 })} otomatik`
          : undefined,
      icon: ArrowDownToLine,
      color: colors.accent,
      bg: colors.accentSoft,
    },
    {
      label: 'Çekilen',
      value: t.withdrawn,
      icon: ArrowUpFromLine,
      color: colors.warning,
      bg: colors.warningSoft,
    },
    {
      label: 'Temettü (net)',
      value: t.dividends,
      note: t.dividendTax > 0 ? `stopaj ${formatMoney(t.dividendTax, { decimals: 0 })}` : undefined,
      icon: Coins,
      color: colors.up,
      bg: colors.upSoft,
    },
    {
      label: 'Komisyon',
      value: t.commissions,
      note: 'maliyete dahil',
      icon: Receipt,
      color: colors.accent2,
      bg: colors.accent2Soft,
    },
    {
      label: 'Hesap ücretleri',
      value: t.accountFees,
      icon: Landmark,
      color: colors.down,
      bg: colors.downSoft,
    },
    {
      label: 'Nakit',
      value: view.summary.cash,
      icon: Wallet,
      color: colors.market.cash,
      bg: colors.upSoft,
    },
  ];
  const ni = c.netInvested;
  const items = all ? c.items : c.items.slice(0, SHOWN);

  return (
    <View style={{ gap: space.lg }}>
      <Card style={{ gap: space.md }}>
        <View
          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text variant="overline" tone="secondary">
            NET YATIRILAN
          </Text>
          <Money value={view.summary.netInvested} variant="numL" />
        </View>
        {ni.values.length > 1 ? (
          <PriceChart
            values={ni.values}
            height={120}
            accessibilityLabel={`Net yatırılan para: ${formatDate(`${ni.dates[0]}T12:00:00Z`)} ile bugün arası`}
          />
        ) : null}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {tiles.map((tile) => (
            <View
              key={tile.label}
              style={{
                flexBasis: '47%',
                flexGrow: 1,
                backgroundColor: colors.surfaceAlt,
                borderRadius: radius.md,
                padding: space.md,
                gap: 4,
              }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                <IconWell background={tile.bg} size={26}>
                  <tile.icon size={14} color={tile.color} strokeWidth={2.5} />
                </IconWell>
                <Text variant="caption" tone="secondary" numberOfLines={1}>
                  {tile.label}
                </Text>
              </View>
              <Money value={tile.value} variant="numM" />
              {tile.note ? (
                <Text variant="caption" tone="tertiary" numberOfLines={1}>
                  {tile.note}
                </Text>
              ) : null}
            </View>
          ))}
        </View>
      </Card>

      {c.years.length > 0 ? (
        <Card style={{ gap: space.sm }}>
          <SectionHeader title="YILLARA GÖRE" />
          <View style={{ flexDirection: 'row', paddingVertical: space.xs }}>
            {['Yıl', 'Giren', 'Çıkan', 'Temettü', 'Masraf'].map((h, i) => (
              <Text
                key={h}
                variant="caption"
                tone="tertiary"
                align={i === 0 ? 'left' : 'right'}
                style={{ flex: i === 0 ? 0.7 : 1 }}>
                {h}
              </Text>
            ))}
          </View>
          {c.years.map((y) => (
            <View
              key={y.year}
              style={{
                flexDirection: 'row',
                paddingVertical: space.sm,
                borderTopWidth: 1,
                borderTopColor: colors.border,
              }}>
              <Text variant="numS" style={{ flex: 0.7 }}>
                {y.year}
              </Text>
              {[y.deposited, y.withdrawn, y.dividends, y.commissions + y.accountFees].map(
                (v, i) => (
                  <Text key={i} variant="numS" align="right" style={{ flex: 1 }} numberOfLines={1}>
                    {formatMoney(v, { decimals: 0, compact: v >= 1_000_000 })}
                  </Text>
                ),
              )}
            </View>
          ))}
        </Card>
      ) : null}

      <TxnDetailSheet item={selected} onClose={() => setSelected(null)} />
      <SectionHeader title="HAREKETLER" />
      <Card padding={0} style={{ paddingHorizontal: space.lg, paddingVertical: space.xs }}>
        {items.map((h, k) => (
          <View key={h.id}>
            {k > 0 ? (
              <View style={{ height: 1, backgroundColor: colors.border, marginLeft: 52 }} />
            ) : null}
            <TxnRow
              txn={h}
              onPress={() => setSelected(h)}
              onEdit={() => actions.edit(h)}
              onDelete={() => void actions.remove(h)}
            />
          </View>
        ))}
        {c.items.length > SHOWN && !all ? (
          <Text
            variant="callout"
            tone="accent"
            align="center"
            onPress={() => setAll(true)}
            style={{ paddingVertical: space.md }}>
            Tümünü göster ({c.items.length})
          </Text>
        ) : null}
      </Card>
    </View>
  );
}

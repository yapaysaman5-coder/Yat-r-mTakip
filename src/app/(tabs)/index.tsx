import { useRouter } from 'expo-router';
import {
  ArrowDownToLine,
  ArrowUpDown,
  ArrowUpFromLine,
  Bell,
  CalendarDays,
  ChevronDown,
  Eye,
  EyeOff,
  PiggyBank,
  Settings,
  Wallet,
  type LucideIcon,
} from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { EmptyPortfolio } from '@/components/EmptyPortfolio';
import { HoldingRow } from '@/components/HoldingRow';
import { MarketTicker } from '@/components/MarketTicker';
import { PortfolioSheet } from '@/components/PortfolioSheet';
import { PreviewNote } from '@/components/PreviewNote';
import { customChart, homeChart, type HomeRange } from '@/data/view/chart';
import type { Summary } from '@/data/view/portfolioView';
import { tr } from '@/i18n/tr';
import { useMarketStore } from '@/state/market';
import { CustomRangeSheet, ReadOut } from '@/components/HeroParts';
import { useAnimatedNumber } from '@/lib/useAnimatedNumber';
import { usePortfolioStore, usePortfolioView } from '@/state/portfolio';
import { FinChart, type FinChartSelection } from '@/ui/charts/FinChart';
import { useSettings } from '@/state/settings';
import { useTheme } from '@/theme/ThemeProvider';
import { GUTTER, radius, space } from '@/theme/tokens';
import {
  AllocationBar,
  Card,
  ChangeBadge,
  Chip,
  GradientCard,
  IconButton,
  IconWell,
  LiveDot,
  Money,
  PressableScale,
  Screen,
  SectionHeader,
  Text,
  toast,
} from '@/ui';
import { formatDate, formatPercent } from '@/utils/format';

const RANGES: HomeRange[] = ['1G', '1H', '1A', '3A', '6A', '1Y', 'YB', 'Tümü'];
const RANGE_LABEL: Record<HomeRange, string> = {
  '1G': 'Bugün',
  '1H': 'Son 1 hafta',
  '1A': 'Son 1 ay',
  '3A': 'Son 3 ay',
  '6A': 'Son 6 ay',
  '1Y': 'Son 1 yıl',
  YB: 'Yılbaşından beri',
  Tümü: 'Başlangıçtan beri',
};

type MarketFilter = 'all' | 'bist' | 'us' | 'crypto';

export default function PortfolioScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const privacy = useSettings((s) => s.privacyMode);
  const togglePrivacy = useSettings((s) => s.togglePrivacyMode);
  const [range, setRange] = useState<HomeRange>('1A');
  const [filter, setFilter] = useState<MarketFilter>('all');
  const [picker, setPicker] = useState(false);

  const view = usePortfolioView();
  const { summary } = view;
  const online = useMarketStore((s) => s.online);
  const mockPrices = useMarketStore((s) => s.mock);
  const heroStatus = view.isDemo || mockPrices ? 'sample' : online === false ? 'offline' : 'live';
  const [custom, setCustom] = useState<{ from: string; to: string } | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [sel, setSel] = useState<FinChartSelection>({ index: null, range: null });
  const [compact, setCompact] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const refreshMarket = useMarketStore((s) => s.refreshNow);
  const reload = usePortfolioStore((s) => s.reload);
  const series = custom ? customChart(view, custom.from, custom.to) : homeChart(view, range);
  const animatedTotal = useAnimatedNumber(summary.totalValue);
  const readIndex = sel.index !== null && sel.index < series.values.length ? sel.index : null;
  const readRange = sel.range && sel.range[1] < series.values.length ? sel.range : null;
  const rangeLabel = custom
    ? `${formatDate(`${custom.from}T12:00:00Z`)} – ${formatDate(`${custom.to}T12:00:00Z`)}`
    : RANGE_LABEL[range];
  const holdings = view.holdings
    .filter((h) => filter === 'all' || h.market === filter)
    .sort((a, b) => b.valueTRY - a.valueTRY);

  const soon = (what: string) => toast.show({ message: `${what} yakında geliyor ✨` });

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshMarket();
    await reload();
    setRefreshing(false);
  };

  return (
    <Screen
      withTabBar
      onScrollY={(y) => setCompact(y > 320)}
      refreshing={refreshing}
      onRefresh={view.empty ? undefined : onRefresh}
      header={
        <View
          style={{
            paddingHorizontal: GUTTER,
            paddingTop: space.sm,
            paddingBottom: space.md,
            flexDirection: 'row',
            alignItems: 'center',
            gap: space.sm,
          }}>
          <PressableScale
            onPress={() => setPicker(true)}
            haptic="selection"
            accessibilityRole="button"
            accessibilityLabel={`Portföy seç: ${view.portfolio.name}`}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: space.xs,
              paddingLeft: space.md,
              paddingRight: space.sm,
              height: 40,
              borderRadius: radius.pill,
              backgroundColor: colors.surfaceAlt,
            }}>
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: view.isDemo ? colors.accent2 : colors.accent,
              }}
            />
            <Text variant="subhead" style={{ marginLeft: 2 }} numberOfLines={1}>
              {view.portfolio.name}
            </Text>
            <ChevronDown size={18} color={colors.textSecondary} strokeWidth={2.4} />
          </PressableScale>
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            {compact && !view.empty ? (
              <View style={{ alignItems: 'flex-end' }}>
                <Money value={summary.totalValue} variant="numM" />
                {summary.dailyChangeRatio !== null ? (
                  <Text variant="caption" tone={summary.dailyChange >= 0 ? 'up' : 'down'}>
                    {formatPercent(summary.dailyChangeRatio, { sign: 'always' })} bugün
                  </Text>
                ) : null}
              </View>
            ) : null}
          </View>
          <IconButton
            icon={privacy ? EyeOff : Eye}
            accessibilityLabel={privacy ? tr.privacy.show : tr.privacy.hide}
            onPress={togglePrivacy}
          />
          <IconButton
            icon={Bell}
            accessibilityLabel="Bildirimler"
            onPress={() => soon('Bildirimler')}
          />
          <IconButton
            icon={Settings}
            accessibilityLabel="Ayarlar"
            onPress={() => router.push('/ayarlar')}
          />
        </View>
      }>
      <PortfolioSheet visible={picker} onClose={() => setPicker(false)} />
      <CustomRangeSheet
        visible={customOpen}
        onClose={() => setCustomOpen(false)}
        first={view.series.dates[0]}
        last={view.series.dates[view.series.dates.length - 1]}
        onApply={(r) => {
          setCustom(r);
          setCustomOpen(false);
        }}
      />
      {view.isDemo ? <PreviewNote /> : null}
      {view.empty ? <EmptyPortfolio /> : null}
      {view.empty ? <MarketTicker /> : null}
      {view.empty ? null : (
        <>
          <GradientCard colors={colors.heroGradient} padding={0}>
            <View style={{ padding: space.xl, paddingBottom: space.sm, gap: space.xs }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                <Text variant="overline" color={colors.heroTextSecondary}>
                  {tr.home.totalValue}
                </Text>
                <View
                  style={{
                    paddingHorizontal: space.sm + 2,
                    paddingVertical: 4,
                    borderRadius: radius.pill,
                    backgroundColor: colors.heroGlass,
                  }}>
                  <LiveDot status={heroStatus} onHero />
                </View>
              </View>
              <Money
                value={
                  readIndex !== null
                    ? series.values[readIndex]
                    : readRange
                      ? series.values[readRange[1]]
                      : animatedTotal
                }
                variant="hero"
                color={colors.heroText}
              />
              {readIndex !== null || readRange ? (
                <ReadOut chart={series} index={readIndex} range={readRange} />
              ) : (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: space.sm,
                    flexWrap: 'wrap',
                  }}>
                  <ChangeBadge value={summary.dailyChange} kind="money" variant="hero" size="md" />
                  {summary.dailyChangeRatio !== null ? (
                    <ChangeBadge value={summary.dailyChangeRatio} variant="hero" size="md" />
                  ) : null}
                  <Text variant="footnote" color={colors.heroTextSecondary}>
                    {tr.home.today}
                  </Text>
                </View>
              )}
              <Text variant="footnote" color={colors.heroTextSecondary} style={{ marginTop: 2 }}>
                {rangeLabel}{' '}
                <Text variant="numS" color={colors.heroText}>
                  {series.changeRatio === null
                    ? '—'
                    : formatPercent(series.changeRatio, { sign: 'always' })}
                </Text>
              </Text>
            </View>
            <FinChart
              values={series.values}
              baseline={series.baseline}
              height={140}
              lineColor={colors.chartLine}
              fillColor={colors.chartFill}
              baselineColor={colors.heroTextSecondary}
              guideColor={colors.heroText}
              onSelect={setSel}
              accessibilityLabel={`${rangeLabel} değer grafiği`}
            />
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: space.sm,
                paddingTop: space.sm,
                paddingBottom: space.md,
                gap: 2,
              }}>
              {RANGES.map((r) => (
                <HeroRangeChip
                  key={r}
                  label={r}
                  selected={!custom && r === range}
                  onPress={() => {
                    setCustom(null);
                    setRange(r);
                  }}
                />
              ))}
              <HeroRangeChip
                label="Özel"
                icon={CalendarDays}
                selected={!!custom}
                onPress={() => setCustomOpen(true)}
              />
            </View>
          </GradientCard>

          <BudgetCard summary={summary} />

          <MarketTicker />

          <Card>
            <SectionHeader title={tr.home.allocation} style={{ marginBottom: space.md }} />
            <AllocationBar
              segments={[
                {
                  key: 'bist',
                  label: tr.markets.bist,
                  value: summary.allocation.bist,
                  color: colors.market.bist,
                },
                {
                  key: 'us',
                  label: tr.markets.us,
                  value: summary.allocation.us,
                  color: colors.market.us,
                },
                {
                  key: 'crypto',
                  label: tr.markets.crypto,
                  value: summary.allocation.crypto,
                  color: colors.market.crypto,
                },
                {
                  key: 'cash',
                  label: tr.markets.cash,
                  value: summary.cash,
                  color: colors.market.cash,
                },
              ].filter((segment) => segment.value > 0)}
            />
          </Card>

          {holdings.length > 0 || filter !== 'all' ? (
            <View style={{ gap: space.md }}>
              <SectionHeader title={tr.home.holdings} />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: space.sm }}
                style={{ marginHorizontal: -GUTTER }}>
                <View style={{ width: GUTTER - space.sm }} />
                <Chip
                  label={tr.markets.all}
                  selected={filter === 'all'}
                  onPress={() => setFilter('all')}
                />
                <Chip
                  label={tr.markets.bist}
                  dotColor={colors.market.bist}
                  selected={filter === 'bist'}
                  onPress={() => setFilter('bist')}
                />
                <Chip
                  label={tr.markets.us}
                  dotColor={colors.market.us}
                  selected={filter === 'us'}
                  onPress={() => setFilter('us')}
                />
                <Chip
                  label={tr.markets.crypto}
                  dotColor={colors.market.crypto}
                  selected={filter === 'crypto'}
                  onPress={() => setFilter('crypto')}
                />
                <Chip
                  icon={ArrowUpDown}
                  label={tr.home.sortByValue}
                  onPress={() => soon('Sıralama seçenekleri')}
                />
                <View style={{ width: GUTTER - space.sm }} />
              </ScrollView>
              <Card padding={0} style={{ paddingHorizontal: space.lg, paddingVertical: space.xs }}>
                {holdings.map((h, i) => (
                  <View key={h.assetId}>
                    {i > 0 ? (
                      <View style={{ height: 1, backgroundColor: colors.border, marginLeft: 56 }} />
                    ) : null}
                    <HoldingRow
                      holding={h}
                      onPress={() => router.push(`/varlik/${encodeURIComponent(h.assetId)}`)}
                    />
                  </View>
                ))}
              </Card>
            </View>
          ) : null}
        </>
      )}
    </Screen>
  );
}

function HeroRangeChip({
  label,
  icon: Icon,
  selected,
  onPress,
}: {
  label: string;
  icon?: LucideIcon;
  selected: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const color = selected ? colors.heroText : colors.heroTextSecondary;
  return (
    <PressableScale
      onPress={onPress}
      haptic="selection"
      scaleTo={0.92}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      style={{
        flex: Icon ? 0 : label.length > 2 ? 1.5 : 1,
        width: Icon ? 32 : undefined,
        height: 32,
        borderRadius: radius.pill,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: selected ? colors.heroGlass : 'transparent',
      }}>
      {Icon ? (
        <Icon size={17} color={color} strokeWidth={2.3} />
      ) : (
        <Text variant="numS" color={color}>
          {label}
        </Text>
      )}
    </PressableScale>
  );
}

function BudgetCard({ summary }: { summary: Summary }) {
  const { colors } = useTheme();
  const tiles: { label: string; value: number; icon: LucideIcon; color: string; bg: string }[] = [
    {
      label: tr.home.deposited,
      value: summary.deposited,
      icon: ArrowDownToLine,
      color: colors.accent,
      bg: colors.accentSoft,
    },
    {
      label: tr.home.withdrawn,
      value: summary.withdrawn,
      icon: ArrowUpFromLine,
      color: colors.warning,
      bg: colors.warningSoft,
    },
    {
      label: tr.home.netInvested,
      value: summary.netInvested,
      icon: PiggyBank,
      color: colors.accent2,
      bg: colors.accent2Soft,
    },
    {
      label: tr.home.cash,
      value: summary.cash,
      icon: Wallet,
      color: colors.market.cash,
      bg: colors.upSoft,
    },
  ];
  return (
    <Card>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: space.md,
        }}>
        <SectionHeader title={tr.home.budget} />
        <LiveDot status="live" showLabel={false} />
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        {tiles.map((t) => (
          <View
            key={t.label}
            style={{
              flexBasis: '47%',
              flexGrow: 1,
              backgroundColor: colors.surfaceAlt,
              borderRadius: radius.md,
              padding: space.md,
              gap: space.sm,
            }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
              <IconWell background={t.bg} size={28}>
                <t.icon size={15} color={t.color} strokeWidth={2.5} />
              </IconWell>
              <Text variant="caption" tone="secondary">
                {t.label}
              </Text>
            </View>
            <Money value={t.value} variant="numM" />
          </View>
        ))}
      </View>
      <View
        style={{
          marginTop: space.sm,
          borderRadius: radius.md,
          backgroundColor: summary.netPnl >= 0 ? colors.upSoft : colors.downSoft,
          paddingHorizontal: space.md,
          paddingVertical: space.md,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
        <Text variant="subhead">{tr.home.netPnl}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <Money value={summary.netPnl} variant="numL" colorize sign="always" />
          {summary.netPnlRatio !== null ? (
            <ChangeBadge value={summary.netPnlRatio} variant="plain" size="md" />
          ) : null}
        </View>
      </View>
    </Card>
  );
}

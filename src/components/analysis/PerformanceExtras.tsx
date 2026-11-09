import { useRouter } from 'expo-router';
import { TriangleAlert } from 'lucide-react-native';
import { useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import Svg, { Line, Path } from 'react-native-svg';

import { assetResults, concentration, drawdownSeries } from '@/data/view/insightsView';
import { usePortfolioView } from '@/state/portfolio';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';
import { AssetAvatar, Card, Money, PressableScale, SectionHeader, Text } from '@/ui';
import { formatDate, formatMoney, formatPercent } from '@/utils/format';

/** Düşüş grafiği: how far below its peak the portfolio was each day. */
export function DrawdownCard() {
  const { colors } = useTheme();
  const view = usePortfolioView();
  const [width, setWidth] = useState(0);
  const dd = drawdownSeries(view.series.unitValues);
  const dates = view.series.dates;
  if (dd.length < 2) return null;
  const worst = Math.min(...dd);
  const worstAt = dd.indexOf(worst);
  const height = 110;
  const floor = Math.min(-0.01, worst * 1.1);
  const x = (i: number) => (i / (dd.length - 1)) * width;
  const y = (v: number) => (v / floor) * (height - 6);
  const line = dd.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('');
  const now = dd[dd.length - 1];
  return (
    <Card style={{ gap: space.sm }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <SectionHeader title="DÜŞÜŞ GRAFİĞİ" />
        <Text variant="caption" tone={now < -0.0005 ? 'down' : 'up'}>
          {now < -0.0005 ? `zirvenin ${formatPercent(now, { decimals: 1 })} altında` : 'zirvede'}
        </Text>
      </View>
      <View
        onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
        style={{ height }}
        accessible
        accessibilityRole="image"
        accessibilityLabel={`En büyük düşüş ${formatPercent(worst, { decimals: 1 })}, ${formatDate(`${dates[worstAt]}T12:00:00Z`)}`}>
        {width > 0 ? (
          <Svg width={width} height={height}>
            <Line x1={0} x2={width} y1={0.5} y2={0.5} stroke={colors.border} strokeWidth={1} />
            <Path d={`${line}L${width},0L0,0Z`} fill={colors.down} fillOpacity={0.18} />
            <Path d={line} stroke={colors.down} strokeWidth={1.6} fill="none" />
          </Svg>
        ) : null}
      </View>
      <Text variant="caption" tone="tertiary">
        En derin nokta {formatPercent(worst, { decimals: 1 })} (
        {formatDate(`${dates[worstAt]}T12:00:00Z`)}). Para giriş ve çıkışlarından etkilenmez.
      </Text>
    </Card>
  );
}

/** En çok kazandıran ve kaybettiren varlıklar, closed positions included. */
export function AssetResultsCard() {
  const { colors } = useTheme();
  const router = useRouter();
  const view = usePortfolioView();
  const results = assetResults(view);
  if (results.length === 0) return null;
  const winners = results.filter((r) => r.total > 0).slice(0, 3);
  const losers = results
    .filter((r) => r.total < 0)
    .slice(-3)
    .reverse();
  const max = Math.max(1, ...results.map((r) => Math.abs(r.total)));
  const row = (r: (typeof results)[number]) => (
    <PressableScale
      key={r.assetId}
      onPress={() => router.push(`/varlik/${encodeURIComponent(r.assetId)}`)}
      haptic="selection"
      scaleTo={0.985}
      accessibilityRole="button"
      accessibilityLabel={`${r.symbol}, toplam ${formatMoney(r.total, { sign: 'always', decimals: 0 })}`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.md,
        paddingVertical: space.sm,
      }}>
      <AssetAvatar symbol={r.symbol} market={r.market} size={32} />
      <View style={{ flex: 1, gap: 4 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text variant="callout">
            {r.symbol}
            {r.open ? '' : ' · kapandı'}
          </Text>
          <Money value={r.total} variant="numS" colorize sign="always" decimals={0} />
        </View>
        <View style={{ height: 5, borderRadius: 3, backgroundColor: colors.surfaceAlt }}>
          <View
            style={{
              width: `${Math.max(2, (Math.abs(r.total) / max) * 100)}%`,
              height: 5,
              borderRadius: 3,
              backgroundColor: r.total >= 0 ? colors.up : colors.down,
            }}
          />
        </View>
      </View>
    </PressableScale>
  );
  const { summary } = view;
  const parts = [
    { label: 'Gerçekleşmemiş', value: summary.unrealized },
    { label: 'Gerçekleşen', value: summary.realized },
    { label: 'Temettü', value: summary.dividends },
    { label: 'Hesap ücreti', value: -summary.accountFees },
  ];
  return (
    <Card style={{ gap: space.sm }}>
      <SectionHeader title="EN ÇOK KAZANDIRAN VE KAYBETTİREN" />
      {winners.map(row)}
      {losers.length ? (
        <View style={{ height: 1, backgroundColor: colors.border, marginVertical: space.xs }} />
      ) : null}
      {losers.map(row)}
      <Text variant="caption" tone="tertiary">
        Toplam = gerçekleşmemiş + gerçekleşen K/Z + net temettü (satılmış varlıklar dahil).
      </Text>
      <View style={{ height: 1, backgroundColor: colors.border, marginVertical: space.xs }} />
      <Text variant="overline" tone="secondary">
        NET K/Z NEREDEN GELDİ
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        {parts.map((p) => (
          <View
            key={p.label}
            style={{
              flexBasis: '47%',
              flexGrow: 1,
              backgroundColor: colors.surfaceAlt,
              borderRadius: radius.md,
              padding: space.sm + 2,
              gap: 2,
            }}>
            <Text variant="caption" tone="secondary">
              {p.label}
            </Text>
            <Money value={p.value} variant="numS" colorize sign="always" decimals={0} />
          </View>
        ))}
      </View>
    </Card>
  );
}

/** Yoğunlaşma: largest positions and a warning when one or a few dominate. */
export function ConcentrationCard() {
  const { colors } = useTheme();
  const view = usePortfolioView();
  const c = concentration(view);
  if (!c.largest) return null;
  return (
    <Card style={{ gap: space.sm }}>
      <SectionHeader title="YOĞUNLAŞMA" />
      {c.warning ? (
        <View
          style={{
            flexDirection: 'row',
            gap: space.sm,
            alignItems: 'center',
            padding: space.md,
            borderRadius: radius.md,
            backgroundColor: colors.warningSoft,
          }}>
          <TriangleAlert size={18} color={colors.warning} strokeWidth={2.4} />
          <Text variant="footnote" style={{ flex: 1 }}>
            {c.warning}
          </Text>
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        {(
          [
            ['En büyük', c.largest.weight, c.largest.symbol],
            ['İlk 3', c.top3, null],
            ['İlk 5', c.top5, null],
          ] as const
        ).map(([label, w, sub]) => (
          <View
            key={label}
            style={{
              flex: 1,
              backgroundColor: colors.surfaceAlt,
              borderRadius: radius.md,
              padding: space.sm + 2,
              gap: 2,
            }}>
            <Text variant="caption" tone="secondary" numberOfLines={1}>
              {label}
            </Text>
            <Text variant="numM">{formatPercent(w, { decimals: 1 })}</Text>
            {sub ? (
              <Text variant="caption" tone="tertiary" numberOfLines={1}>
                {sub}
              </Text>
            ) : null}
          </View>
        ))}
      </View>
      <Text variant="caption" tone="tertiary">
        Payler toplam hesaba (nakit dahil) göredir. Uyarı: tek varlık %25’i ya da en büyük üç varlık
        %60’ı geçince. Etkin pozisyon sayısı ≈ {c.hhi > 0 ? Math.round(1 / c.hhi) : 0}.
      </Text>
    </Card>
  );
}

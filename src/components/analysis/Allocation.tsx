import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View, type LayoutChangeEvent } from 'react-native';

import { distribution, squarify, type Slice } from '@/data/view/insightsView';
import { usePortfolioView } from '@/state/portfolio';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';
import { AllocationBar, Card, Money, SectionHeader, SegmentedControl, Text } from '@/ui';
import { formatPercent } from '@/utils/format';

import { FactorCard, HealthCards } from './ScienceCards';

type Change = 'daily' | 'total';

/**
 * Dağılım (docs/01-PROJE-DOKUMANI.md §6.7): market, currency and sector split, and a heat map
 * of the positions (size = value, colour = today's or total change).
 */
export function Allocation() {
  const { colors } = useTheme();
  const view = usePortfolioView();
  const d = distribution(view);
  const total = view.summary.totalValue;
  const marketColor = (key: string) =>
    key === 'bist'
      ? colors.market.bist
      : key === 'us'
        ? colors.market.us
        : key === 'crypto'
          ? colors.market.crypto
          : colors.market.cash;
  const palette = [
    colors.accent,
    colors.accent2,
    colors.market.bist,
    colors.market.crypto,
    colors.market.us,
    colors.warning,
    colors.up,
    colors.down,
  ];

  return (
    <View style={{ gap: space.lg }}>
      <Heatmap tiles={d.tiles} />

      <Card style={{ gap: space.md }}>
        <SectionHeader title="PİYASA" />
        <AllocationBar segments={d.byMarket.map((s) => ({ ...s, color: marketColor(s.key) }))} />
      </Card>

      <Card style={{ gap: space.md }}>
        <SectionHeader title="PARA BİRİMİ" />
        <AllocationBar
          segments={d.byCurrency.map((s, i) => ({
            ...s,
            color: i === 0 ? colors.market.bist : colors.market.us,
          }))}
        />
        <Text variant="caption" tone="tertiary">
          ABD hisseleri ve kripto dolarla birlikte hareket eder: Dolar/TL yükselince TL değerleri de
          artar.
        </Text>
      </Card>

      <Card style={{ gap: space.sm }}>
        <SectionHeader title="SEKTÖR" />
        {d.bySector.map((s, i) => (
          <SectorRow
            key={s.key}
            slice={s}
            total={total}
            color={s.key === 'cash' ? colors.market.cash : palette[i % palette.length]}
          />
        ))}
        <Text variant="caption" tone="tertiary">
          BIST sektörleri İş Yatırım listesinden; ABD hisseleri GICS sektörüne göre.
        </Text>
      </Card>

      <HealthCards />
      <FactorCard />
    </View>
  );
}

function SectorRow({ slice, total, color }: { slice: Slice; total: number; color: string }) {
  const { colors } = useTheme();
  const w = total > 0 ? slice.value / total : 0;
  return (
    <View style={{ gap: 4, paddingVertical: 2 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.sm }}>
        <Text variant="subhead" style={{ flex: 1 }} numberOfLines={1}>
          {slice.label}
        </Text>
        <Money value={slice.value} variant="caption" tone="secondary" compact />
        <Text variant="numS" style={{ width: 52 }} align="right">
          {formatPercent(w, { decimals: 1 })}
        </Text>
      </View>
      <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.surfaceAlt }}>
        <View
          style={{
            width: `${Math.max(1, w * 100)}%`,
            height: 6,
            borderRadius: 3,
            backgroundColor: color,
          }}
        />
      </View>
    </View>
  );
}

function Heatmap({ tiles }: { tiles: ReturnType<typeof distribution>['tiles'] }) {
  const { colors } = useTheme();
  const router = useRouter();
  const [width, setWidth] = useState(0);
  const [change, setChange] = useState<Change>('daily');
  const height = 260;
  const rects = squarify(
    tiles.map((t) => t.value),
    width,
    height,
  );
  // Colour strength: ±3 % a day, ±50 % in total is full colour.
  const full = change === 'daily' ? 0.03 : 0.5;
  return (
    <Card style={{ gap: space.md }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <SectionHeader title="ISI HARİTASI" />
        <SegmentedControl
          size="sm"
          value={change}
          onChange={setChange}
          style={{ width: 150 }}
          options={[
            { key: 'daily', label: 'Bugün' },
            { key: 'total', label: 'Toplam' },
          ]}
        />
      </View>
      <View
        onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
        style={{ height, borderRadius: radius.md, overflow: 'hidden' }}>
        {width > 0
          ? tiles.map((t, i) => {
              const r = rects[i];
              const v = change === 'daily' ? t.daily : t.total;
              const strength = 0.25 + 0.75 * Math.min(1, Math.abs(v) / full);
              const big = r.w > 56 && r.h > 40;
              return (
                <Pressable
                  key={t.assetId}
                  onPress={() => router.push(`/varlik/${encodeURIComponent(t.assetId)}`)}
                  accessibilityRole="button"
                  accessibilityLabel={`${t.symbol}, ${formatPercent(v, { decimals: 1, sign: 'always' })}`}
                  style={{
                    position: 'absolute',
                    left: r.x,
                    top: r.y,
                    width: r.w,
                    height: r.h,
                    padding: 1.5,
                  }}>
                  <View
                    style={{
                      flex: 1,
                      borderRadius: 6,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor:
                        Math.abs(v) < 0.0005 ? colors.surfaceAlt : v > 0 ? colors.up : colors.down,
                      opacity: Math.abs(v) < 0.0005 ? 1 : strength,
                    }}
                  />
                  {r.w > 34 && r.h > 22 ? (
                    <View
                      pointerEvents="none"
                      style={{
                        position: 'absolute',
                        inset: 0,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                      <Text
                        variant={big ? 'bodyStrong' : 'caption'}
                        color={colors.text}
                        numberOfLines={1}>
                        {t.symbol}
                      </Text>
                      {big ? (
                        <Text variant="numS" color={colors.text}>
                          {formatPercent(v, { decimals: 1, sign: 'always' })}
                        </Text>
                      ) : null}
                    </View>
                  ) : null}
                </Pressable>
              );
            })
          : null}
      </View>
      <Text variant="caption" tone="tertiary">
        Kutu büyüklüğü = pozisyonun değeri. Renk ={' '}
        {change === 'daily' ? 'bugünkü' : 'maliyete göre toplam'} değişim; koyu renk büyük hareket.
        Dokununca varlık detayı.
      </Text>
    </Card>
  );
}

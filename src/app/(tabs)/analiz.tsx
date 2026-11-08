import { CalendarRange, Gauge, PieChart, Sparkles, TrendingUp } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { PreviewNote } from '@/components/PreviewNote';
import { DEMO_BENCHMARKS, DEMO_TOTAL_VALUE, demoComparison } from '@/demo/data';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';
import {
  Card,
  ChangeBadge,
  Chip,
  EmptyState,
  LineChart,
  Money,
  Screen,
  SectionHeader,
  SegmentedControl,
  TabHeader,
  Text,
  toast,
} from '@/ui';
import { formatPercent } from '@/utils/format';

type Section = 'whatif' | 'performance' | 'risk' | 'allocation';

const NET_INVESTED = 1_069_682;
const MEDALS = ['🥇', '🥈', '🥉'];

export default function AnalysisScreen() {
  const [section, setSection] = useState<Section>('whatif');
  return (
    <Screen withTabBar header={<TabHeader title="Analiz" />}>
      <SegmentedControl
        value={section}
        onChange={setSection}
        options={[
          { key: 'whatif', label: 'Ya Olsaydı?' },
          { key: 'performance', label: 'Performans' },
          { key: 'risk', label: 'Risk' },
          { key: 'allocation', label: 'Dağılım' },
        ]}
      />
      {section === 'whatif' ? <WhatIf /> : null}
      {section === 'performance' ? (
        <EmptyState
          icon={TrendingUp}
          title="Performans"
          message="Zaman ağırlıklı getiri (TWR), yıllık getiri (XIRR), aylık getiri ısı haritası ve en çok kazandıranlar burada olacak. (Faz 9)"
        />
      ) : null}
      {section === 'risk' ? (
        <EmptyState
          icon={Gauge}
          title="Risk"
          message="Düşüş grafiği, volatilite, Sharpe, Sortino, Beta ve yoğunlaşma uyarıları burada olacak. (Faz 9)"
        />
      ) : null}
      {section === 'allocation' ? (
        <EmptyState
          icon={PieChart}
          title="Dağılım"
          message="Piyasa, para birimi ve sektör dağılımı ile portföy ısı haritası burada olacak. (Faz 9)"
        />
      ) : null}
    </Screen>
  );
}

function WhatIf() {
  const { colors } = useTheme();
  const [currency, setCurrency] = useState<'TRY' | 'USD'>('TRY');
  const lines = demoComparison(['me', 'gold', 'xu100']);
  const lineColors: Record<string, string> = {
    me: colors.accent,
    gold: colors.market.crypto,
    xu100: colors.market.bist,
  };
  const names: Record<string, string> = { me: 'Portföyüm', gold: 'Gram Altın', xu100: 'BIST 100' };
  const beaten = DEMO_BENCHMARKS.filter((b) => !b.isPortfolio && b.value < DEMO_TOTAL_VALUE).length;
  const others = DEMO_BENCHMARKS.length - 1;
  const best = DEMO_BENCHMARKS[0];

  return (
    <View style={{ gap: space.lg }}>
      <PreviewNote />
      <Card>
        <Text variant="title3">Aynı parayı başka yere yatırsaydın?</Text>
        <Text variant="footnote" tone="secondary" style={{ marginTop: space.xs }}>
          Her para girişin ve çıkışın, aynı tarihte ve aynı tutarda aşağıdaki seçeneklere yapılmış
          gibi hesaplanır.
        </Text>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: space.sm,
            marginTop: space.lg,
          }}>
          <Chip
            icon={CalendarRange}
            label="Tümü · 12.01.2025 → bugün"
            size="sm"
            onPress={() => toast.show({ message: 'Dönem seçimi Faz 9’da geliyor ✨' })}
          />
          <View style={{ flex: 1 }} />
          <SegmentedControl
            size="sm"
            value={currency}
            onChange={setCurrency}
            style={{ width: 112 }}
            options={[
              { key: 'TRY', label: '₺ TL' },
              { key: 'USD', label: '$ USD' },
            ]}
          />
        </View>
        <View style={{ marginTop: space.lg, marginHorizontal: -space.xs }}>
          <LineChart
            series={lines.map((l) => ({
              key: l.key,
              values: l.values,
              color: lineColors[l.key],
              emphasis: l.key === 'me',
            }))}
            accessibilityLabel="Portföy, gram altın ve BIST 100 karşılaştırma grafiği"
          />
        </View>
        <View
          style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.lg, marginTop: space.md }}>
          {lines.map((l) => (
            <View
              key={l.key}
              style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs + 2 }}>
              <View
                style={{
                  width: l.key === 'me' ? 14 : 10,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: lineColors[l.key],
                }}
              />
              <Text variant="caption" tone={l.key === 'me' ? 'primary' : 'secondary'}>
                {names[l.key]}
              </Text>
            </View>
          ))}
        </View>
      </Card>

      <Card padding={0} style={{ paddingVertical: space.sm }}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            paddingHorizontal: space.lg,
            paddingTop: space.sm,
            paddingBottom: space.xs,
          }}>
          <SectionHeader title="LİG TABLOSU" />
          <Text variant="overline" tone="tertiary">
            BUGÜNKÜ DEĞER
          </Text>
        </View>
        {DEMO_BENCHMARKS.map((b, i) => {
          const diff = b.value - DEMO_TOTAL_VALUE;
          return (
            <View
              key={b.key}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: space.md,
                paddingVertical: space.md - 2,
                paddingHorizontal: space.lg,
                marginHorizontal: b.isPortfolio ? space.sm : 0,
                paddingLeft: b.isPortfolio ? space.sm : space.lg,
                borderRadius: b.isPortfolio ? radius.md : 0,
                backgroundColor: b.isPortfolio ? colors.accentSoft : 'transparent',
              }}>
              <View style={{ width: 26, alignItems: 'center' }}>
                {i < 3 ? (
                  <Text style={{ fontSize: 18, lineHeight: 22 }}>{MEDALS[i]}</Text>
                ) : (
                  <Text variant="numS" tone="tertiary">
                    {i + 1}
                  </Text>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  variant={b.isPortfolio ? 'bodyStrong' : 'callout'}
                  tone={b.isPortfolio ? 'accent' : 'primary'}>
                  {b.name}
                </Text>
                <Text variant="caption" tone="secondary">
                  {formatPercent((b.value - NET_INVESTED) / NET_INVESTED, { sign: 'always' })}{' '}
                  getiri
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 3 }}>
                <Money value={b.value} variant="numM" decimals={0} />
                {b.isPortfolio ? (
                  <Text variant="caption" tone="accent">
                    SEN
                  </Text>
                ) : (
                  <ChangeBadge value={diff} kind="money" variant="plain" decimals={0} />
                )}
              </View>
            </View>
          );
        })}
      </Card>

      <Card variant="alt">
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: space.sm,
            marginBottom: space.md,
          }}>
          <Sparkles size={18} color={colors.accent2} strokeWidth={2.4} />
          <Text variant="title3">Özet</Text>
        </View>
        <View style={{ gap: space.sm }}>
          <Insight text={`Portföyün ${others} seçenekten ${beaten} tanesini geride bıraktı.`} />
          <Insight
            text={`En iyi seçenek ${best.name} olurdu: ${formatPercent((best.value - DEMO_TOTAL_VALUE) / DEMO_TOTAL_VALUE, { sign: 'always' })} daha fazla.`}
          />
          <Insight text="Enflasyona (TÜFE) göre reel getirin %4,2 oldu." />
        </View>
      </Card>
    </View>
  );
}

function Insight({ text }: { text: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' }}>
      <View
        style={{
          width: 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: colors.accent2,
          marginTop: 7,
        }}
      />
      <Text variant="footnote" style={{ flex: 1 }}>
        {text}
      </Text>
    </View>
  );
}

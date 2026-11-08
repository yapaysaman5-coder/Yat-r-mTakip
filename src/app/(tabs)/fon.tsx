import { useState, type ReactNode } from 'react';
import { View } from 'react-native';

import { PreviewNote } from '@/components/PreviewNote';
import {
  DEMO_FUND,
  DEMO_HOLDINGS,
  demoSummary,
  holdingCostTRY,
  holdingValueTRY,
  type DemoHolding,
} from '@/demo/data';
import { tr } from '@/i18n/tr';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';
import {
  AssetAvatar,
  Card,
  ChangeBadge,
  Donut,
  LiveDot,
  Money,
  Screen,
  SectionHeader,
  SegmentedControl,
  TabHeader,
  Text,
} from '@/ui';
import { formatMoney, formatNumber, formatPercent, formatPrice } from '@/utils/format';

type Mode = 'value' | 'cost';

export default function FundScreen() {
  const { colors } = useTheme();
  const [mode, setMode] = useState<Mode>('value');
  const summary = demoSummary();

  const metric = (h: DemoHolding) => (mode === 'value' ? holdingValueTRY(h) : holdingCostTRY(h));
  const holdings = [...DEMO_HOLDINGS].sort((a, b) => metric(b) - metric(a));
  const total = holdings.reduce((s, h) => s + metric(h), 0);
  const totalCost = DEMO_HOLDINGS.reduce((s, h) => s + holdingCostTRY(h), 0);
  const byMarket = (m: DemoHolding['market']) =>
    holdings.filter((h) => h.market === m).reduce((s, h) => s + metric(h), 0);
  const markets = [
    { key: 'bist', label: tr.markets.bist, value: byMarket('bist'), color: colors.market.bist },
    { key: 'us', label: tr.markets.us, value: byMarket('us'), color: colors.market.us },
    {
      key: 'crypto',
      label: tr.markets.crypto,
      value: byMarket('crypto'),
      color: colors.market.crypto,
    },
  ];
  const top5 = holdings.slice(0, 5).reduce((s, h) => s + holdingValueTRY(h), 0) / summary.positions;

  return (
    <Screen withTabBar header={<TabHeader title="Hesabım" subtitle="ANA PORTFÖY FONU" />}>
      <PreviewNote />

      <Card elevated>
        <View
          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text variant="overline" tone="tertiary">
            FON BÜYÜKLÜĞÜ
          </Text>
          <LiveDot status="live" />
        </View>
        <Money value={summary.totalValue} variant="title1" style={{ marginTop: space.xs }} />
        <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.lg }}>
          <Stat label="Pay Değeri">
            <Text variant="numM">
              ₺{formatNumber(DEMO_FUND.unitPrice, { minDecimals: 6, maxDecimals: 6 })}
            </Text>
            <ChangeBadge value={DEMO_FUND.unitPriceDailyRatio} />
          </Stat>
          <Stat label="Pay Sayısı">
            <Text variant="numM">{formatNumber(DEMO_FUND.units, { minDecimals: 2 })}</Text>
            <Text variant="caption" tone="tertiary">
              ilk pay ₺1,000000
            </Text>
          </Stat>
        </View>
        <RiskMeter level={DEMO_FUND.riskLevel} />
      </Card>

      <SegmentedControl
        size="lg"
        value={mode}
        onChange={setMode}
        options={[
          { key: 'value', label: 'VARLIK' },
          { key: 'cost', label: 'MALİYET' },
        ]}
      />

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg }}>
          <Donut
            segments={markets}
            size={150}
            thickness={16}
            trackColor={colors.surfaceAlt}
            accessibilityLabel={markets
              .map((m) => `${m.label} ${formatPercent(m.value / total, { decimals: 0 })}`)
              .join(', ')}>
            <Text variant="caption" tone="secondary">
              {mode === 'value' ? 'Değer' : 'Maliyet'}
            </Text>
            <Money value={total} variant="numL" compact />
          </Donut>
          <View style={{ flex: 1, gap: space.md }}>
            {markets.map((m) => (
              <View key={m.key} style={{ gap: 2 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                  <View
                    style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: m.color }}
                  />
                  <Text variant="subhead" style={{ flex: 1 }}>
                    {m.label}
                  </Text>
                  <Text variant="numS">{formatPercent(m.value / total, { decimals: 1 })}</Text>
                </View>
                <Money
                  value={m.value}
                  variant="caption"
                  tone="secondary"
                  compact
                  style={{ marginLeft: 18 }}
                />
              </View>
            ))}
          </View>
        </View>
        {mode === 'cost' ? (
          <View
            style={{
              marginTop: space.lg,
              padding: space.md,
              borderRadius: radius.md,
              backgroundColor: colors.surfaceAlt,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
            <View>
              <Text variant="caption" tone="secondary">
                Toplam maliyete göre değer farkı
              </Text>
              <Money value={summary.positions - totalCost} variant="numM" colorize sign="always" />
            </View>
            <ChangeBadge value={summary.positions / totalCost - 1} size="md" />
          </View>
        ) : null}
      </Card>

      <Card padding={0} style={{ paddingHorizontal: space.lg, paddingVertical: space.sm }}>
        <View style={{ flexDirection: 'row', paddingVertical: space.sm }}>
          <Text variant="overline" tone="tertiary" style={{ flex: 1 }}>
            VARLIK
          </Text>
          <Text variant="overline" tone="tertiary">
            {mode === 'value' ? 'DEĞER · PAY' : 'MALİYET · PAY'}
          </Text>
        </View>
        {holdings.map((h, i) => (
          <View key={h.symbol}>
            {i > 0 ? <View style={{ height: 1, backgroundColor: colors.border }} /> : null}
            <FundRow holding={h} mode={mode} total={total} />
          </View>
        ))}
      </Card>

      <Card>
        <SectionHeader title="GETİRİ TABLOSU · PAY DEĞERİ" style={{ marginBottom: space.md }} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {DEMO_FUND.returns.map((r) => (
            <View
              key={r.label}
              style={{
                flexBasis: '30%',
                flexGrow: 1,
                alignItems: 'center',
                paddingVertical: space.md,
                borderRadius: radius.md,
                backgroundColor: r.ratio >= 0 ? colors.upSoft : colors.downSoft,
                gap: 2,
              }}>
              <Text variant="caption" tone="secondary">
                {r.label}
              </Text>
              <Text variant="numM" tone={r.ratio >= 0 ? 'up' : 'down'}>
                {formatPercent(r.ratio, { decimals: 1, sign: 'always' })}
              </Text>
            </View>
          ))}
        </View>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginTop: space.lg,
            paddingTop: space.md,
            borderTopWidth: 1,
            borderTopColor: colors.border,
          }}>
          <Text variant="subhead" tone="secondary">
            En büyük 5 pozisyonun payı
          </Text>
          <Text variant="numM">{formatPercent(top5, { decimals: 1 })}</Text>
        </View>
      </Card>
    </Screen>
  );
}

function Stat({ label, children }: { label: string; children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        padding: space.md,
        borderRadius: radius.md,
        backgroundColor: colors.surfaceAlt,
        gap: space.xs,
      }}>
      <Text variant="caption" tone="secondary">
        {label}
      </Text>
      {children}
    </View>
  );
}

function RiskMeter({ level }: { level: number }) {
  const { colors } = useTheme();
  const steps = [1, 2, 3, 4, 5, 6, 7];
  const tone = (i: number) =>
    i <= 2 ? colors.up : i <= 4 ? colors.accent2 : i <= 5 ? colors.warning : colors.down;
  return (
    <View style={{ marginTop: space.lg, gap: space.sm }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text variant="caption" tone="secondary">
          Risk Değeri
        </Text>
        <Text variant="numS">{level} / 7</Text>
      </View>
      <View
        style={{ flexDirection: 'row', gap: 4 }}
        accessibilityLabel={`Risk değeri 7 üzerinden ${level}`}>
        {steps.map((i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: 8,
              borderRadius: 4,
              backgroundColor: i <= level ? tone(i) : colors.surfaceAlt,
            }}
          />
        ))}
      </View>
    </View>
  );
}

function FundRow({ holding, mode, total }: { holding: DemoHolding; mode: Mode; total: number }) {
  const value = holdingValueTRY(holding);
  const cost = holdingCostTRY(holding);
  const amount = mode === 'value' ? value : cost;
  const weight = amount / total;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.md,
        paddingVertical: space.md,
      }}>
      <AssetAvatar symbol={holding.symbol} market={holding.market} size={38} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodyStrong">{holding.symbol}</Text>
        {mode === 'value' ? (
          <ChangeBadge value={value / cost - 1} variant="plain" />
        ) : (
          <Text variant="caption" tone="secondary">
            Ort. {formatPrice(holding.avgCost, holding.currency)}
            {holding.currency === 'USD'
              ? ` · kur ${formatMoney(holding.avgFx).replace('₺', '')}`
              : ''}
          </Text>
        )}
      </View>
      <View style={{ alignItems: 'flex-end', gap: 2 }}>
        <Money value={amount} variant="numM" />
        <Text variant="caption" tone="secondary">
          {formatPercent(weight, { decimals: 1 })}
        </Text>
      </View>
    </View>
  );
}

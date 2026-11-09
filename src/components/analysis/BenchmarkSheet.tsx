import { View } from 'react-native';

import type { AnalysisPeriod, AnalysisView, ComparedSeries } from '@/data/view/analysisView';
import { periodReturn } from '@/data/view/analysisView';
import { drawdownSeries } from '@/data/view/insightsView';
import { stepReturns, volatility } from '@/domain';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';
import { Money, Sheet, Text } from '@/ui';
import { PriceChart } from '@/ui/charts/PriceChart';
import { formatMoney, formatPercent } from '@/utils/format';

/**
 * One comparison in detail: what the same money would be worth there today, against the
 * portfolio, with the option's own return and risk over the chosen period.
 */
export function BenchmarkSheet({
  series,
  analysis,
  period,
  onClose,
}: {
  series: ComparedSeries | null;
  analysis: AnalysisView;
  period: AnalysisPeriod;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  if (!series) return <Sheet visible={false} onClose={onClose} />;
  const ccy = analysis.options.currency;
  const last = analysis.dates.length - 1;
  const me = analysis.series[0];
  const start = analysis.periodStart[period];
  const value = series.values[last];
  const invested = analysis.netInvested[last];
  const prices = series.prices.slice(start);
  const dd = Math.min(...drawdownSeries(prices));
  const vol = prices.length > 2 ? volatility(stepReturns(prices), 365) : null;
  const isMe = series.key === 'me';
  const rows: [string, string, 'up' | 'down' | 'primary'][] = [
    ['Yatırılan (net)', formatMoney(invested, { currency: ccy, decimals: 0 }), 'primary'],
    [
      'Kâr / zarar',
      formatMoney(value - invested, { currency: ccy, decimals: 0, sign: 'always' }),
      value >= invested ? 'up' : 'down',
    ],
    [
      `Getiri (${period}, zaman ağırlıklı)`,
      formatPercent(periodReturn(series, start), { decimals: 1, sign: 'always' }),
      periodReturn(series, start) >= 0 ? 'up' : 'down',
    ],
    [`En büyük düşüş (${period})`, formatPercent(dd, { decimals: 1 }), 'down'],
  ];
  if (vol !== null) rows.push(['Yıllık oynaklık', formatPercent(vol, { decimals: 1 }), 'primary']);

  return (
    <Sheet
      visible
      onClose={onClose}
      title={series.name}
      subtitle={
        isMe
          ? 'Portföyünün gerçek değeri'
          : analysis.options.basis === 'flows'
            ? 'Aynı günlerde aynı tutarları buraya yatırsaydın'
            : 'Alış ve satışlarını buraya yapsaydın'
      }>
      <View style={{ gap: space.lg }}>
        <View style={{ gap: 2 }}>
          <Text variant="caption" tone="secondary">
            Bugünkü değer
          </Text>
          <Money value={value} currency={ccy} variant="title1" decimals={0} />
          {!isMe ? (
            <Text variant="footnote" tone={value >= me.values[last] ? 'up' : 'down'}>
              Portföyüne göre{' '}
              {formatMoney(value - me.values[last], { currency: ccy, decimals: 0, sign: 'always' })}
            </Text>
          ) : null}
        </View>
        {prices.length > 1 ? (
          <PriceChart
            values={prices}
            height={140}
            accessibilityLabel={`${series.name} fiyat seyri`}
          />
        ) : null}
        <View
          style={{
            backgroundColor: colors.surfaceAlt,
            borderRadius: radius.lg,
            paddingHorizontal: space.lg,
            paddingVertical: space.xs,
          }}>
          {rows.map(([label, v, t], i) => (
            <View
              key={label}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                paddingVertical: space.sm + 2,
                borderTopWidth: i === 0 ? 0 : 1,
                borderTopColor: colors.border,
              }}>
              <Text variant="subhead" tone="secondary">
                {label}
              </Text>
              <Text variant="numS" tone={t}>
                {v}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </Sheet>
  );
}

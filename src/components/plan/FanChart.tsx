import { useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import Svg, { Line, Path, Text as SvgText } from 'react-native-svg';

import type { GoalResult } from '@/data/view/goalView';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';
import { formatCompact, formatMoney } from '@/utils/format';

/**
 * Hedef grafiği: the 10–90 % band of the simulated paths, the median and the target, per year.
 */
export function FanChart({
  fan,
  target,
  height = 200,
}: {
  fan: GoalResult['fan'];
  target: number;
  height?: number;
}) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const left = 44;
  const bottom = 18;
  const top = 8;
  const n = fan.length - 1;
  const max = Math.max(target, ...fan.map((f) => f.p90)) * 1.08 || 1;
  const plotW = Math.max(1, width - left - 6);
  const plotH = height - bottom - top;
  const x = (year: number) => left + (n > 0 ? (year / n) * plotW : 0);
  const y = (v: number) => top + plotH - (Math.max(0, v) / max) * plotH;
  const line = (key: 'p10' | 'p50' | 'p90') =>
    fan.map((f, i) => `${i ? 'L' : 'M'}${x(f.year).toFixed(1)},${y(f[key]).toFixed(1)}`).join('');
  const band = `${line('p90')}${[...fan]
    .reverse()
    .map((f) => `L${x(f.year).toFixed(1)},${y(f.p10).toFixed(1)}`)
    .join('')}Z`;
  const ticks = [0, max / 2, max];
  const yearTicks = n <= 1 ? [0, n] : [0, Math.round(n / 2), n];
  const last = fan[fan.length - 1];
  return (
    <View
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      style={{ height }}
      accessible
      accessibilityRole="image"
      accessibilityLabel={`${n} yıl sonra: kötü senaryo ${formatMoney(last.p10, { decimals: 0 })}, orta ${formatMoney(last.p50, { decimals: 0 })}, iyi ${formatMoney(last.p90, { decimals: 0 })}; hedef ${formatMoney(target, { decimals: 0 })}`}>
      {width > 0 ? (
        <Svg width={width} height={height}>
          {ticks.map((t) => (
            <Line
              key={t}
              x1={left}
              x2={width - 6}
              y1={y(t)}
              y2={y(t)}
              stroke={colors.border}
              strokeWidth={1}
            />
          ))}
          {ticks.map((t) => (
            <SvgText
              key={`l${t}`}
              x={left - 6}
              y={y(t) + 4}
              fontSize={10}
              fontFamily={fonts.medium}
              fill={colors.textTertiary}
              textAnchor="end">
              {formatCompact(t)}
            </SvgText>
          ))}
          {yearTicks.map((yr) => (
            <SvgText
              key={`y${yr}`}
              x={x(yr)}
              y={height - 4}
              fontSize={10}
              fontFamily={fonts.medium}
              fill={colors.textTertiary}
              textAnchor={yr === 0 ? 'start' : yr === n ? 'end' : 'middle'}>
              {yr === 0 ? 'bugün' : `${yr}. yıl`}
            </SvgText>
          ))}
          <Path d={band} fill={colors.accent} fillOpacity={0.16} />
          <Path
            d={line('p90')}
            stroke={colors.accent}
            strokeOpacity={0.45}
            strokeWidth={1}
            fill="none"
          />
          <Path
            d={line('p10')}
            stroke={colors.accent}
            strokeOpacity={0.45}
            strokeWidth={1}
            fill="none"
          />
          <Path d={line('p50')} stroke={colors.accent} strokeWidth={2.2} fill="none" />
          <Line
            x1={left}
            x2={width - 6}
            y1={y(target)}
            y2={y(target)}
            stroke={colors.accent2}
            strokeWidth={1.5}
            strokeDasharray="5 4"
          />
        </Svg>
      ) : null}
    </View>
  );
}

import { useEffect, useId, useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import { useSharedValue } from 'react-native-reanimated';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Stop } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import { haptics } from '@/lib/haptics';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, softShadow, space } from '@/theme/tokens';
import { formatDate, MONTHS_TR_SHORT } from '@/utils/format';

import { Text } from '../Text';
import { areaPath, monotonePath, stepPath, type Point } from './path';
import { downsampleIndices, valueAxis } from './scale';

export interface ComparisonSeries {
  key: string;
  name: string;
  color: string;
  values: number[];
  /** The user's portfolio: thicker line with a soft area fill, drawn on top. */
  emphasis?: boolean;
}

export interface ComparisonChartProps {
  /** ISO dates (yyyy-mm-dd), one per value. */
  dates: string[];
  series: ComparisonSeries[];
  /** Dashed reference line (e.g. net invested capital). */
  reference?: { values: number[]; label: string };
  /** Draw a solid line at zero (percent mode). */
  zeroLine?: boolean;
  formatAxis: (value: number) => string;
  formatValue: (value: number) => string;
  height?: number;
  maxPoints?: number;
}

const AXIS_W = 54;
const PAD_TOP = 14;
const PAD_BOTTOM = 26;
const TOOLTIP_W = 178;

function axisDate(iso: string, short: boolean): string {
  const [y, m, d] = iso.split('-').map(Number);
  return short
    ? `${d} ${MONTHS_TR_SHORT[m - 1]}`
    : `${MONTHS_TR_SHORT[m - 1]} '${String(y).slice(2)}`;
}

/**
 * Professional comparison chart: right-hand value axis with round ticks, date axis,
 * soft grid, dashed reference line, and a press-and-drag crosshair whose tooltip lists
 * every series at that date (sorted, with haptic ticks).
 */
export function ComparisonChart({
  dates,
  series,
  reference,
  zeroLine,
  formatAxis,
  formatValue,
  height = 240,
  maxPoints = 140,
}: ComparisonChartProps) {
  const { colors } = useTheme();
  const gradientId = useId().replace(/:/g, '');
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);

  const plotW = Math.max(0, width - AXIS_W);
  const plotH = height - PAD_TOP - PAD_BOTTOM;
  const idx = downsampleIndices(dates.length, maxPoints);
  const count = idx.length;

  const pool = series.flatMap((s) => idx.map((i) => s.values[i]));
  if (reference) pool.push(...idx.map((i) => reference.values[i]));
  if (zeroLine) pool.push(0);
  const {
    domainMin: d0,
    domainMax: d1,
    ticks,
  } = valueAxis(Math.min(...pool), Math.max(...pool), 5);
  const y = (v: number) => PAD_TOP + (1 - (v - d0) / (d1 - d0 || 1)) * plotH;
  const x = (k: number) => (count > 1 ? (k / (count - 1)) * plotW : plotW / 2);

  const ordered = [...series].sort((a, b) => Number(!!a.emphasis) - Number(!!b.emphasis));
  const lines = ordered.map((s) => {
    const pts: Point[] = idx.map((i, k) => ({ x: x(k), y: y(s.values[i]) }));
    const d = monotonePath(pts);
    return { s, pts, d, area: s.emphasis ? areaPath(pts, d, PAD_TOP + plotH) : null };
  });
  const refPath = reference
    ? stepPath(idx.map((i, k) => ({ x: x(k), y: y(reference.values[i]) })))
    : null;

  const spanDays = dates.length;
  // Up to four date labels; with only a few days no label repeats or overlaps another.
  const labelKs =
    count > 1
      ? [
          ...new Set([
            0,
            Math.round((count - 1) / 3),
            Math.round((2 * (count - 1)) / 3),
            count - 1,
          ]),
        ].filter((k, i, all) => i === 0 || k - all[i - 1] >= (count - 1) / 4)
      : [0];

  // Gesture geometry lives in a shared value so the worklet always sees current sizes.
  const geom = useSharedValue({ w: 0, n: 0 });
  const lastK = useSharedValue(-1);
  useEffect(() => {
    geom.set({ w: plotW, n: count });
  }, [geom, plotW, count]);

  const onIndex = (k: number | null) => {
    setActive(k);
    if (k !== null) haptics.selection();
  };

  const pan = usePanGesture({
    activeOffsetX: [-4, 4],
    failOffsetY: [-14, 14],
    onUpdate: (e) => {
      'worklet';
      const g = geom.get();
      if (g.n < 2 || g.w <= 0) return;
      const k = Math.max(0, Math.min(g.n - 1, Math.round((e.x / g.w) * (g.n - 1))));
      if (k !== lastK.get()) {
        lastK.set(k);
        scheduleOnRN(onIndex, k);
      }
    },
    onFinalize: () => {
      'worklet';
      lastK.set(-1);
      scheduleOnRN(onIndex, null);
    },
  });

  const activeK = active !== null && active < count ? active : null;
  const activeRows =
    activeK !== null
      ? series
          .map((s) => ({
            key: s.key,
            name: s.name,
            color: s.color,
            emphasis: s.emphasis,
            v: s.values[idx[activeK]],
          }))
          .sort((a, b) => b.v - a.v)
      : [];
  const ax = activeK !== null ? x(activeK) : 0;
  const tooltipLeft =
    ax > plotW / 2 ? Math.max(0, ax - TOOLTIP_W - 12) : Math.min(plotW - TOOLTIP_W, ax + 12);

  const summary = series
    .map((s) => `${s.name} ${formatValue(s.values[s.values.length - 1])}`)
    .join(', ');

  return (
    <GestureDetector gesture={pan}>
      <View
        onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
        style={{ height }}
        accessible
        accessibilityRole="image"
        accessibilityLabel={`Karşılaştırma grafiği. ${summary}`}
        accessibilityHint="Değerleri görmek için grafiğe dokunup sağa sola kaydırın">
        {width > 0 ? (
          <Svg width={width} height={height}>
            <Defs>
              <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={colors.accent} stopOpacity={0.22} />
                <Stop offset="1" stopColor={colors.accent} stopOpacity={0} />
              </LinearGradient>
            </Defs>

            {/* Grid */}
            {ticks.map((t) => (
              <Line
                key={`g${t}`}
                x1={0}
                x2={plotW}
                y1={y(t)}
                y2={y(t)}
                stroke={colors.border}
                strokeWidth={1}
                strokeDasharray={zeroLine && t === 0 ? undefined : '2 5'}
                opacity={zeroLine && t === 0 ? 1 : 0.9}
              />
            ))}
            {zeroLine ? (
              <Line
                x1={0}
                x2={plotW}
                y1={y(0)}
                y2={y(0)}
                stroke={colors.textTertiary}
                strokeWidth={1}
                opacity={0.6}
              />
            ) : null}

            {/* Reference (net invested) */}
            {refPath ? (
              <Path
                d={refPath}
                stroke={colors.textTertiary}
                strokeWidth={1.4}
                strokeDasharray="5 5"
                fill="none"
              />
            ) : null}

            {/* Area under the portfolio */}
            {lines.map((l) =>
              l.area ? <Path key={`a${l.s.key}`} d={l.area} fill={`url(#${gradientId})`} /> : null,
            )}

            {/* Lines */}
            {lines.map((l) => (
              <Path
                key={`l${l.s.key}`}
                d={l.d}
                stroke={l.s.color}
                strokeWidth={l.s.emphasis ? 2.6 : 1.6}
                strokeOpacity={activeK !== null || l.s.emphasis ? 1 : 0.9}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            ))}

            {/* End dots */}
            {activeK === null
              ? lines.map((l) => {
                  const end = l.pts[l.pts.length - 1];
                  return end ? (
                    <Circle
                      key={`e${l.s.key}`}
                      cx={end.x}
                      cy={end.y}
                      r={l.s.emphasis ? 4 : 2.8}
                      fill={l.s.color}
                    />
                  ) : null;
                })
              : null}

            {/* Crosshair */}
            {activeK !== null ? (
              <G>
                <Line
                  x1={ax}
                  x2={ax}
                  y1={PAD_TOP - 4}
                  y2={PAD_TOP + plotH}
                  stroke={colors.textSecondary}
                  strokeWidth={1}
                />
                {lines.map((l) => (
                  <Circle
                    key={`c${l.s.key}`}
                    cx={ax}
                    cy={l.pts[activeK].y}
                    r={l.s.emphasis ? 5 : 4}
                    fill={l.s.color}
                    stroke={colors.surface}
                    strokeWidth={2}
                  />
                ))}
              </G>
            ) : null}
          </Svg>
        ) : null}

        {/* Value axis (right) */}
        {width > 0
          ? ticks.map((t) => (
              <Text
                key={`t${t}`}
                variant="caption"
                tone="tertiary"
                style={{ position: 'absolute', left: plotW + 6, top: y(t) - 8, fontSize: 11 }}>
                {formatAxis(t)}
              </Text>
            ))
          : null}

        {/* Date axis */}
        {width > 0
          ? labelKs.map((k, n) => (
              <Text
                key={`d${k}`}
                variant="caption"
                tone="tertiary"
                style={{
                  position: 'absolute',
                  top: PAD_TOP + plotH + 8,
                  fontSize: 11,
                  width: 64,
                  left: n === 0 ? 0 : n === labelKs.length - 1 ? plotW - 64 : x(k) - 32,
                  textAlign: n === 0 ? 'left' : n === labelKs.length - 1 ? 'right' : 'center',
                }}>
                {axisDate(dates[idx[k]], spanDays <= 62)}
              </Text>
            ))
          : null}

        {/* Tooltip */}
        {activeK !== null ? (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 0,
              left: tooltipLeft,
              width: TOOLTIP_W,
              padding: space.sm + 2,
              borderRadius: radius.md,
              backgroundColor: colors.surfacePressed,
              borderWidth: 1,
              borderColor: colors.borderStrong,
              boxShadow: softShadow(colors.shadow, 2),
              gap: 3,
            }}>
            <Text variant="caption" tone="secondary">
              {formatDate(`${dates[idx[activeK]]}T12:00:00Z`)}
            </Text>
            {activeRows.map((r) => (
              <View key={r.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: r.color }} />
                <Text
                  variant="caption"
                  tone={r.emphasis ? 'primary' : 'secondary'}
                  numberOfLines={1}
                  style={{ flex: 1, fontSize: 11.5 }}>
                  {r.name}
                </Text>
                <Text
                  variant="numS"
                  tone={r.emphasis ? 'primary' : 'secondary'}
                  style={{ fontSize: 11.5 }}>
                  {formatValue(r.v)}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </GestureDetector>
  );
}

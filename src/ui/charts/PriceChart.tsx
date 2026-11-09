import { useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import Svg, { Defs, Line, LinearGradient, Path, Polygon, Stop } from 'react-native-svg';

import { useColors } from '@/theme/ThemeProvider';

import { areaPath, monotonePath, scalePoints } from './path';

export interface TradeMarker {
  /** Index into `values`. */
  index: number;
  /** Trade price (same unit as `values`). */
  price: number;
  side: 'BUY' | 'SELL';
}

/**
 * An asset's price line with its trades (▲ buy, ▼ sell, at the traded price) and the average
 * cost as a dashed line (docs/01-PROJE-DOKUMANI.md §6.3): above or below cost at a glance.
 */
export function PriceChart({
  values,
  markers = [],
  costLine,
  height = 180,
  accessibilityLabel,
}: {
  values: number[];
  markers?: TradeMarker[];
  costLine?: number | null;
  height?: number;
  accessibilityLabel?: string;
}) {
  const colors = useColors();
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  const up = values.length > 1 && values[values.length - 1] >= values[0];
  const line = up ? colors.up : colors.down;

  const all = [...values, ...markers.map((m) => m.price), ...(costLine ? [costLine] : [])];
  const min = Math.min(...all);
  const max = Math.max(...all);
  const pad = { padTop: 14, padBottom: 14 };
  const opts = { width: Math.max(0, width - 8), height, ...pad, min, max };
  const points = width > 0 && values.length ? scalePoints(values, opts) : [];
  const path = monotonePath(points);
  const yOf = (v: number) => scalePoints([v], opts)[0]?.y ?? 0;
  const xOf = (i: number) =>
    values.length > 1 ? (i * opts.width) / (values.length - 1) : opts.width / 2;

  return (
    <View
      onLayout={onLayout}
      style={{ height }}
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}>
      {width > 0 && points.length ? (
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id="pc-fill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={line} stopOpacity={0.22} />
              <Stop offset="1" stopColor={line} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Path d={areaPath(points, path, height)} fill="url(#pc-fill)" />
          {costLine ? (
            <Line
              x1={0}
              x2={opts.width}
              y1={yOf(costLine)}
              y2={yOf(costLine)}
              stroke={colors.textTertiary}
              strokeWidth={1.2}
              strokeDasharray="5 5"
            />
          ) : null}
          <Path
            d={path}
            stroke={line}
            strokeWidth={2.2}
            fill="none"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {markers.map((m, k) => {
            const x = xOf(m.index);
            const y = yOf(m.price);
            const s = 6;
            const pts =
              m.side === 'BUY'
                ? `${x},${y - s} ${x - s},${y + s * 0.8} ${x + s},${y + s * 0.8}`
                : `${x},${y + s} ${x - s},${y - s * 0.8} ${x + s},${y - s * 0.8}`;
            return (
              <Polygon
                key={k}
                points={pts}
                fill={m.side === 'BUY' ? colors.up : colors.down}
                stroke={colors.surface}
                strokeWidth={1.5}
              />
            );
          })}
        </Svg>
      ) : null}
    </View>
  );
}

import { useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';

import { monotonePath, scalePoints } from './path';

export interface LineSeries {
  key: string;
  values: number[];
  color: string;
  /** Emphasised series (the user's portfolio) is drawn thicker and on top. */
  emphasis?: boolean;
}

/** Multi-series comparison chart (static). Series share one y-domain. */
export function LineChart({
  series,
  height = 170,
  accessibilityLabel,
}: {
  series: LineSeries[];
  height?: number;
  accessibilityLabel?: string;
}) {
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  const all = series.flatMap((s) => s.values);
  const opts = {
    width: Math.max(0, width - 10),
    height,
    padTop: 10,
    padBottom: 10,
    min: Math.min(...all),
    max: Math.max(...all),
  };
  const ordered = [...series].sort((a, b) => Number(!!a.emphasis) - Number(!!b.emphasis));
  return (
    <View
      onLayout={onLayout}
      style={{ height }}
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}>
      {width > 0 ? (
        <Svg width={width} height={height}>
          {ordered.map((s) => {
            const pts = scalePoints(s.values, opts);
            const end = pts[pts.length - 1];
            return (
              <G key={s.key}>
                <Path
                  d={monotonePath(pts)}
                  stroke={s.color}
                  strokeWidth={s.emphasis ? 3 : 1.8}
                  strokeOpacity={s.emphasis ? 1 : 0.85}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
                {end ? (
                  <Circle cx={end.x} cy={end.y} r={s.emphasis ? 4.5 : 3} fill={s.color} />
                ) : null}
              </G>
            );
          })}
        </Svg>
      ) : null}
    </View>
  );
}

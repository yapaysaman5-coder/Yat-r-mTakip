import { useId, useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { areaPath, monotonePath, scalePoints, stepPath } from './path';

export interface AreaChartProps {
  values: number[];
  /** Optional second series drawn as a dashed step line (net invested capital). */
  baseline?: number[];
  height?: number;
  lineColor: string;
  fillColor: string;
  baselineColor?: string;
  strokeWidth?: number;
  showEndDot?: boolean;
  accessibilityLabel?: string;
}

/**
 * Static smooth area chart (react-native-svg).
 * The interactive GPU chart (FinChart, Skia) replaces this on the portfolio screen in Phase 5;
 * this one stays for small static previews.
 */
export function AreaChart({
  values,
  baseline,
  height = 150,
  lineColor,
  fillColor,
  baselineColor,
  strokeWidth = 2.5,
  showEndDot = true,
  accessibilityLabel,
}: AreaChartProps) {
  const [width, setWidth] = useState(0);
  const gradientId = useId().replace(/:/g, '');
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const all = baseline ? [...values, ...baseline] : values;
  const domain = { min: Math.min(...all), max: Math.max(...all) };
  // Keep the end dot (and its glow) inside the canvas.
  const scaleOpts = { width: Math.max(0, width - 12), height, padTop: 12, padBottom: 8, ...domain };
  const points = width > 0 ? scalePoints(values, scaleOpts) : [];
  const line = monotonePath(points);
  const area = areaPath(points, line, height);
  const basePoints = baseline && width > 0 ? scalePoints(baseline, scaleOpts) : [];
  const end = points[points.length - 1];

  return (
    <View
      onLayout={onLayout}
      style={{ height }}
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}>
      {width > 0 ? (
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={fillColor} stopOpacity={1} />
              <Stop offset="1" stopColor={fillColor} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Path d={area} fill={`url(#${gradientId})`} />
          {basePoints.length > 0 ? (
            <Path
              d={stepPath(basePoints)}
              stroke={baselineColor ?? lineColor}
              strokeOpacity={0.65}
              strokeWidth={1.5}
              strokeDasharray="4 5"
              strokeLinecap="round"
              fill="none"
            />
          ) : null}
          <Path
            d={line}
            stroke={lineColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          {showEndDot && end ? (
            <>
              <Circle cx={end.x} cy={end.y} r={9} fill={lineColor} opacity={0.22} />
              <Circle cx={end.x} cy={end.y} r={4.5} fill={lineColor} />
            </>
          ) : null}
        </Svg>
      ) : null}
    </View>
  );
}

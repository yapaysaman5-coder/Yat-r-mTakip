import type { ReactNode } from 'react';
import { View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

export interface DonutSegment {
  key: string;
  value: number;
  color: string;
}

/** Ring chart with rounded, gapped segments and free content in the middle. */
export function Donut({
  segments,
  size = 168,
  thickness = 18,
  trackColor,
  children,
  accessibilityLabel,
}: {
  segments: DonutSegment[];
  size?: number;
  thickness?: number;
  trackColor: string;
  children?: ReactNode;
  accessibilityLabel?: string;
}) {
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  // Gap between segments, measured along the circumference; round caps eat into it.
  const gap = segments.length > 1 ? thickness + 6 : 0;

  // Start of each segment along the ring = sum of the segments before it.
  const lengths = segments.map((s) => (s.value / total) * c);
  const starts = lengths.map((_, i) => lengths.slice(0, i).reduce((a, b) => a + b, 0));
  const arcs = segments.map((s, i) => {
    const visible = Math.max(0.01, lengths[i] - gap);
    return {
      key: s.key,
      color: s.color,
      dash: `${visible} ${c - visible}`,
      offset: -starts[i] - gap / 2,
    };
  });

  return (
    <View
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={trackColor}
          strokeWidth={thickness}
          fill="none"
        />
        <G rotation={-90} origin={`${size / 2}, ${size / 2}`}>
          {arcs.map((a) => (
            <Circle
              key={a.key}
              cx={size / 2}
              cy={size / 2}
              r={r}
              stroke={a.color}
              strokeWidth={thickness}
              strokeDasharray={a.dash}
              strokeDashoffset={a.offset}
              strokeLinecap="round"
              fill="none"
            />
          ))}
        </G>
      </Svg>
      {children}
    </View>
  );
}

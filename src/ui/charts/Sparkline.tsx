import Svg, { Path } from 'react-native-svg';

import { monotonePath, scalePoints } from './path';

/** Tiny trend line for list rows (last 7 days). */
export function Sparkline({
  values,
  color,
  width = 56,
  height = 24,
}: {
  values: number[];
  color: string;
  width?: number;
  height?: number;
}) {
  const points = scalePoints(values, { width: width - 2, height, padTop: 3, padBottom: 3 }).map(
    (p) => ({ x: p.x + 1, y: p.y }),
  );
  return (
    <Svg width={width} height={height} accessibilityElementsHidden importantForAccessibility="no">
      <Path
        d={monotonePath(points)}
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

import Svg, { Path } from 'react-native-svg';

/** Small rounded ▲ / ▼ used next to changes (colour is never the only signal). */
export function Triangle({
  direction,
  color,
  size = 8,
}: {
  direction: 'up' | 'down';
  color: string;
  size?: number;
}) {
  const d =
    direction === 'up'
      ? 'M4.13 1.5a1 1 0 0 1 1.74 0l3.27 5.75A1 1 0 0 1 8.27 8.75H1.73a1 1 0 0 1-.87-1.5z'
      : 'M5.87 8.5a1 1 0 0 1-1.74 0L.86 2.75A1 1 0 0 1 1.73 1.25h6.54a1 1 0 0 1 .87 1.5z';
  return (
    <Svg width={size} height={size} viewBox="0 0 10 10">
      <Path d={d} fill={color} />
    </Svg>
  );
}

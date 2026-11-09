import { useEffect, useRef, type ComponentRef, type ReactNode } from 'react';
import { Pressable, View, type GestureResponderEvent } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, G } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface DonutSegment {
  key: string;
  value: number;
  color: string;
}

/**
 * Ring chart with rounded, gapped segments and free content in the middle.
 * - New values make each segment flow to its new size (UI thread).
 * - With `onSelect`, tapping a segment selects it (the others fade); tapping it again, or the
 *   middle, clears the selection.
 */
export function Donut({
  segments,
  size = 168,
  thickness = 18,
  trackColor,
  children,
  accessibilityLabel,
  selected = null,
  onSelect,
}: {
  segments: DonutSegment[];
  size?: number;
  thickness?: number;
  trackColor: string;
  children?: ReactNode;
  accessibilityLabel?: string;
  selected?: string | null;
  onSelect?: (key: string | null) => void;
}) {
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  // Gap between segments, measured along the circumference; round caps eat into it.
  const gap = segments.length > 1 ? thickness + 6 : 0;

  // Start of each segment along the ring = sum of the segments before it.
  const lengths = segments.map((s) => (s.value / total) * c);
  const starts = lengths.map((_, i) => lengths.slice(0, i).reduce((a, b) => a + b, 0));

  const pressRef = useRef<ComponentRef<typeof Pressable>>(null);
  const onPress = (e: GestureResponderEvent) => {
    if (!onSelect || !pressRef.current) return;
    // Page coordinates: locationX/Y are relative to whichever child was touched.
    const { pageX, pageY } = e.nativeEvent;
    pressRef.current.measureInWindow((left: number, top: number) =>
      hit(pageX - left - size / 2, pageY - top - size / 2),
    );
  };
  const hit = (x: number, y: number) => {
    if (!onSelect) return;
    const dist = Math.hypot(x, y);
    if (dist < r - thickness * 1.2) return onSelect(null);
    // Angle from 12 o'clock, clockwise, as a length along the ring.
    const angle = (Math.atan2(x, -y) + 2 * Math.PI) % (2 * Math.PI);
    const along = (angle / (2 * Math.PI)) * c;
    const seg = segments.find((_, i) => along >= starts[i] && along < starts[i] + lengths[i]);
    onSelect(!seg || seg.key === selected ? null : seg.key);
  };

  const ring = (
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
        {segments.map((s, i) => (
          <Arc
            key={s.key}
            cx={size / 2}
            r={r}
            c={c}
            color={s.color}
            thickness={thickness}
            start={starts[i]}
            length={lengths[i]}
            gap={gap}
            dimmed={selected !== null && selected !== s.key}
          />
        ))}
      </G>
    </Svg>
  );

  const boxStyle = {
    width: size,
    height: size,
    alignItems: 'center',
    justifyContent: 'center',
  } as const;
  if (!onSelect) {
    return (
      <View
        style={boxStyle}
        accessible
        accessibilityRole="image"
        accessibilityLabel={accessibilityLabel}>
        {ring}
        {children}
      </View>
    );
  }
  return (
    <Pressable
      ref={pressRef}
      style={boxStyle}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint="Bir dilime dokununca liste o piyasaya süzülür">
      {ring}
      <View pointerEvents="none" style={{ alignItems: 'center' }}>
        {children}
      </View>
    </Pressable>
  );
}

function Arc({
  cx,
  r,
  c,
  color,
  thickness,
  start,
  length,
  gap,
  dimmed,
}: {
  cx: number;
  r: number;
  c: number;
  color: string;
  thickness: number;
  start: number;
  length: number;
  gap: number;
  dimmed: boolean;
}) {
  const s = useSharedValue(start);
  const l = useSharedValue(0);
  const o = useSharedValue(1);
  useEffect(() => {
    const timing = { duration: 550, easing: Easing.out(Easing.cubic) };
    s.set(withTiming(start, timing));
    l.set(withTiming(length, timing));
  }, [s, l, start, length]);
  useEffect(() => {
    o.set(withTiming(dimmed ? 0.28 : 1, { duration: 200 }));
  }, [o, dimmed]);
  const props = useAnimatedProps(() => {
    const visible = Math.max(0.01, l.get() - gap);
    return {
      strokeDasharray: [visible, c - visible],
      strokeDashoffset: -s.get() - gap / 2,
      strokeOpacity: o.get(),
    };
  });
  return (
    <AnimatedCircle
      animatedProps={props}
      cx={cx}
      cy={cx}
      r={r}
      stroke={color}
      strokeWidth={thickness}
      strokeLinecap="round"
      fill="none"
    />
  );
}

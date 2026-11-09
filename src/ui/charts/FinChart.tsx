import { useEffect, useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import { haptics } from '@/lib/haptics';

import { stepPath } from './path';
import { blend, MORPH_POINTS, resample, smoothPath, toYs } from './morph';

const AnimatedPath = Animated.createAnimatedComponent(Path);

export interface FinChartSelection {
  /** One finger: the day being read. */
  index: number | null;
  /** Two fingers: the two days being compared (start ≤ end). */
  range: [number, number] | null;
}

export interface FinChartProps {
  values: number[];
  /** Net invested (step line). */
  baseline?: number[];
  height?: number;
  lineColor: string;
  fillColor: string;
  baselineColor?: string;
  guideColor: string;
  onSelect?: (s: FinChartSelection) => void;
  accessibilityLabel?: string;
}

const PAD_TOP = 14;
const PAD_BOTTOM = 10;

/**
 * FinChart (docs/01-PROJE-DOKUMANI.md §7): the balance chart.
 * - One finger: a guide line follows the finger; the parent shows that day's value.
 * - Two fingers: the area between them is shaded; the parent shows the change.
 * - Changing the range morphs one shape into the next (on the UI thread).
 */
export function FinChart({
  values,
  baseline,
  height = 140,
  lineColor,
  fillColor,
  baselineColor,
  guideColor,
  onSelect,
  accessibilityLabel,
}: FinChartProps) {
  const [width, setWidth] = useState(0);
  const [sel, setSel] = useState<FinChartSelection>({ index: null, range: null });
  const w = Math.max(0, width - 10);

  // Shape: both values and net invested share the vertical scale.
  const all = baseline ? [...values, ...baseline] : values;
  const min = all.length ? Math.min(...all) : 0;
  const max = all.length ? Math.max(...all) : 1;
  const target = toYs(resample(values, MORPH_POINTS), height, PAD_TOP, PAD_BOTTOM, min, max);

  const from = useSharedValue<number[]>(target);
  const to = useSharedValue<number[]>(target);
  const t = useSharedValue(1);
  const key = `${values.length}:${values[0]}:${values[values.length - 1]}:${min}:${max}:${height}`;
  useEffect(() => {
    // Start the new shape from wherever the old one is now.
    from.set(blend(from.get(), to.get(), t.get()));
    to.set(target);
    t.set(0);
    t.set(withTiming(1, { duration: 450, easing: Easing.out(Easing.cubic) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const geom = useSharedValue({ w: 0, n: 0 });
  useEffect(() => {
    geom.set({ w, n: values.length });
  }, [geom, w, values.length]);

  const lineProps = useAnimatedProps(() => ({
    d: smoothPath(blend(from.get(), to.get(), t.get()), geom.get().w),
  }));
  const areaProps = useAnimatedProps(() => {
    const ww = geom.get().w;
    const line = smoothPath(blend(from.get(), to.get(), t.get()), ww);
    return { d: line ? `${line}L${ww},${height}L0,${height}Z` : '' };
  });

  const select = (index: number | null, a: number | null, b: number | null) => {
    const next: FinChartSelection = {
      index,
      range: a !== null && b !== null ? [Math.min(a, b), Math.max(a, b)] : null,
    };
    setSel(next);
    onSelect?.(next);
    if (index !== null || next.range) haptics.selection();
  };

  const last = useSharedValue({ i: -1, a: -1, b: -1 });
  const pan = usePanGesture({
    activeOffsetX: [-4, 4],
    failOffsetY: [-14, 14],
    maxPointers: 2,
    onTouchesMove: (e) => {
      'worklet';
      const g = geom.get();
      if (g.n < 2 || g.w <= 0) return;
      const at = (x: number) => Math.max(0, Math.min(g.n - 1, Math.round((x / g.w) * (g.n - 1))));
      const prev = last.get();
      if (e.allTouches.length >= 2) {
        const a = at(e.allTouches[0].x);
        const b = at(e.allTouches[1].x);
        if (a !== prev.a || b !== prev.b) {
          last.set({ i: -1, a, b });
          scheduleOnRN(select, null, a, b);
        }
      } else if (e.allTouches.length === 1) {
        const i = at(e.allTouches[0].x);
        if (i !== prev.i) {
          last.set({ i, a: -1, b: -1 });
          scheduleOnRN(select, i, null, null);
        }
      }
    },
    onFinalize: () => {
      'worklet';
      last.set({ i: -1, a: -1, b: -1 });
      scheduleOnRN(select, null, null, null);
    },
  });

  const n = values.length;
  const xOf = (i: number) => (n > 1 ? (i * w) / (n - 1) : w / 2);
  const yOf = (v: number) => toYs([v], height, PAD_TOP, PAD_BOTTOM, min, max)[0];
  const basePts = baseline && w > 0 ? baseline.map((v, i) => ({ x: xOf(i), y: yOf(v) })) : [];
  const active = sel.index !== null && sel.index < n ? sel.index : null;
  const range = sel.range && sel.range[1] < n ? sel.range : null;

  return (
    <GestureDetector gesture={pan}>
      <View
        onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
        style={{ height }}
        accessible
        accessibilityRole="image"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint="Değerleri okumak için parmağını grafikte kaydır; iki parmakla iki günü karşılaştır">
        {width > 0 && n > 0 ? (
          <Svg width={width} height={height}>
            <Defs>
              <LinearGradient id="fin-fill" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={fillColor} stopOpacity={1} />
                <Stop offset="1" stopColor={fillColor} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            {range ? (
              <Rect
                x={xOf(range[0])}
                y={0}
                width={Math.max(1, xOf(range[1]) - xOf(range[0]))}
                height={height}
                fill={guideColor}
                opacity={0.14}
              />
            ) : null}
            <AnimatedPath animatedProps={areaProps} fill="url(#fin-fill)" />
            {basePts.length > 1 ? (
              <Path
                d={stepPath(basePts)}
                stroke={baselineColor ?? lineColor}
                strokeOpacity={0.65}
                strokeWidth={1.5}
                strokeDasharray="4 5"
                fill="none"
              />
            ) : null}
            <AnimatedPath
              animatedProps={lineProps}
              stroke={lineColor}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            {range
              ? range.map((k, j) => (
                  <Line
                    key={j}
                    x1={xOf(k)}
                    x2={xOf(k)}
                    y1={0}
                    y2={height}
                    stroke={guideColor}
                    strokeWidth={1.2}
                  />
                ))
              : null}
            {active !== null ? (
              <>
                <Line
                  x1={xOf(active)}
                  x2={xOf(active)}
                  y1={0}
                  y2={height}
                  stroke={guideColor}
                  strokeWidth={1.2}
                  strokeDasharray="3 4"
                />
                <Circle
                  cx={xOf(active)}
                  cy={yOf(values[active])}
                  r={9}
                  fill={lineColor}
                  opacity={0.25}
                />
                <Circle cx={xOf(active)} cy={yOf(values[active])} r={4.5} fill={lineColor} />
              </>
            ) : (
              <>
                <Circle
                  cx={xOf(n - 1)}
                  cy={yOf(values[n - 1])}
                  r={9}
                  fill={lineColor}
                  opacity={0.22}
                />
                <Circle cx={xOf(n - 1)} cy={yOf(values[n - 1])} r={4.5} fill={lineColor} />
              </>
            )}
          </Svg>
        ) : null}
      </View>
    </GestureDetector>
  );
}

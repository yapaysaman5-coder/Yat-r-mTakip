import { useEffect } from 'react';
import type { DimensionValue, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useColors } from '@/theme/ThemeProvider';
import { radius as radii } from '@/theme/tokens';

/** Soft pulsing placeholder shown while content loads. */
export function Skeleton({
  width = '100%',
  height = 14,
  radius = radii.xs,
  style,
}: {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const colors = useColors();
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(
      withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }), -1, true),
    );
  }, [t]);
  const animated = useAnimatedStyle(() => ({ opacity: 0.55 + t.get() * 0.45 }));
  return (
    <Animated.View
      accessibilityLabel="Yükleniyor"
      style={[
        { width, height, borderRadius: radius, backgroundColor: colors.skeleton },
        animated,
        style,
      ]}
    />
  );
}

import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useColors } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

import { Text } from './Text';

export type LiveStatus = 'live' | 'delayed' | 'closed';

const LABEL: Record<LiveStatus, string> = {
  live: 'CANLI',
  delayed: 'GECİKMELİ',
  closed: 'KAPALI',
};

const A11Y: Record<LiveStatus, string> = {
  live: 'Veriler canlı',
  delayed: 'Veriler gecikmeli',
  closed: 'Piyasalar kapalı',
};

/** Pulsing status dot: green = live, amber = delayed data, grey = markets closed / offline. */
export function LiveDot({
  status = 'live',
  showLabel = true,
  onHero = false,
}: {
  status?: LiveStatus;
  showLabel?: boolean;
  onHero?: boolean;
}) {
  const colors = useColors();
  const color =
    status === 'live' ? colors.up : status === 'delayed' ? colors.warning : colors.textTertiary;
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (status === 'closed') return;
    pulse.set(withRepeat(withTiming(1, { duration: 1600, easing: Easing.out(Easing.quad) }), -1));
  }, [pulse, status]);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: 0.55 * (1 - pulse.get()),
    transform: [{ scale: 1 + pulse.get() * 1.6 }],
  }));

  return (
    <View
      style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs + 2 }}
      accessibilityLabel={A11Y[status]}>
      <View style={{ width: 10, height: 10, alignItems: 'center', justifyContent: 'center' }}>
        {status !== 'closed' ? (
          <Animated.View
            style={[
              {
                position: 'absolute',
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: color,
              },
              ringStyle,
            ]}
          />
        ) : null}
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
      </View>
      {showLabel ? (
        <Text variant="overline" color={onHero ? colors.heroText : color}>
          {LABEL[status]}
        </Text>
      ) : null}
    </View>
  );
}

import { useState } from 'react';
import {
  Pressable,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';

import { haptics } from '@/lib/haptics';
import { useTheme } from '@/theme/ThemeProvider';
import { motion, radius, softShadow } from '@/theme/tokens';

import { Text } from './Text';

export interface SegmentOption<K extends string> {
  key: K;
  label: string;
  /** Thumb colour when this option is active (e.g. green for "AL", red for "SAT"). */
  activeColor?: string;
  /** Label colour on the coloured thumb. */
  activeTextColor?: string;
}

export interface SegmentedControlProps<K extends string> {
  options: readonly SegmentOption<K>[];
  value: K;
  onChange: (key: K) => void;
  size?: 'sm' | 'md' | 'lg';
  style?: StyleProp<ViewStyle>;
}

const HEIGHT = { sm: 34, md: 42, lg: 50 } as const;
const INSET = 4;

export function SegmentedControl<K extends string>({
  options,
  value,
  onChange,
  size = 'md',
  style,
}: SegmentedControlProps<K>) {
  const { colors, dark } = useTheme();
  const [width, setWidth] = useState(0);
  const index = Math.max(
    0,
    options.findIndex((o) => o.key === value),
  );
  const active = options[index];
  const segmentWidth = width > 0 ? (width - INSET * 2) / options.length : 0;

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: withSpring(index * segmentWidth, motion.springSoft) }],
  }));

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  const thumbColor = active?.activeColor ?? (dark ? colors.surfacePressed : colors.surface);

  return (
    <View
      onLayout={onLayout}
      accessibilityRole="tablist"
      style={[
        {
          height: HEIGHT[size],
          borderRadius: radius.pill,
          backgroundColor: colors.surfaceAlt,
          padding: INSET,
          flexDirection: 'row',
        },
        style,
      ]}>
      {segmentWidth > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              top: INSET,
              left: INSET,
              bottom: INSET,
              width: segmentWidth,
              borderRadius: radius.pill,
              backgroundColor: thumbColor,
              boxShadow: softShadow(active?.activeColor ?? colors.shadow, 1),
            },
            thumbStyle,
          ]}
        />
      ) : null}
      {options.map((option, i) => {
        const selected = i === index;
        const textColor = selected
          ? (option.activeTextColor ?? (option.activeColor ? colors.textOnAccent : colors.text))
          : colors.textSecondary;
        return (
          <Pressable
            key={option.key}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={option.label}
            onPress={() => {
              if (!selected) {
                haptics.selection();
                onChange(option.key);
              }
            }}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text
              variant={size === 'lg' ? 'bodyStrong' : 'subhead'}
              color={textColor}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

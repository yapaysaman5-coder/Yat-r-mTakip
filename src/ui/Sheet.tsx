import { useEffect, useState, type ReactNode } from 'react';
import { Modal, Pressable, View } from 'react-native';
import {
  GestureDetector,
  GestureHandlerRootView,
  usePanGesture,
} from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { haptics } from '@/lib/haptics';
import { useTheme } from '@/theme/ThemeProvider';
import { GUTTER, motion, radius, softShadow, space } from '@/theme/tokens';

import { Text } from './Text';

export interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children?: ReactNode;
}

const CLOSE_DISTANCE = 110;
const CLOSE_VELOCITY = 900;

/**
 * Bottom sheet: springs up from the bottom, closes on backdrop tap, Android back,
 * or a downward drag.
 */
export function Sheet({ visible, onClose, title, subtitle, children }: SheetProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  const [height, setHeight] = useState(0);
  const progress = useSharedValue(0);
  const dragY = useSharedValue(0);

  if (visible && !mounted) setMounted(true);

  useEffect(() => {
    if (!mounted) return;
    if (visible) {
      dragY.set(0);
      progress.set(withSpring(1, motion.springSoft));
    } else {
      progress.set(
        withTiming(0, { duration: motion.base }, (finished) => {
          if (finished) scheduleOnRN(setMounted, false);
        }),
      );
    }
  }, [visible, mounted, progress, dragY]);

  const pan = usePanGesture({
    activeOffsetY: [-8, 8],
    onUpdate: (e) => {
      'worklet';
      dragY.set(Math.max(0, e.translationY));
    },
    onDeactivate: (e) => {
      'worklet';
      if (e.translationY > CLOSE_DISTANCE || e.velocityY > CLOSE_VELOCITY) {
        scheduleOnRN(onClose);
      } else {
        dragY.set(withSpring(0, motion.springSoft));
      }
    },
  });

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.get(), [0, 1], [0, 1]),
  }));
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - progress.get()) * (height || 700) + dragY.get() }],
  }));

  if (!mounted) return null;

  return (
    <Modal
      visible
      transparent
      statusBarTranslucent
      navigationBarTranslucent
      animationType="none"
      onRequestClose={onClose}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Animated.View
          style={[
            { position: 'absolute', inset: 0, backgroundColor: colors.overlay },
            backdropStyle,
          ]}>
          <Pressable
            style={{ flex: 1 }}
            onPress={() => {
              haptics.selection();
              onClose();
            }}
            accessibilityRole="button"
            accessibilityLabel="Kapat"
          />
        </Animated.View>
        <View style={{ flex: 1, justifyContent: 'flex-end' }} pointerEvents="box-none">
          <GestureDetector gesture={pan}>
            <Animated.View
              onLayout={(e) => setHeight(e.nativeEvent.layout.height)}
              accessibilityViewIsModal
              style={[
                {
                  backgroundColor: colors.surface,
                  borderTopLeftRadius: radius.xl,
                  borderTopRightRadius: radius.xl,
                  paddingHorizontal: GUTTER,
                  paddingBottom: insets.bottom + space.xl,
                  boxShadow: softShadow(colors.shadow, 3),
                  borderWidth: 1,
                  borderBottomWidth: 0,
                  borderColor: colors.border,
                },
                sheetStyle,
              ]}>
              <View
                style={{ alignItems: 'center', paddingTop: space.sm + 2, paddingBottom: space.md }}>
                <View
                  style={{
                    width: 42,
                    height: 5,
                    borderRadius: 3,
                    backgroundColor: colors.borderStrong,
                  }}
                />
              </View>
              {title ? (
                <View style={{ marginBottom: space.lg, gap: 2 }}>
                  <Text variant="title2" accessibilityRole="header">
                    {title}
                  </Text>
                  {subtitle ? (
                    <Text variant="footnote" tone="secondary">
                      {subtitle}
                    </Text>
                  ) : null}
                </View>
              ) : null}
              {children}
            </Animated.View>
          </GestureDetector>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import { ChartSpline, History, Landmark, Plus, Wallet, type LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, useDerivedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tr } from '@/i18n/tr';
import { haptics } from '@/lib/haptics';
import { useTheme } from '@/theme/ThemeProvider';
import {
  GUTTER,
  motion,
  radius,
  softShadow,
  space,
  TAB_BAR_BOTTOM_GAP,
  TAB_BAR_HEIGHT,
} from '@/theme/tokens';
import { PressableScale, Text } from '@/ui';

import { QuickActionSheet } from './QuickActionSheet';

const TAB_META: Record<string, { label: string; icon: LucideIcon }> = {
  index: { label: tr.tabs.portfolio, icon: Wallet },
  analiz: { label: tr.tabs.analysis, icon: ChartSpline },
  fon: { label: tr.tabs.fund, icon: Landmark },
  gecmis: { label: tr.tabs.history, icon: History },
};

/** Floating, rounded tab bar with a gradient "+" quick-action button in the middle. */
export function TabBar({ state, emitter, navigateToTab }: BottomTabBarProps) {
  const { colors, dark } = useTheme();
  const insets = useSafeAreaInsets();
  const [quickOpen, setQuickOpen] = useState(false);

  const routes = state.routes.filter((r) => TAB_META[r.name]);
  const half = Math.ceil(routes.length / 2);

  const renderTab = (route: (typeof routes)[number]) => {
    const index = state.routes.findIndex((r) => r.key === route.key);
    const focused = state.index === index;
    const meta = TAB_META[route.name];
    return (
      <TabItem
        key={route.key}
        label={meta.label}
        icon={meta.icon}
        focused={focused}
        onPress={() => {
          const event = emitter.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) {
            haptics.selection();
            navigateToTab(route.key);
          }
        }}
      />
    );
  };

  return (
    <>
      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          left: GUTTER,
          right: GUTTER,
          bottom: insets.bottom + TAB_BAR_BOTTOM_GAP,
        }}>
        <View
          accessibilityRole="tablist"
          style={{
            height: TAB_BAR_HEIGHT,
            borderRadius: radius.xl,
            backgroundColor: colors.tabBar,
            borderWidth: 1,
            borderColor: colors.tabBarBorder,
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: space.xs,
            boxShadow: softShadow(colors.shadow, dark ? 3 : 2),
          }}>
          {routes.slice(0, half).map(renderTab)}
          <PressableScale
            haptic="medium"
            scaleTo={0.9}
            onPress={() => setQuickOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={tr.tabs.quickAction}
            style={{
              marginHorizontal: space.xs,
              borderRadius: 26,
              boxShadow: softShadow(colors.ctaGradient[0], 2),
            }}>
            <LinearGradient
              colors={colors.ctaGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                width: 52,
                height: 52,
                borderRadius: 26,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Plus size={26} color={colors.textOnAccent} strokeWidth={2.8} />
            </LinearGradient>
          </PressableScale>
          {routes.slice(half).map(renderTab)}
        </View>
      </View>
      <QuickActionSheet visible={quickOpen} onClose={() => setQuickOpen(false)} />
    </>
  );
}

function TabItem({
  label,
  icon: Icon,
  focused,
  onPress,
}: {
  label: string;
  icon: LucideIcon;
  focused: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const progress = useDerivedValue(() => withSpring(focused ? 1 : 0, motion.springSoft));
  const pillStyle = useAnimatedStyle(() => ({
    opacity: progress.get(),
    transform: [{ scaleX: 0.6 + progress.get() * 0.4 }],
  }));
  const color = focused ? colors.accent : colors.textTertiary;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, height: '100%' }}>
      <View style={{ alignItems: 'center', justifyContent: 'center', width: 52, height: 30 }}>
        <Animated.View
          style={[
            {
              position: 'absolute',
              width: 52,
              height: 30,
              borderRadius: 15,
              backgroundColor: colors.accentSoft,
            },
            pillStyle,
          ]}
        />
        <Icon size={21} color={color} strokeWidth={focused ? 2.5 : 2.1} />
      </View>
      <Text variant="caption" color={color} style={{ fontSize: 11, lineHeight: 13 }}>
        {label}
      </Text>
    </Pressable>
  );
}

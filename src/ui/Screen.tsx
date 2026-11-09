import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import type { ReactNode } from 'react';
import {
  RefreshControl,
  ScrollView,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColors } from '@/theme/ThemeProvider';
import { GUTTER, space, TAB_BAR_BOTTOM_GAP, TAB_BAR_HEIGHT } from '@/theme/tokens';

import { IconButton } from './IconButton';
import { Text } from './Text';

export interface ScreenProps {
  children?: ReactNode;
  /** Rendered above the scroll area (not scrolled). */
  header?: ReactNode;
  /** Leave room for the floating tab bar (tab screens). */
  withTabBar?: boolean;
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  /** Fixed below the scroll area (e.g. AL / SAT buttons). */
  footer?: ReactNode;
  /** Vertical scroll position, for headers that change while scrolling. */
  onScrollY?: (y: number) => void;
  /** Pull to refresh. */
  refreshing?: boolean;
  onRefresh?: () => void;
}

/** Screen container: themed background, safe-area padding, gutter and bottom room. */
export function Screen({
  children,
  header,
  withTabBar = false,
  scroll = true,
  contentStyle,
  footer,
  onScrollY,
  refreshing = false,
  onRefresh,
}: ScreenProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottom = footer
    ? space.lg
    : insets.bottom + (withTabBar ? TAB_BAR_HEIGHT + TAB_BAR_BOTTOM_GAP + space.xl : space.xxl);
  const inner: StyleProp<ViewStyle> = [
    { paddingHorizontal: GUTTER, paddingBottom: bottom, gap: space.lg },
    contentStyle,
  ];
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      {header}
      {scroll ? (
        <ScrollView
          contentContainerStyle={inner}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          scrollEventThrottle={32}
          onScroll={
            onScrollY
              ? (e: NativeSyntheticEvent<NativeScrollEvent>) =>
                  onScrollY(e.nativeEvent.contentOffset.y)
              : undefined
          }
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.accent}
                colors={[colors.accent]}
                progressBackgroundColor={colors.surface}
              />
            ) : undefined
          }>
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, inner]}>{children}</View>
      )}
      {footer ? (
        <View
          style={{
            paddingHorizontal: GUTTER,
            paddingTop: space.md,
            paddingBottom: insets.bottom + space.md,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            backgroundColor: colors.bg,
          }}>
          {footer}
        </View>
      ) : null}
    </View>
  );
}

/** Large title header for tab screens, with optional right-side actions. */
export function TabHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <View
      style={{
        paddingHorizontal: GUTTER,
        paddingTop: space.md,
        paddingBottom: space.md,
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: space.md,
      }}>
      <View style={{ flex: 1 }}>
        {subtitle ? (
          <Text variant="overline" tone="tertiary">
            {subtitle}
          </Text>
        ) : null}
        <Text variant="title1" accessibilityRole="header">
          {title}
        </Text>
      </View>
      {right ? <View style={{ flexDirection: 'row', gap: space.sm }}>{right}</View> : null}
    </View>
  );
}

/** Header for pushed (stack) screens: soft round back button + title. */
export function StackHeader({ title, right }: { title: string; right?: ReactNode }) {
  const router = useRouter();
  return (
    <View
      style={{
        paddingHorizontal: GUTTER,
        paddingVertical: space.sm,
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.md,
        minHeight: 56,
      }}>
      <IconButton
        icon={ChevronLeft}
        accessibilityLabel="Geri"
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      />
      <Text variant="title3" numberOfLines={1} style={{ flex: 1 }} accessibilityRole="header">
        {title}
      </Text>
      {right}
    </View>
  );
}

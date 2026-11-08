import { CircleCheck, Info, Trash2, type LucideIcon } from 'lucide-react-native';
import { View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';

import { useTheme } from '@/theme/ThemeProvider';
import {
  GUTTER,
  radius,
  softShadow,
  space,
  TAB_BAR_BOTTOM_GAP,
  TAB_BAR_HEIGHT,
} from '@/theme/tokens';

import { PressableScale } from './PressableScale';
import { Text } from './Text';

export type ToastTone = 'neutral' | 'success' | 'danger';

export interface ToastOptions {
  message: string;
  tone?: ToastTone;
  /** e.g. "GERİ AL" — the undo bar after a delete. */
  actionLabel?: string;
  onAction?: () => void;
  durationMs?: number;
}

interface ToastItem extends Required<Pick<ToastOptions, 'message' | 'tone'>> {
  id: number;
  actionLabel?: string;
  onAction?: () => void;
}

interface ToastState {
  current: ToastItem | null;
  show: (options: ToastOptions) => void;
  hide: (id?: number) => void;
}

let nextId = 1;
let timer: ReturnType<typeof setTimeout> | undefined;

const useToastStore = create<ToastState>((set, get) => ({
  current: null,
  show: ({ message, tone = 'neutral', actionLabel, onAction, durationMs }) => {
    const id = nextId++;
    if (timer) clearTimeout(timer);
    set({ current: { id, message, tone, actionLabel, onAction } });
    timer = setTimeout(() => get().hide(id), durationMs ?? (actionLabel ? 5000 : 3000));
  },
  hide: (id) => {
    const current = get().current;
    if (current && (id === undefined || current.id === id)) set({ current: null });
  },
}));

/** Imperative API: `toast.show({ message: 'Silindi', actionLabel: 'GERİ AL', onAction })`. */
export const toast = {
  show: (options: ToastOptions) => useToastStore.getState().show(options),
  hide: () => useToastStore.getState().hide(),
};

const ICON: Record<ToastTone, LucideIcon> = { neutral: Info, success: CircleCheck, danger: Trash2 };

/** Mount once near the root; floats above the tab bar. */
export function ToastHost() {
  const { colors, dark } = useTheme();
  const insets = useSafeAreaInsets();
  const current = useToastStore((s) => s.current);
  if (!current) return null;

  const Icon = ICON[current.tone];
  const iconColor =
    current.tone === 'success'
      ? colors.up
      : current.tone === 'danger'
        ? colors.down
        : colors.accent;
  const background = dark ? colors.surfacePressed : '#1B2742';
  const foreground = dark ? colors.text : '#FFFFFF';

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: GUTTER,
        right: GUTTER,
        bottom: insets.bottom + TAB_BAR_HEIGHT + TAB_BAR_BOTTOM_GAP + space.md,
      }}>
      <Animated.View
        key={current.id}
        entering={FadeInDown.springify().damping(16)}
        exiting={FadeOutDown.duration(180)}
        accessibilityLiveRegion="polite"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.md,
          paddingVertical: space.md,
          paddingLeft: space.lg,
          paddingRight: current.actionLabel ? space.sm : space.lg,
          borderRadius: radius.lg,
          backgroundColor: background,
          borderWidth: dark ? 1 : 0,
          borderColor: colors.borderStrong,
          boxShadow: softShadow(colors.shadow, 3),
        }}>
        <Icon size={20} color={iconColor} strokeWidth={2.4} />
        <Text variant="callout" color={foreground} style={{ flex: 1 }} numberOfLines={2}>
          {current.message}
        </Text>
        {current.actionLabel ? (
          <PressableScale
            haptic="medium"
            onPress={() => {
              current.onAction?.();
              useToastStore.getState().hide(current.id);
            }}
            accessibilityRole="button"
            style={{
              paddingHorizontal: space.md,
              paddingVertical: space.sm,
              borderRadius: radius.sm,
              backgroundColor: colors.accentSoft,
            }}>
            <Text variant="overline" tone="accent">
              {current.actionLabel}
            </Text>
          </PressableScale>
        ) : null}
      </Animated.View>
    </View>
  );
}

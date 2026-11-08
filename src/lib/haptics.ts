import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

import { useSettings } from '@/state/settings';

function enabled() {
  return Platform.OS !== 'web' && useSettings.getState().hapticsEnabled;
}

function run(fn: () => Promise<void>) {
  if (!enabled()) return;
  fn().catch(() => {});
}

/** Haptic vocabulary used across the app (doc: 01-PROJE-DOKUMANI §9). */
export const haptics = {
  /** Tab switch, chip/segment change, chart scrub ticks. */
  selection: () => run(() => Haptics.selectionAsync()),
  /** Button press. */
  light: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  /** Swipe threshold crossed, sheet snap. */
  medium: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  /** Transaction saved. */
  success: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  /** Delete / destructive confirmation. */
  warning: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  error: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};

export type HapticKind = keyof typeof haptics;

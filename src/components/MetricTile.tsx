import { Info } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';
import { PressableScale, Sheet, Text } from '@/ui';

import { METRIC_INFO, type MetricKey } from './metricInfo';

/** Compact metric: label with ⓘ, big value, one muted line under it. Tap → explanation. */
export function MetricTile({
  label,
  value,
  sub,
  tone,
  onPress,
}: {
  label: string;
  value: string;
  sub?: ReactNode;
  tone?: 'up' | 'down' | 'primary';
  onPress?: () => void;
}) {
  const { colors } = useTheme();
  return (
    <PressableScale
      onPress={onPress}
      haptic="selection"
      scaleTo={0.97}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      accessibilityHint="Açıklamayı göster"
      style={{
        flexBasis: '47%',
        flexGrow: 1,
        padding: space.md,
        borderRadius: radius.md,
        backgroundColor: colors.surfaceAlt,
        gap: 4,
      }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Text variant="caption" tone="secondary" numberOfLines={1} style={{ flexShrink: 1 }}>
          {label}
        </Text>
        <Info size={12} color={colors.textTertiary} strokeWidth={2.2} />
      </View>
      <Text variant="numL" tone={tone ?? 'primary'}>
        {value}
      </Text>
      {typeof sub === 'string' ? (
        <Text variant="caption" tone="tertiary" numberOfLines={1}>
          {sub}
        </Text>
      ) : (
        sub
      )}
    </PressableScale>
  );
}

/** Bottom sheet explaining a metric in plain Turkish, with the current value and formula. */
export function MetricInfoSheet({
  metric,
  value,
  context,
  onClose,
}: {
  metric: MetricKey | null;
  value?: string;
  context?: string;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const info = metric ? METRIC_INFO[metric] : null;
  return (
    <Sheet visible={!!metric} onClose={onClose} title={info?.title} subtitle={info?.short}>
      {info ? (
        <View style={{ gap: space.lg }}>
          {value ? (
            <Text variant="title1" tone="accent">
              {value}
            </Text>
          ) : null}
          <Text variant="body" tone="secondary">
            {info.body}
          </Text>
          <View
            style={{
              padding: space.md,
              borderRadius: radius.md,
              backgroundColor: colors.surfaceAlt,
              gap: space.xs,
            }}>
            <Text variant="overline" tone="tertiary">
              NASIL HESAPLANIR
            </Text>
            <Text variant="footnote">{info.formula}</Text>
          </View>
          {context ? (
            <Text variant="caption" tone="tertiary">
              {context}
            </Text>
          ) : null}
        </View>
      ) : null}
    </Sheet>
  );
}

import { View } from 'react-native';

import { useColors } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';
import { formatPercent } from '@/utils/format';

import { Text } from './Text';

export interface AllocationSegment {
  key: string;
  label: string;
  value: number;
  color: string;
}

/** Rounded, gapped horizontal bar with a legend: "BIST %48 · ABD %34 · Kripto %18". */
export function AllocationBar({
  segments,
  height = 10,
  showLegend = true,
}: {
  segments: AllocationSegment[];
  height?: number;
  showLegend?: boolean;
}) {
  const colors = useColors();
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  return (
    <View style={{ gap: space.md }}>
      <View
        style={{ flexDirection: 'row', gap: 4, height }}
        accessibilityLabel={segments
          .map((s) => `${s.label} ${formatPercent(s.value / total, { decimals: 0 })}`)
          .join(', ')}>
        {segments.map((s) => (
          <View
            key={s.key}
            style={{
              flex: s.value / total,
              backgroundColor: s.color,
              borderRadius: height / 2,
              minWidth: height,
            }}
          />
        ))}
        {segments.length === 0 ? (
          <View style={{ flex: 1, backgroundColor: colors.surfaceAlt, borderRadius: height / 2 }} />
        ) : null}
      </View>
      {showLegend ? (
        <View
          style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: space.lg, rowGap: space.xs }}>
          {segments.map((s) => (
            <View
              key={s.key}
              style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs + 2 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: s.color }} />
              <Text variant="caption" tone="secondary">
                {s.label}
              </Text>
              <Text variant="numS">{formatPercent(s.value / total, { decimals: 0 })}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

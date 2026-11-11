import { useRouter } from 'expo-router';
import { BookOpen, ChevronRight } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { guideEntry, type Evidence } from '@/science/guide';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';
import { PressableScale, SectionHeader, Text, type TextTone } from '@/ui';

/** "Bilim: …" link under a measurement, to the guide entry it rests on. */
export function ScienceLink({ id }: { id: string }) {
  const { colors } = useTheme();
  const router = useRouter();
  const entry = guideEntry(id);
  if (!entry) return null;
  return (
    <PressableScale
      onPress={() => router.push(`/rehber/${id}`)}
      haptic="selection"
      scaleTo={0.98}
      accessibilityRole="link"
      accessibilityLabel={`Bilim Rehberi: ${entry.title}`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.sm,
        paddingVertical: space.sm,
        paddingHorizontal: space.md,
        borderRadius: radius.sm,
        backgroundColor: colors.accentSoft,
      }}>
      <BookOpen size={14} color={colors.accent} strokeWidth={2.4} />
      <Text variant="caption" tone="accent" numberOfLines={1} style={{ flex: 1 }}>
        Bilim: {entry.title}
      </Text>
      <ChevronRight size={14} color={colors.accent} strokeWidth={2.4} />
    </PressableScale>
  );
}

export function EvidenceBadge({ evidence }: { evidence: Evidence }) {
  const { colors } = useTheme();
  const bg =
    evidence === 'güçlü'
      ? colors.upSoft
      : evidence === 'orta'
        ? colors.accent2Soft
        : colors.warningSoft;
  const tone: TextTone = evidence === 'güçlü' ? 'up' : evidence === 'orta' ? 'accent2' : 'warning';
  return (
    <View
      style={{
        paddingHorizontal: space.sm,
        paddingVertical: 2,
        borderRadius: radius.pill,
        backgroundColor: bg,
        alignSelf: 'flex-start',
      }}>
      <Text variant="caption" tone={tone}>
        Kanıt: {evidence}
      </Text>
    </View>
  );
}

/** Title row of a science card: overline title and an optional right-hand note. */
export function CardTitle({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: space.sm,
      }}>
      <SectionHeader title={title} />
      {typeof right === 'string' ? (
        <Text variant="caption" tone="tertiary">
          {right}
        </Text>
      ) : (
        right
      )}
    </View>
  );
}

export type VerdictTone = 'up' | 'down' | 'warning' | 'neutral';

/** A coloured box with the plain-language reading of a measurement. */
export function Verdict({
  tone,
  title,
  text,
}: {
  tone: VerdictTone;
  title: string;
  text?: string;
}) {
  const { colors } = useTheme();
  const bg =
    tone === 'up'
      ? colors.upSoft
      : tone === 'down'
        ? colors.downSoft
        : tone === 'warning'
          ? colors.warningSoft
          : colors.surfaceAlt;
  const bar =
    tone === 'up'
      ? colors.up
      : tone === 'down'
        ? colors.down
        : tone === 'warning'
          ? colors.warning
          : colors.textTertiary;
  return (
    <View
      style={{
        flexDirection: 'row',
        gap: space.md,
        padding: space.md,
        borderRadius: radius.md,
        backgroundColor: bg,
      }}>
      <View style={{ width: 3, borderRadius: 2, backgroundColor: bar }} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="subhead">{title}</Text>
        {text ? (
          <Text variant="footnote" tone="secondary">
            {text}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

/** Label on the left, a bar in the middle, the value on the right. */
export function MeterRow({
  label,
  value,
  ratio,
  color,
  marker,
}: {
  label: string;
  value: string;
  /** 0–1 fill. */
  ratio: number;
  color: string;
  /** Optional reference mark (0–1), e.g. a target. */
  marker?: number;
}) {
  const { colors } = useTheme();
  const fill = Math.max(0, Math.min(1, ratio));
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.sm }}>
        <Text variant="footnote" tone="secondary" style={{ flex: 1 }} numberOfLines={1}>
          {label}
        </Text>
        <Text variant="numS">{value}</Text>
      </View>
      <View
        style={{
          height: 8,
          borderRadius: 4,
          backgroundColor: colors.surfaceAlt,
          overflow: 'hidden',
        }}>
        <View
          style={{
            width: `${fill * 100}%`,
            height: '100%',
            borderRadius: 4,
            backgroundColor: color,
          }}
        />
        {marker !== undefined ? (
          <View
            style={{
              position: 'absolute',
              left: `${Math.max(0, Math.min(1, marker)) * 100}%`,
              top: 0,
              bottom: 0,
              width: 2,
              marginLeft: -1,
              backgroundColor: colors.text,
            }}
          />
        ) : null}
      </View>
    </View>
  );
}

/** Small stat block: label over value, optional muted line. */
export function Stat({
  label,
  value,
  sub,
  tone = 'primary',
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: TextTone;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexBasis: '47%',
        flexGrow: 1,
        padding: space.md,
        borderRadius: radius.md,
        backgroundColor: colors.surfaceAlt,
        gap: 3,
      }}>
      <Text variant="caption" tone="secondary" numberOfLines={1}>
        {label}
      </Text>
      <Text variant="numL" tone={tone}>
        {value}
      </Text>
      {sub ? (
        <Text variant="caption" tone="tertiary" numberOfLines={2}>
          {sub}
        </Text>
      ) : null}
    </View>
  );
}

export function Stats({ children }: { children: ReactNode }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>{children}</View>;
}

/** Muted footnote text. */
export function Footnote({ children }: { children: ReactNode }) {
  return (
    <Text variant="caption" tone="tertiary">
      {children}
    </Text>
  );
}

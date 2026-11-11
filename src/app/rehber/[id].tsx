import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowUpRight, ChevronRight, Gauge, Lightbulb } from 'lucide-react-native';
import { Linking, View } from 'react-native';

import { EvidenceBadge } from '@/components/science/bits';
import { EVIDENCE_TEXT, GUIDE, GUIDE_CATEGORIES, guideEntry } from '@/science/guide';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';
import {
  Card,
  EmptyState,
  PressableScale,
  Screen,
  SectionHeader,
  StackHeader,
  Text,
  toast,
} from '@/ui';

export default function GuideEntryScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const g = guideEntry(String(id));
  if (!g) {
    return (
      <Screen header={<StackHeader title="Bilim Rehberi" />}>
        <EmptyState icon={Lightbulb} title="Bulunamadı" message="Bu bulgu artık rehberde yok." />
      </Screen>
    );
  }
  const related = GUIDE.filter((x) => x.category === g.category && x.id !== g.id).slice(0, 3);
  const open = (url: string) =>
    Linking.openURL(url).catch(() => toast.show({ message: 'Bağlantı açılamadı' }));
  return (
    <Screen header={<StackHeader title="Bilim Rehberi" />}>
      <View style={{ gap: space.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <Text variant="overline" tone="accent">
            {GUIDE_CATEGORIES.find((c) => c.key === g.category)!.label.toLocaleUpperCase('tr')}
          </Text>
          <EvidenceBadge evidence={g.evidence} />
        </View>
        <Text variant="title2">{g.title}</Text>
        <Text variant="body" tone="secondary">
          {g.claim}
        </Text>
      </View>

      <Card style={{ gap: space.md }}>
        <SectionHeader title="BULGU" />
        <Text variant="body">{g.body}</Text>
      </Card>

      <Card variant="alt" style={{ gap: space.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <Lightbulb size={16} color={colors.accent2} strokeWidth={2.4} />
          <Text variant="subhead">Ne anlama geliyor?</Text>
        </View>
        <Text variant="footnote" tone="secondary">
          {g.meaning}
        </Text>
      </Card>

      {g.link ? (
        <PressableScale
          onPress={() => router.push(g.link!.href as never)}
          haptic="selection"
          scaleTo={0.98}
          accessibilityRole="link"
          accessibilityLabel={`Portföyünde ölç: ${g.link.label}`}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: space.md,
            padding: space.lg,
            borderRadius: radius.lg,
            backgroundColor: colors.accentSoft,
          }}>
          <Gauge size={20} color={colors.accent} strokeWidth={2.2} />
          <View style={{ flex: 1 }}>
            <Text variant="subhead" tone="accent">
              Portföyünde ölç
            </Text>
            <Text variant="caption" tone="secondary">
              {g.link.label}
            </Text>
          </View>
          <ChevronRight size={18} color={colors.accent} strokeWidth={2.4} />
        </PressableScale>
      ) : null}

      <Card style={{ gap: space.md }}>
        <SectionHeader title="KAYNAKLAR" />
        {g.sources.map((s, i) => (
          <PressableScale
            key={s.text}
            disabled={!s.url}
            onPress={() => s.url && open(s.url)}
            haptic="selection"
            scaleTo={0.99}
            accessibilityRole={s.url ? 'link' : 'text'}
            style={{
              flexDirection: 'row',
              gap: space.sm,
              paddingTop: i ? space.md : 0,
              borderTopWidth: i ? 1 : 0,
              borderTopColor: colors.border,
            }}>
            <Text variant="footnote" style={{ flex: 1 }}>
              {s.text}
            </Text>
            {s.url ? <ArrowUpRight size={16} color={colors.accent} strokeWidth={2.2} /> : null}
          </PressableScale>
        ))}
        <Text variant="caption" tone="tertiary">
          Kanıt düzeyi “{g.evidence}”: {EVIDENCE_TEXT[g.evidence]}
        </Text>
      </Card>

      {related.length ? (
        <View style={{ gap: space.sm }}>
          <SectionHeader title="AYNI KONUDA" />
          {related.map((r) => (
            <PressableScale
              key={r.id}
              onPress={() => router.replace(`/rehber/${r.id}`)}
              haptic="selection"
              scaleTo={0.985}
              accessibilityRole="button"
              accessibilityLabel={r.title}>
              <Card
                padding="md"
                style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text variant="callout">{r.title}</Text>
                  <Text variant="caption" tone="secondary" numberOfLines={2}>
                    {r.claim}
                  </Text>
                </View>
                <ChevronRight size={16} color={colors.textTertiary} strokeWidth={2.2} />
              </Card>
            </PressableScale>
          ))}
        </View>
      ) : null}
      <Text variant="caption" tone="tertiary" align="center">
        Genel bilgi amaçlıdır; kişiye özel yatırım tavsiyesi değildir.
      </Text>
    </Screen>
  );
}

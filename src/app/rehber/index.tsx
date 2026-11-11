import { useRouter } from 'expo-router';
import { FlaskConical } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { EvidenceBadge } from '@/components/science/bits';
import { GUIDE, GUIDE_CATEGORIES, shortCite, type GuideCategory } from '@/science/guide';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';
import { Card, Chip, PressableScale, Screen, StackHeader, Text } from '@/ui';

/**
 * Bilim Rehberi: findings from finance research, each with sources, the strength of the
 * evidence and where the app measures it on the person's own portfolio.
 */
export default function GuideScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [category, setCategory] = useState<GuideCategory | 'all'>('all');
  const entries = GUIDE.filter((g) => category === 'all' || g.category === category);
  return (
    <Screen header={<StackHeader title="Bilim Rehberi" />}>
      <Card variant="alt" style={{ gap: space.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <FlaskConical size={18} color={colors.accent} strokeWidth={2.4} />
          <Text variant="title3">Araştırmalar ne diyor?</Text>
        </View>
        <Text variant="footnote" tone="secondary">
          Hakemli dergilerde yayımlanmış ve uzun süreli kamuya açık çalışmalardan {GUIDE.length}{' '}
          bulgu. Her kartta kaynak, kanıtın gücü ve uygulamanın bunu senin portföyünde nerede
          ölçtüğü var.
        </Text>
        <Text variant="caption" tone="tertiary">
          Genel bilgi amaçlıdır; kişiye özel yatırım tavsiyesi değildir.
        </Text>
      </Card>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.xs + 2 }}>
        <Chip
          label="Tümü"
          size="sm"
          selected={category === 'all'}
          onPress={() => setCategory('all')}
        />
        {GUIDE_CATEGORIES.map((c) => (
          <Chip
            key={c.key}
            label={c.label}
            size="sm"
            selected={category === c.key}
            onPress={() => setCategory(c.key)}
          />
        ))}
      </View>
      {entries.map((g) => (
        <PressableScale
          key={g.id}
          onPress={() => router.push(`/rehber/${g.id}`)}
          haptic="selection"
          scaleTo={0.985}
          accessibilityRole="button"
          accessibilityLabel={g.title}>
          <Card style={{ gap: space.sm }}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: space.sm,
              }}>
              <Text variant="overline" tone="accent">
                {GUIDE_CATEGORIES.find((c) => c.key === g.category)!.label.toLocaleUpperCase('tr')}
              </Text>
              <EvidenceBadge evidence={g.evidence} />
            </View>
            <Text variant="title3">{g.title}</Text>
            <Text variant="footnote" tone="secondary">
              {g.claim}
            </Text>
            <Text variant="caption" tone="tertiary" numberOfLines={1}>
              {g.sources.map((s) => shortCite(s.text)).join(' · ')}
            </Text>
          </Card>
        </PressableScale>
      ))}
    </Screen>
  );
}

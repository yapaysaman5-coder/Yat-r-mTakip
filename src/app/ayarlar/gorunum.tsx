import { LinearGradient } from 'expo-linear-gradient';
import { Check, Smartphone } from 'lucide-react-native';
import { View } from 'react-native';

import { useSettings } from '@/state/settings';
import { useTheme } from '@/theme/ThemeProvider';
import { THEME_ORDER, THEMES } from '@/theme/themes';
import { radius, softShadow, space } from '@/theme/tokens';
import type { Theme } from '@/theme/types';
import {
  Card,
  ChangeBadge,
  IconWell,
  ListRow,
  PressableScale,
  Screen,
  SectionHeader,
  StackHeader,
  Text,
  Toggle,
} from '@/ui';

export default function AppearanceScreen() {
  const { colors } = useTheme();
  const preference = useSettings((s) => s.themePreference);
  const setPreference = useSettings((s) => s.setThemePreference);
  const colorBlind = useSettings((s) => s.colorBlindSafe);
  const setColorBlind = useSettings((s) => s.setColorBlindSafe);

  return (
    <Screen header={<StackHeader title="Görünüm" />}>
      <SectionHeader title="TEMA" style={{ paddingHorizontal: space.xs }} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
        {THEME_ORDER.map((id) => (
          <ThemeCard
            key={id}
            theme={THEMES[id]}
            selected={preference === id}
            onPress={() => setPreference(id)}
          />
        ))}
      </View>

      <Card padding={0} style={{ paddingHorizontal: space.lg }}>
        <ListRow
          title="Telefonun ayarını izle"
          subtitle="Koyu modda Okyanus, açık modda Gün"
          leading={
            <IconWell background={colors.accentSoft} size={34}>
              <Smartphone size={17} color={colors.accent} strokeWidth={2.4} />
            </IconWell>
          }
          trailing={
            <Toggle
              value={preference === 'system'}
              onValueChange={(on) => setPreference(on ? 'system' : 'okyanus')}
              accessibilityLabel="Telefonun açık/koyu ayarını izle"
            />
          }
        />
      </Card>

      <SectionHeader title="RENKLER" style={{ paddingHorizontal: space.xs, marginTop: space.sm }} />
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="callout">Renk körü dostu</Text>
            <Text variant="footnote" tone="secondary">
              Yükseliş mavi, düşüş turuncu gösterilir
            </Text>
          </View>
          <Toggle
            value={colorBlind}
            onValueChange={setColorBlind}
            accessibilityLabel="Renk körü dostu renkler"
          />
        </View>
        <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.lg }}>
          <ChangeBadge value={0.0213} size="md" />
          <ChangeBadge value={-0.0087} size="md" />
          <ChangeBadge value={12430} kind="money" size="md" />
        </View>
      </Card>
    </Screen>
  );
}

/** Mini, true-to-life preview of a theme: balance card, a row, the tab bar. */
function ThemeCard({
  theme,
  selected,
  onPress,
}: {
  theme: Theme;
  selected: boolean;
  onPress: () => void;
}) {
  const active = useTheme();
  const c = theme.colors;
  return (
    <PressableScale
      onPress={onPress}
      haptic="medium"
      scaleTo={0.96}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${theme.name} teması. ${theme.tagline}`}
      style={{
        flexBasis: '46%',
        flexGrow: 1,
        borderRadius: radius.lg,
        padding: space.sm,
        backgroundColor: active.colors.surface,
        borderWidth: 2,
        borderColor: selected ? active.colors.accent : active.colors.border,
        boxShadow: selected ? softShadow(active.colors.accent, 2) : undefined,
      }}>
      <View
        style={{
          borderRadius: radius.md,
          backgroundColor: c.bg,
          padding: space.sm,
          gap: 6,
          overflow: 'hidden',
        }}>
        <LinearGradient
          colors={c.heroGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ height: 58, borderRadius: 12, padding: 8, justifyContent: 'space-between' }}>
          <View
            style={{ width: 34, height: 4, borderRadius: 2, backgroundColor: c.heroTextSecondary }}
          />
          <View style={{ width: 70, height: 9, borderRadius: 4, backgroundColor: c.heroText }} />
          <View style={{ flexDirection: 'row', gap: 4 }}>
            <View style={{ width: 26, height: 7, borderRadius: 4, backgroundColor: c.heroGlass }} />
            <View style={{ width: 20, height: 7, borderRadius: 4, backgroundColor: c.heroGlass }} />
          </View>
        </LinearGradient>
        {[c.market.bist, c.market.us].map((m, i) => (
          <View
            key={m}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              backgroundColor: c.surface,
              borderRadius: 8,
              padding: 6,
            }}>
            <View
              style={{ width: 14, height: 14, borderRadius: 5, backgroundColor: m, opacity: 0.85 }}
            />
            <View
              style={{
                flex: 1,
                height: 5,
                borderRadius: 3,
                backgroundColor: c.textSecondary,
                opacity: 0.5,
              }}
            />
            <View
              style={{
                width: 18,
                height: 6,
                borderRadius: 3,
                backgroundColor: i === 0 ? c.up : c.down,
              }}
            />
          </View>
        ))}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-around',
            alignItems: 'center',
            backgroundColor: c.tabBar,
            borderRadius: 10,
            paddingVertical: 5,
          }}>
          <View style={{ width: 10, height: 4, borderRadius: 2, backgroundColor: c.accent }} />
          <View
            style={{ width: 10, height: 4, borderRadius: 2, backgroundColor: c.textTertiary }}
          />
          <LinearGradient
            colors={c.ctaGradient}
            style={{ width: 14, height: 14, borderRadius: 7 }}
          />
          <View
            style={{ width: 10, height: 4, borderRadius: 2, backgroundColor: c.textTertiary }}
          />
          <View
            style={{ width: 10, height: 4, borderRadius: 2, backgroundColor: c.textTertiary }}
          />
        </View>
      </View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginTop: space.sm,
          paddingHorizontal: 2,
        }}>
        <View style={{ flex: 1 }}>
          <Text variant="subhead">{theme.name}</Text>
          <Text variant="caption" tone="secondary" numberOfLines={2}>
            {theme.tagline}
          </Text>
        </View>
        {selected ? (
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: 11,
              backgroundColor: active.colors.accent,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Check size={14} color={active.colors.textOnAccent} strokeWidth={3} />
          </View>
        ) : null}
      </View>
    </PressableScale>
  );
}

import { useRouter } from 'expo-router';
import { Globe, LineChart, ShieldCheck, Sparkles } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { getDatabase, MAIN_PORTFOLIO_ID } from '@/data/database';
import { PORTFOLIO_REASON, renameOwnPortfolio } from '@/data/service/portfolios';
import { usePortfolioStore } from '@/state/portfolio';
import { useSettings } from '@/state/settings';
import { useTheme } from '@/theme/ThemeProvider';
import { THEME_ORDER, THEMES } from '@/theme/themes';
import { radius, space } from '@/theme/tokens';
import { Button, Card, IconWell, PressableScale, Screen, Text, TextField } from '@/ui';

/**
 * İlk açılış (docs/01-PROJE-DOKUMANI.md §6.10): welcome, theme with a live preview, the first
 * portfolio's name; then the first record or the example portfolio.
 */
export default function WelcomeScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const theme = useSettings((s) => s.themePreference);
  const setTheme = useSettings((s) => s.setThemePreference);
  const setOnboarded = useSettings((s) => s.setOnboarded);
  const select = usePortfolioStore((s) => s.select);
  const portfolios = usePortfolioStore((s) => s.portfolios);
  const main =
    portfolios.find((p) => p.id === MAIN_PORTFOLIO_ID) ?? portfolios.find((p) => p.kind === 'user');
  const demo = portfolios.find((p) => p.kind === 'demo');
  const [name, setName] = useState(main?.name ?? 'Ana Portföy');
  const [error, setError] = useState<string | null>(null);

  const finish = async (next: 'record' | 'demo') => {
    if (main && name.trim() !== main.name) {
      const r = await renameOwnPortfolio(await getDatabase(), main.id, name);
      if (!r.ok) {
        setError(PORTFOLIO_REASON[r.reason]);
        return;
      }
    }
    setOnboarded(true);
    if (next === 'demo' && demo) await select(demo.id);
    else if (main) await select(main.id);
    router.replace('/');
    if (next === 'record') router.push({ pathname: '/islem/nakit', params: { type: 'DEPOSIT' } });
  };

  const dots = (
    <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'center' }}>
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          style={{
            width: i === step ? 22 : 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: i === step ? colors.accent : colors.border,
          }}
        />
      ))}
    </View>
  );

  return (
    <Screen>
      <View style={{ gap: space.xl, paddingTop: space.xl }}>
        {dots}
        {step === 0 ? (
          <>
            <View style={{ alignItems: 'center', gap: space.md }}>
              <IconWell background={colors.accentSoft} size={84}>
                <LineChart size={40} color={colors.accent} strokeWidth={2.2} />
              </IconWell>
              <Text variant="title1" align="center">
                Hoş geldin
              </Text>
              <Text variant="body" tone="secondary" align="center">
                BIST, ABD borsaları ve kripto paralar tek yerde: gerçek fiyatlar, profesyonel
                ölçüler, sade bir görünüm.
              </Text>
            </View>
            <Card style={{ gap: space.md }}>
              {(
                [
                  [Globe, 'Canlı fiyatlar', 'BIST, ABD hisseleri, kripto, döviz ve altın'],
                  [
                    Sparkles,
                    'Gerçek getirin',
                    'TWR, XIRR, Alpha ve “Ya Olsaydı?” karşılaştırmaları',
                  ],
                  [ShieldCheck, 'Veriler sende', 'Hesap yok, sunucu yok: her şey bu telefonda'],
                ] as const
              ).map(([I, title, sub]) => (
                <View
                  key={title}
                  style={{ flexDirection: 'row', gap: space.md, alignItems: 'center' }}>
                  <IconWell background={colors.accentSoft} size={40}>
                    <I size={19} color={colors.accent} strokeWidth={2.4} />
                  </IconWell>
                  <View style={{ flex: 1 }}>
                    <Text variant="callout">{title}</Text>
                    <Text variant="caption" tone="secondary">
                      {sub}
                    </Text>
                  </View>
                </View>
              ))}
            </Card>
            <Button label="Başla" fullWidth onPress={() => setStep(1)} />
          </>
        ) : null}

        {step === 1 ? (
          <>
            <View style={{ gap: space.xs }}>
              <Text variant="title2">Görünümünü seç</Text>
              <Text variant="body" tone="secondary">
                Dokununca hemen uygulanır; sonra Ayarlar’dan değiştirebilirsin.
              </Text>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
              {THEME_ORDER.map((id) => {
                const t = THEMES[id];
                const selected = theme === id;
                return (
                  <PressableScale
                    key={id}
                    onPress={() => setTheme(id)}
                    haptic="selection"
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`${t.name} teması`}
                    style={{
                      flexBasis: '47%',
                      flexGrow: 1,
                      borderRadius: radius.lg,
                      padding: space.md,
                      gap: space.sm,
                      backgroundColor: t.colors.bg,
                      borderWidth: 2,
                      borderColor: selected ? colors.accent : t.colors.border,
                    }}>
                    <View
                      style={{
                        height: 46,
                        borderRadius: radius.md,
                        backgroundColor: t.colors.heroGradient?.[0] ?? t.colors.accent,
                      }}
                    />
                    <View style={{ flexDirection: 'row', gap: 4 }}>
                      {[t.colors.accent, t.colors.up, t.colors.down, t.colors.accent2].map(
                        (c, i) => (
                          <View
                            key={i}
                            style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: c }}
                          />
                        ),
                      )}
                    </View>
                    <Text variant="callout" color={t.colors.text}>
                      {t.name}
                    </Text>
                  </PressableScale>
                );
              })}
            </View>
            <Button label="Devam" fullWidth onPress={() => setStep(2)} />
          </>
        ) : null}

        {step === 2 ? (
          <>
            <View style={{ gap: space.xs }}>
              <Text variant="title2">İlk portföyün</Text>
              <Text variant="body" tone="secondary">
                Kayıtlarını bu portföyde tutacaksın. İstersen sonra yenilerini eklersin.
              </Text>
            </View>
            <TextField
              label="Portföy adı"
              value={name}
              onChangeText={(t) => {
                setName(t);
                setError(null);
              }}
              maxLength={40}
              error={error}
            />
            <View style={{ gap: space.sm }}>
              <Button label="İlk kaydımı ekle" fullWidth onPress={() => finish('record')} />
              {demo ? (
                <Button
                  label="Örnek portföyle keşfet"
                  variant="secondary"
                  fullWidth
                  onPress={() => finish('demo')}
                />
              ) : null}
            </View>
            <Text variant="caption" tone="tertiary" align="center">
              Örnek portföy kurgusal fiyatlarla çalışır; Ayarlar › Veri’den tek dokunuşla
              kaldırılır.
            </Text>
          </>
        ) : null}
      </View>
    </Screen>
  );
}

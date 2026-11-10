import { useRouter } from 'expo-router';
import {
  Bell,
  Calculator,
  CircleDollarSign,
  Database,
  EyeOff,
  Info,
  Layers,
  LineChart,
  Palette,
  ShieldCheck,
  Shapes,
  Vibrate,
  Wifi,
  type LucideIcon,
} from 'lucide-react-native';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { useSettings } from '@/state/settings';
import { resolveThemeId, useTheme } from '@/theme/ThemeProvider';
import { THEMES } from '@/theme/themes';
import { radius, space } from '@/theme/tokens';
import { Card, IconWell, ListRow, Screen, SectionHeader, StackHeader, Text, Toggle } from '@/ui';

export default function SettingsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const preference = useSettings((s) => s.themePreference);
  const privacy = useSettings((s) => s.privacyMode);
  const togglePrivacy = useSettings((s) => s.togglePrivacyMode);
  const haptics = useSettings((s) => s.hapticsEnabled);
  const setHaptics = useSettings((s) => s.setHapticsEnabled);
  const costMethod = useSettings((s) => s.costMethod);
  const lockEnabled = useSettings((s) => s.lockEnabled);

  const themeLabel =
    preference === 'system'
      ? `Sistem (${THEMES[resolveThemeId('system', 'dark')].name} / ${THEMES[resolveThemeId('system', 'light')].name})`
      : THEMES[preference].name;

  const icon = (Icon: LucideIcon, color: string, bg: string) => (
    <IconWell background={bg} size={34}>
      <Icon size={17} color={color} strokeWidth={2.4} />
    </IconWell>
  );

  return (
    <Screen header={<StackHeader title="Ayarlar" />}>
      <Group title="GÖRÜNÜM">
        <ListRow
          title="Tema"
          subtitle={themeLabel}
          leading={icon(Palette, colors.accent, colors.accentSoft)}
          showChevron
          onPress={() => router.push('/ayarlar/gorunum')}
        />
        <ListRow
          title="Tasarım vitrini"
          subtitle="Tüm bileşenler, tüm durumlar"
          leading={icon(Shapes, colors.accent2, colors.accent2Soft)}
          showChevron
          onPress={() => router.push('/ayarlar/vitrin')}
        />
      </Group>

      <Group title="GİZLİLİK VE DENEYİM">
        <ListRow
          title="Tutarları gizle"
          subtitle="Bakiye ve tutarlar ••••• olarak görünür"
          leading={icon(EyeOff, colors.accent, colors.accentSoft)}
          trailing={
            <Toggle
              value={privacy}
              onValueChange={togglePrivacy}
              accessibilityLabel="Tutarları gizle"
            />
          }
        />
        <ListRow
          title="Titreşim"
          subtitle="Dokunuşlarda hafif titreşim"
          leading={icon(Vibrate, colors.accent2, colors.accent2Soft)}
          trailing={
            <Toggle value={haptics} onValueChange={setHaptics} accessibilityLabel="Titreşim" />
          }
        />
      </Group>

      <Group title="VERİ">
        <ListRow
          title="Veri ve Yedekleme"
          subtitle="Yedekle, geri yükle, örnek portföy, hız testi"
          leading={icon(Database, colors.accent, colors.accentSoft)}
          showChevron
          onPress={() => router.push('/ayarlar/veri')}
        />
        <ListRow
          title="Veri kaynakları"
          subtitle="Canlı fiyatlar, kaynak durumu, yenile"
          leading={icon(Wifi, colors.accent2, colors.accent2Soft)}
          showChevron
          onPress={() => router.push('/ayarlar/kaynaklar')}
        />
        <ListRow
          title="Piyasalar"
          subtitle="İzleme listesi ve sembol arama"
          leading={icon(LineChart, colors.accent, colors.accentSoft)}
          showChevron
          onPress={() => router.push('/piyasalar')}
        />
      </Group>

      <Group title="HESAP">
        <ListRow
          title="Portföyler"
          subtitle="Ekle, yeniden adlandır, sil, seç"
          leading={icon(Layers, colors.accent, colors.accentSoft)}
          showChevron
          onPress={() => router.push('/ayarlar/portfoyler')}
        />
        <ListRow
          title="Hesaplama"
          subtitle={`${costMethod === 'fifo' ? 'FIFO' : 'Ağırlıklı ortalama'} · komisyonlar · risksiz faiz`}
          leading={icon(Calculator, colors.accent2, colors.accent2Soft)}
          showChevron
          onPress={() => router.push('/ayarlar/hesaplama')}
        />
        <ListRow
          title="Güvenlik ve gizlilik"
          subtitle={lockEnabled ? 'Kilit açık' : 'Parmak izi kilidi, ekran koruması'}
          leading={icon(ShieldCheck, colors.up, colors.upSoft)}
          showChevron
          onPress={() => router.push('/ayarlar/guvenlik')}
        />
      </Group>

      <Group title="SONRAKİ SÜRÜMLER">
        <ListRow
          title="Para birimi ve biçim"
          subtitle="Ana para birimini dolar yapma, kısaltmalar"
          leading={icon(CircleDollarSign, colors.textSecondary, colors.neutralSoft)}
          badge={<Soon phase="Sonra" />}
        />
        <ListRow
          title="Bildirimler"
          subtitle="Fiyat alarmları, günlük özet"
          leading={icon(Bell, colors.textSecondary, colors.neutralSoft)}
          badge={<Soon phase="Sonra" />}
        />
      </Group>

      <Group title="HAKKINDA">
        <ListRow
          title="Yatırım Takip"
          subtitle="Sürüm, veri kaynakları, gizlilik, yasal uyarı, lisanslar"
          leading={icon(Info, colors.accent, colors.accentSoft)}
          showChevron
          onPress={() => router.push('/ayarlar/hakkinda')}
        />
        <Text variant="caption" tone="tertiary" style={{ paddingBottom: space.md }}>
          Uygulama kişisel takip amaçlıdır. Gösterilen bilgiler yatırım tavsiyesi değildir. Veriler
          yalnızca bu telefonda saklanır.
        </Text>
      </Group>
    </Screen>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ gap: space.sm }}>
      <SectionHeader title={title} style={{ paddingHorizontal: space.xs }} />
      <Card padding={0} style={{ paddingHorizontal: space.lg }}>
        {children}
      </Card>
    </View>
  );
}

function Soon({ phase }: { phase: string }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        paddingHorizontal: space.sm,
        paddingVertical: 2,
        borderRadius: radius.pill,
        backgroundColor: colors.accent2Soft,
      }}>
      <Text variant="caption" color={colors.accent2} style={{ fontSize: 11, lineHeight: 14 }}>
        {phase}
      </Text>
    </View>
  );
}

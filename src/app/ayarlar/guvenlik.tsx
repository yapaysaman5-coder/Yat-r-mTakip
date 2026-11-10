import { Fingerprint, Shield } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { useLockStore } from '@/components/AppLock';
import { lockSupport, unlock, type LockSupport } from '@/lib/security';
import { useSettings } from '@/state/settings';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';
import { Card, Chip, ListRow, Screen, SectionHeader, StackHeader, Text, Toggle, toast } from '@/ui';

const AFTER: { key: 0 | 60 | 300; label: string }[] = [
  { key: 0, label: 'Hemen' },
  { key: 60, label: '1 dakika' },
  { key: 300, label: '5 dakika' },
];

/** Ayarlar › Güvenlik ve Gizlilik (docs/01-PROJE-DOKUMANI.md §6.8, §6.11). */
export default function SecurityScreen() {
  const { colors } = useTheme();
  const s = useSettings();
  const setUnlocked = useLockStore((st) => st.setUnlocked);
  const [support, setSupport] = useState<LockSupport | null>(null);

  useEffect(() => {
    lockSupport()
      .then(setSupport)
      .catch(() =>
        setSupport({ available: false, biometric: false, reason: 'Kilit desteği okunamadı.' }),
      );
  }, []);

  const toggleLock = async (on: boolean) => {
    if (!on) {
      s.setLockEnabled(false);
      return;
    }
    if (support && !support.available) {
      toast.show({
        message: support.reason ?? 'Bu telefonda kilit kullanılamıyor',
        tone: 'danger',
      });
      return;
    }
    // Turning it on needs a successful unlock, so nobody locks themselves out.
    const ok = await unlock('Kilidi açmak için doğrula').catch(() => false);
    if (!ok) {
      toast.show({ message: 'Doğrulanamadı; kilit açılmadı', tone: 'danger' });
      return;
    }
    setUnlocked(true);
    s.setLockEnabled(true);
    toast.show({ message: 'Uygulama kilidi açık', tone: 'success' });
  };

  const icon = (I: typeof Shield) => (
    <View
      style={{
        width: 36,
        height: 36,
        borderRadius: radius.md,
        backgroundColor: colors.accentSoft,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <I size={18} color={colors.accent} strokeWidth={2.4} />
    </View>
  );

  return (
    <Screen header={<StackHeader title="Güvenlik ve Gizlilik" />}>
      <Card padding={0} style={{ paddingHorizontal: space.lg }}>
        <ListRow
          title="Uygulama kilidi"
          subtitle={
            support?.biometric
              ? 'Parmak izi / yüz ile, olmazsa telefon şifresiyle'
              : support?.available
                ? 'Telefon şifresiyle (parmak izi tanımlı değil)'
                : (support?.reason ?? 'Kontrol ediliyor…')
          }
          leading={icon(Fingerprint)}
          trailing={
            <Toggle
              value={s.lockEnabled}
              onValueChange={toggleLock}
              accessibilityLabel="Uygulama kilidi"
            />
          }
        />
      </Card>
      {s.lockEnabled ? (
        <Card style={{ gap: space.sm }}>
          <SectionHeader title="OTOMATİK KİLİT" />
          <Text variant="footnote" tone="secondary">
            Uygulama arka planda bu kadar kaldıktan sonra açılırken kilit sorar.
          </Text>
          <View style={{ flexDirection: 'row', gap: space.xs }}>
            {AFTER.map((a) => (
              <Chip
                key={a.key}
                label={a.label}
                selected={s.lockAfter === a.key}
                onPress={() => s.setLockAfter(a.key)}
              />
            ))}
          </View>
        </Card>
      ) : null}
      <Card padding={0} style={{ paddingHorizontal: space.lg }}>
        <ListRow
          title="Tutarları gizli aç"
          subtitle="Uygulama her açılışta tutarlar ••••• olarak başlar"
          trailing={
            <Toggle
              value={s.startHidden}
              onValueChange={s.setStartHidden}
              accessibilityLabel="Tutarları gizli aç"
            />
          }
        />
        <ListRow
          title="Ekran koruması"
          subtitle="Ekran görüntüsü ve kaydı engellenir; uygulama değiştiricide içerik görünmez"
          trailing={
            <Toggle
              value={s.secureScreen}
              onValueChange={s.setSecureScreen}
              accessibilityLabel="Ekran koruması"
            />
          }
        />
      </Card>
      <Text variant="caption" tone="tertiary">
        Tüm veriler yalnızca bu telefonda tutulur; hiçbir sunucuya gönderilmez. Fiyatlar doğrudan
        kaynaklardan (Yahoo, Binance, CoinGecko, İş Yatırım, TCMB) alınır.
      </Text>
    </Screen>
  );
}

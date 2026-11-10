import Constants from 'expo-constants';
import { View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';
import { Card, Screen, SectionHeader, StackHeader, Text } from '@/ui';

const SOURCES: [string, string][] = [
  ['BIST hisseleri ve endeksler', 'Yahoo Finance (15 dk gecikmeli), yedek İş Yatırım (gün sonu)'],
  ['ABD hisseleri ve endeksler', 'Yahoo Finance (seans içinde canlıya yakın)'],
  ['Kripto', 'Binance (anlık akış), yedek CoinGecko'],
  ['Döviz ve altın', 'Yahoo Finance, Binance, İş Yatırım, TCMB (gösterge kur)'],
  ['TÜFE', 'TCMB sitesindeki TÜİK aylık değişimleri (ayda bir)'],
];

const LICENSES = [
  'React Native, Expo (MIT)',
  'Reanimated, Gesture Handler, Worklets (MIT)',
  'react-native-svg (MIT)',
  'Zustand (MIT)',
  'decimal.js (MIT)',
  'Lucide ikonları (ISC)',
  'Inter yazı tipi (SIL Open Font License 1.1)',
];

/** Ayarlar › Hakkında (docs/01-PROJE-DOKUMANI.md §6.8, §14). */
export default function AboutScreen() {
  const { colors } = useTheme();
  const version = Constants.expoConfig?.version ?? '—';
  return (
    <Screen header={<StackHeader title="Hakkında" />}>
      <Card style={{ gap: space.xs }}>
        <Text variant="title2">Yatırım Takip</Text>
        <Text variant="footnote" tone="secondary">
          Sürüm {version}
        </Text>
        <Text variant="body" style={{ marginTop: space.sm }}>
          BIST, ABD borsaları ve kripto paraları tek yerde takip eden, kişisel portföy uygulaması.
        </Text>
      </Card>

      <Card style={{ gap: space.sm }}>
        <SectionHeader title="VERİ KAYNAKLARI VE GECİKMELER" />
        {SOURCES.map(([what, from], i) => (
          <View
            key={what}
            style={{
              gap: 2,
              paddingTop: i === 0 ? 0 : space.sm,
              borderTopWidth: i === 0 ? 0 : 1,
              borderTopColor: colors.border,
            }}>
            <Text variant="subhead">{what}</Text>
            <Text variant="caption" tone="secondary">
              {from}
            </Text>
          </View>
        ))}
      </Card>

      <Card style={{ gap: space.sm }}>
        <SectionHeader title="GİZLİLİK" />
        <Text variant="footnote">
          Hesap yok, sunucu yok. Kayıtların, ayarların ve yedeklerin yalnızca bu telefonda durur.
          Uygulama internete yalnızca fiyat almak için çıkar ve bu isteklerde senin hakkında bir
          bilgi göndermez. Yedek dosyasını nereye kaydedeceğine sen karar verirsin.
        </Text>
      </Card>

      <Card style={{ gap: space.sm }}>
        <SectionHeader title="YASAL UYARI" />
        <Text variant="footnote">
          Uygulama, kendi girdiğin verilerle kişisel takip amacıyla çalışır. Gösterilen fiyatlar
          gecikmeli olabilir ve hata içerebilir. Hiçbir ekran yatırım tavsiyesi niteliği taşımaz;
          vergi ve resmi kayıtlar için aracı kurumunun ekstrelerini esas al.
        </Text>
      </Card>

      <Card style={{ gap: space.xs }}>
        <SectionHeader title="AÇIK KAYNAK LİSANSLAR" />
        {LICENSES.map((l) => (
          <Text key={l} variant="caption" tone="secondary">
            {l}
          </Text>
        ))}
      </Card>
    </Screen>
  );
}

import { useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { ScrollView, View } from 'react-native';

import { useMarketStore } from '@/state/market';
import { useTheme } from '@/theme/ThemeProvider';
import { GUTTER, radius, space } from '@/theme/tokens';
import { Card, ChangeBadge, PressableScale, SectionHeader, Text } from '@/ui';
import { formatTime } from '@/utils/format';

import { changeRatio, formatInstrumentPrice } from './marketFormat';

/** Home screen strip with the watchlist's prices; opens Piyasalar. */
export function MarketTicker() {
  const router = useRouter();
  const { colors } = useTheme();
  const items = useMarketStore((s) => s.watchlist);
  const online = useMarketStore((s) => s.online);
  const lastUpdate = useMarketStore((s) => s.lastUpdate);
  const mock = useMarketStore((s) => s.mock);
  if (items.length === 0) return null;

  const status = mock
    ? 'Örnek fiyatlar'
    : online === false
      ? `Çevrimdışı${lastUpdate ? ` · ${formatTime(lastUpdate)}` : ''}`
      : lastUpdate
        ? `Güncellendi ${formatTime(lastUpdate)}`
        : 'Fiyatlar alınıyor…';

  return (
    <Card padding={0} style={{ paddingVertical: space.lg }}>
      <PressableScale
        onPress={() => router.push('/piyasalar')}
        haptic="selection"
        scaleTo={0.99}
        accessibilityRole="button"
        accessibilityLabel="Piyasalar"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: space.lg,
          marginBottom: space.md,
        }}>
        <SectionHeader title="PİYASALAR" />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
          <Text variant="caption" tone={online === false ? 'down' : 'tertiary'}>
            {status}
          </Text>
          <ChevronRight size={16} color={colors.textTertiary} strokeWidth={2.4} />
        </View>
      </PressableScale>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: space.sm, paddingHorizontal: space.lg }}
        style={{ marginHorizontal: 0 }}>
        {items.slice(0, 8).map(({ instrument, quote }) => {
          const ratio = changeRatio(quote);
          return (
            <PressableScale
              key={instrument.id}
              onPress={() => router.push('/piyasalar')}
              haptic="selection"
              accessibilityRole="button"
              accessibilityLabel={instrument.name}
              style={{
                minWidth: 128,
                padding: space.md,
                borderRadius: radius.md,
                backgroundColor: colors.surfaceAlt,
                gap: 4,
              }}>
              <Text variant="caption" tone="secondary" numberOfLines={1}>
                {instrument.name}
              </Text>
              <Text variant="numM" numberOfLines={1}>
                {quote ? formatInstrumentPrice(instrument, quote.price) : '—'}
              </Text>
              {ratio !== null ? (
                <ChangeBadge value={ratio} style={{ alignSelf: 'flex-start' }} />
              ) : (
                <Text variant="caption" tone="tertiary">
                  {quote ? '—' : '…'}
                </Text>
              )}
            </PressableScale>
          );
        })}
        <View style={{ width: GUTTER - space.lg }} />
      </ScrollView>
    </Card>
  );
}

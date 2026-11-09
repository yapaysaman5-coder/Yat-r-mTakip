import { RefreshCw } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { SOURCE_NAME } from '@/components/marketFormat';
import { instrumentFor } from '@/data/market/instruments';
import { catalogSize } from '@/data/market/search';
import type { StreamStatus } from '@/data/market/stream';
import { useMarketStore } from '@/state/market';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';
import { Button, Card, LiveDot, Screen, SectionHeader, StackHeader, Text } from '@/ui';
import { formatDateTime, formatNumber } from '@/utils/format';

const SOURCES: { id: string; what: string; note: string }[] = [
  {
    id: 'yahoo',
    what: 'BIST, ABD hisseleri, endeksler, döviz, vadeli altın/gümüş',
    note: 'BIST 15 dk gecikmeli',
  },
  { id: 'binance', what: 'Kripto paralar, USDT/TRY, PAXG (altın)', note: 'Anlık, 7/24' },
  { id: 'coingecko', what: 'Kripto (yedek)', note: 'Dakikada birkaç istek sınırı' },
  { id: 'isyatirim', what: 'BIST günlük kapanışlar, BIST 100, USD/TRY (yedek)', note: 'Gün sonu' },
  { id: 'tcmb', what: 'Resmi döviz kurları (son yedek)', note: 'Günde bir kez' },
  {
    id: 'tcmbcpi',
    what: 'TÜFE (TÜİK aylık değişimleri, 2005’ten beri)',
    note: 'Ayda bir yayımlanır',
  },
];

const STREAM_LABEL: Record<StreamStatus, string> = {
  idle: 'Kapalı',
  connecting: 'Bağlanıyor',
  open: 'Bağlı (anlık)',
  retrying: 'Yeniden bağlanıyor',
};

/** Ayarlar › Veri kaynakları: where prices come from and how each source is doing. */
export default function SourcesScreen() {
  const { colors } = useTheme();
  const online = useMarketStore((s) => s.online);
  const lastUpdate = useMarketStore((s) => s.lastUpdate);
  const lastSync = useMarketStore((s) => s.lastSync);
  const syncing = useMarketStore((s) => s.syncing);
  const sources = useMarketStore((s) => s.sources);
  const mock = useMarketStore((s) => s.mock);
  const stream = useMarketStore((s) => s.stream);
  const streamCount = useMarketStore((s) => s.streamCount);
  const refreshNow = useMarketStore((s) => s.refreshNow);
  const [busy, setBusy] = useState(false);
  const sizes = catalogSize();

  return (
    <Screen header={<StackHeader title="Veri Kaynakları" />}>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <LiveDot status={mock ? 'sample' : online === false ? 'offline' : 'live'} />
        </View>
        <View style={{ gap: space.xs, marginTop: space.md }}>
          <Line label="Son fiyat" value={lastUpdate ? formatDateTime(lastUpdate) : '—'} />
          <Line
            label="Geçmiş fiyatlar"
            value={syncing ? 'İndiriliyor…' : lastSync ? formatDateTime(lastSync.at) : '—'}
          />
          <Line
            label="Kripto canlı akış"
            value={
              mock || streamCount === 0
                ? 'Kullanılmıyor'
                : `${STREAM_LABEL[stream]} · ${streamCount} coin`
            }
          />
        </View>
        {lastSync?.failed.length ? (
          <View
            style={{
              marginTop: space.md,
              padding: space.md,
              borderRadius: radius.md,
              backgroundColor: colors.warningSoft,
              gap: 4,
            }}>
            <Text variant="caption" tone="secondary">
              Geçmişi indirilemeyenler (sonra tekrar denenecek):
            </Text>
            {lastSync.failed.slice(0, 6).map(([id, why]) => (
              <Text key={id} variant="caption">
                {instrumentFor(id)?.name ?? id}: {why}
              </Text>
            ))}
          </View>
        ) : null}
        <Button
          label={busy ? 'Yenileniyor…' : 'Şimdi yenile'}
          icon={RefreshCw}
          variant="secondary"
          fullWidth
          disabled={busy}
          onPress={async () => {
            setBusy(true);
            await refreshNow();
            setBusy(false);
          }}
          style={{ marginTop: space.lg }}
        />
      </Card>

      <View style={{ gap: space.sm }}>
        <SectionHeader title="KAYNAKLAR" style={{ paddingHorizontal: space.xs }} />
        <Card padding={0} style={{ paddingHorizontal: space.lg, paddingVertical: space.xs }}>
          {SOURCES.map((s, i) => {
            const status = sources.find((x) => x.source === s.id);
            const resting = status && status.restingFor > 0;
            return (
              <View
                key={s.id}
                style={{
                  paddingVertical: space.md,
                  gap: 2,
                  borderTopWidth: i === 0 ? 0 : 1,
                  borderTopColor: colors.border,
                }}>
                <View
                  style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.sm }}>
                  <Text variant="bodyStrong">{SOURCE_NAME[s.id]}</Text>
                  <Text variant="caption" tone={resting ? 'down' : 'up'}>
                    {mock
                      ? 'önizlemede kapalı'
                      : resting
                        ? `${Math.ceil(status.restingFor / 1000)} sn ara`
                        : 'hazır'}
                  </Text>
                </View>
                <Text variant="caption" tone="secondary">
                  {s.what} · {s.note}
                </Text>
                {resting && status.lastError ? (
                  <Text variant="caption" tone="tertiary">
                    Son hata: {status.lastError}
                  </Text>
                ) : null}
              </View>
            );
          })}
        </Card>
      </View>

      <Text variant="caption" tone="tertiary">
        İstekler doğrudan telefonundan kaynaklara gider; araya bir sunucu girmez, kimlik veya
        portföy bilgisi gönderilmez. Bir kaynak hata verirse sıradaki kullanılır ve hatalı kaynak
        bir süre dinlendirilir. Sembol arama katalogu telefonda: {formatNumber(sizes.bist)} BIST
        şirketi, {formatNumber(sizes.crypto)} kripto para, {formatNumber(sizes.us)} popüler ABD
        hissesi ve fonu.
      </Text>
    </Screen>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text variant="subhead" tone="secondary">
        {label}
      </Text>
      <Text variant="subhead">{value}</Text>
    </View>
  );
}

import { Plus, RefreshCw, Search, Trash2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import {
  changeRatio,
  formatInstrumentPrice,
  quoteStatus,
  SOURCE_NAME,
} from '@/components/marketFormat';
import { searchInstruments, type SearchResult } from '@/data/market/search';
import { sessionAt, VENUE_LABEL, venueOf } from '@/data/market/session';
import { useNow } from '@/lib/useNow';
import { useMarketStore, type WatchItem } from '@/state/market';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';
import {
  AssetAvatar,
  Button,
  Card,
  ChangeBadge,
  Chip,
  IconButton,
  LiveDot,
  PressableScale,
  Screen,
  Sheet,
  Sparkline,
  StackHeader,
  Text,
  TextField,
  toast,
} from '@/ui';
import { formatDateTime, formatTime } from '@/utils/format';

const MARKET_FILTERS = [
  { key: undefined, label: 'Tümü' },
  { key: 'BIST', label: 'BIST' },
  { key: 'US', label: 'ABD' },
  { key: 'CRYPTO', label: 'Kripto' },
] as const;

const avatarMarket = (m: string) => (m === 'BIST' ? 'bist' : m === 'CRYPTO' ? 'crypto' : 'us');

/** Piyasalar: the watchlist with live prices, search to add, details per instrument. */
export default function MarketsScreen() {
  const { colors } = useTheme();
  const items = useMarketStore((s) => s.watchlist);
  const online = useMarketStore((s) => s.online);
  const lastUpdate = useMarketStore((s) => s.lastUpdate);
  const mock = useMarketStore((s) => s.mock);
  const refreshNow = useMarketStore((s) => s.refreshNow);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<WatchItem | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = async () => {
    setRefreshing(true);
    await refreshNow();
    setRefreshing(false);
  };

  return (
    <Screen
      header={
        <StackHeader
          title="Piyasalar"
          right={
            <View style={{ flexDirection: 'row', gap: space.sm }}>
              <IconButton
                icon={RefreshCw}
                accessibilityLabel="Fiyatları yenile"
                onPress={refresh}
              />
              <IconButton
                icon={Search}
                accessibilityLabel="Sembol ara"
                onPress={() => setSearching(true)}
              />
            </View>
          }
        />
      }>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.sm,
          padding: space.md,
          borderRadius: radius.md,
          backgroundColor: online === false ? colors.downSoft : colors.surfaceAlt,
        }}>
        <LiveDot
          status={mock ? 'sample' : online === false ? 'offline' : 'live'}
          showLabel={false}
        />
        <Text variant="footnote" style={{ flex: 1 }}>
          {mock
            ? 'Web önizlemesi: kurgusal fiyatlar. Telefonda gerçek fiyatlar gelir.'
            : online === false
              ? `İnternet yok. Son kaydedilen fiyatlar gösteriliyor${lastUpdate ? ` (${formatDateTime(lastUpdate)})` : ''}.`
              : refreshing
                ? 'Yenileniyor…'
                : lastUpdate
                  ? `Son güncelleme ${formatTime(lastUpdate)}. BIST 15 dk gecikmeli, diğerleri anlık.`
                  : 'Fiyatlar alınıyor…'}
        </Text>
      </View>

      <Card padding={0} style={{ paddingHorizontal: space.lg, paddingVertical: space.xs }}>
        {items.map((item, i) => (
          <View key={item.instrument.id}>
            {i > 0 ? (
              <View style={{ height: 1, backgroundColor: colors.border, marginLeft: 52 }} />
            ) : null}
            <MarketRow item={item} onPress={() => setSelected(item)} />
          </View>
        ))}
        {items.length === 0 ? (
          <Text variant="footnote" tone="tertiary" style={{ paddingVertical: space.lg }}>
            Liste boş. Sağ üstteki aramayla sembol ekle.
          </Text>
        ) : null}
      </Card>

      <Button
        label="Sembol ekle"
        icon={Plus}
        variant="secondary"
        onPress={() => setSearching(true)}
        fullWidth
      />

      <SearchSheet visible={searching} onClose={() => setSearching(false)} />
      <DetailSheet item={selected} onClose={() => setSelected(null)} />
    </Screen>
  );
}

function MarketRow({ item, onPress }: { item: WatchItem; onPress: () => void }) {
  const { colors } = useTheme();
  const now = useNow();
  const { instrument: inst, quote, spark } = item;
  const ratio = changeRatio(quote);
  const trend = spark.length > 1 && spark[spark.length - 1] < spark[0] ? colors.down : colors.up;
  return (
    <PressableScale
      onPress={onPress}
      haptic="selection"
      scaleTo={0.985}
      accessibilityRole="button"
      accessibilityLabel={inst.name}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.md,
        paddingVertical: space.md,
      }}>
      <AssetAvatar
        symbol={inst.symbol.replace(/\W/g, '').slice(0, 4)}
        market={avatarMarket(inst.market)}
        size={38}
      />
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {inst.name}
        </Text>
        <Text variant="caption" tone="secondary" numberOfLines={1}>
          {quoteStatus(inst, quote, now)}
        </Text>
      </View>
      {spark.length > 1 ? <Sparkline values={spark} color={trend} width={48} height={24} /> : null}
      <View style={{ alignItems: 'flex-end', gap: 4, minWidth: 96 }}>
        <Text variant="numM">{quote ? formatInstrumentPrice(inst, quote.price) : '—'}</Text>
        {ratio !== null ? <ChangeBadge value={ratio} /> : null}
      </View>
    </PressableScale>
  );
}

function SearchSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const [market, setMarket] = useState<(typeof MARKET_FILTERS)[number]['key']>(undefined);
  const addWatch = useMarketStore((s) => s.addWatch);
  const watched = useMarketStore((s) => s.watchlist);
  const results = searchInstruments(query, { market, limit: 12 });

  const add = async (r: SearchResult) => {
    await addWatch(r.id);
    toast.show({ message: `${r.symbol} listeye eklendi`, tone: 'success' });
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Sembol ara"
      subtitle="BIST, ABD hisseleri, kripto, döviz, altın ve endeksler">
      <View style={{ gap: space.md }}>
        <TextField
          label="Sembol veya ad"
          value={query}
          onChangeText={setQuery}
          placeholder="ör. THYAO, Apple, BTC"
        />
        <View style={{ flexDirection: 'row', gap: space.xs, flexWrap: 'wrap' }}>
          {MARKET_FILTERS.map((f) => (
            <Chip
              key={f.label}
              label={f.label}
              size="sm"
              selected={market === f.key}
              onPress={() => setMarket(f.key)}
            />
          ))}
        </View>
        <View
          style={{
            backgroundColor: colors.surfaceAlt,
            borderRadius: radius.lg,
            paddingHorizontal: space.md,
          }}>
          {results.map((r, i) => {
            const inList = watched.some((w) => w.instrument.id === r.id);
            return (
              <PressableScale
                key={r.id}
                onPress={() => (inList ? undefined : add(r))}
                haptic="selection"
                accessibilityRole="button"
                accessibilityLabel={`${r.symbol} ekle`}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: space.md,
                  paddingVertical: space.sm + 2,
                  borderTopWidth: i === 0 ? 0 : 1,
                  borderTopColor: colors.border,
                }}>
                <View style={{ flex: 1 }}>
                  <Text variant="callout" numberOfLines={1}>
                    {r.symbol} · {r.name}
                  </Text>
                  <Text variant="caption" tone="tertiary" numberOfLines={1}>
                    {r.unverified
                      ? `${r.market === 'BIST' ? 'BIST' : r.market === 'US' ? 'ABD' : 'Kripto'} · katalogda yok, fiyat kaynağı doğrular`
                      : [
                          r.market === 'BIST'
                            ? 'BIST'
                            : r.market === 'US'
                              ? 'ABD'
                              : r.market === 'CRYPTO'
                                ? 'Kripto'
                                : 'Piyasa',
                          r.detail,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                  </Text>
                </View>
                <Text variant="caption" tone={inList ? 'tertiary' : 'accent'}>
                  {inList ? 'Listede' : 'Ekle'}
                </Text>
              </PressableScale>
            );
          })}
          {query.trim() && results.length === 0 ? (
            <Text variant="footnote" tone="tertiary" style={{ paddingVertical: space.md }}>
              Sonuç yok.
            </Text>
          ) : null}
          {!query.trim() ? (
            <Text variant="footnote" tone="tertiary" style={{ paddingVertical: space.md }}>
              Yazmaya başla: arama telefonda, internet olmadan da çalışır.
            </Text>
          ) : null}
        </View>
      </View>
    </Sheet>
  );
}

function DetailSheet({ item, onClose }: { item: WatchItem | null; onClose: () => void }) {
  const { colors } = useTheme();
  const router = useRouter();
  const removeWatch = useMarketStore((s) => s.removeWatch);
  const mock = useMarketStore((s) => s.mock);
  const now = useNow();
  if (!item) return <Sheet visible={false} onClose={onClose} />;
  const { instrument: inst, quote } = item;
  const venue = venueOf(inst);
  const session = sessionAt(venue, now);
  const rows: [string, string][] = [
    ['Piyasa', VENUE_LABEL[venue]],
    [
      'Durum',
      venue === 'CRYPTO'
        ? '7/24 açık'
        : session.open
          ? `Açık${session.closesAt ? ` · ${formatTime(session.closesAt)}'de kapanır` : ''}`
          : `Kapalı${session.opensAt ? ` · ${formatDateTime(session.opensAt)}'de açılır` : ''}`,
    ],
  ];
  if (quote) {
    rows.push(['Fiyat zamanı', formatDateTime(quote.time)]);
    rows.push([
      'Önceki kapanış',
      quote.prevClose ? formatInstrumentPrice(inst, quote.prevClose) : '—',
    ]);
    rows.push([
      'Kaynak',
      `${mock ? SOURCE_NAME.mock : (SOURCE_NAME[quote.source] ?? quote.source)}${quote.endOfDay ? ' · gün sonu' : quote.delayMinutes ? ` · ${quote.delayMinutes} dk gecikmeli` : ''}`,
    ]);
  }
  const ratio = changeRatio(quote);
  return (
    <Sheet visible onClose={onClose} title={inst.name} subtitle={inst.symbol}>
      <View style={{ gap: space.lg }}>
        <View
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text variant="title1">{quote ? formatInstrumentPrice(inst, quote.price) : '—'}</Text>
          {ratio !== null ? <ChangeBadge value={ratio} size="md" /> : null}
        </View>
        <View
          style={{
            backgroundColor: colors.surfaceAlt,
            borderRadius: radius.lg,
            paddingHorizontal: space.lg,
            paddingVertical: space.xs,
          }}>
          {rows.map(([label, value], i) => (
            <View
              key={label}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                gap: space.md,
                paddingVertical: space.md - 2,
                borderTopWidth: i === 0 ? 0 : 1,
                borderTopColor: colors.border,
              }}>
              <Text variant="subhead" tone="secondary">
                {label}
              </Text>
              <Text variant="subhead" align="right" style={{ flexShrink: 1 }}>
                {value}
              </Text>
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <Button
            label="Ayrıntı"
            variant="secondary"
            style={{ flex: 1 }}
            fullWidth
            onPress={() => {
              onClose();
              router.push(`/varlik/${encodeURIComponent(inst.id)}`);
            }}
          />
          {/^(BIST|US|CRYPTO):/.test(inst.id) ? (
            <Button
              label="Al"
              variant="buy"
              style={{ flex: 1 }}
              fullWidth
              onPress={() => {
                onClose();
                router.push({
                  pathname: '/islem/al-sat',
                  params: { side: 'BUY', assetId: inst.id },
                });
              }}
            />
          ) : null}
        </View>
        <Button
          label="Listeden çıkar"
          icon={Trash2}
          variant="danger"
          fullWidth
          onPress={async () => {
            onClose();
            await removeWatch(inst.id);
          }}
        />
      </View>
    </Sheet>
  );
}

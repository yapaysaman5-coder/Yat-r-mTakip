import { useLocalSearchParams, useRouter } from 'expo-router';
import { Scissors, Star } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { changeRatio, formatInstrumentPrice, quoteStatus } from '@/components/marketFormat';
import { TxnDetailSheet } from '@/components/TxnDetailSheet';
import { txnVisual } from '@/components/txnVisual';
import { getDatabase } from '@/data/database';
import { instrumentFor, type Instrument } from '@/data/market/instruments';
import { loadQuotes, loadSplits, type StoredQuote } from '@/data/repo/market';
import { loadCloses } from '@/data/repo/prices';
import { rangeStartIndex, type ChartRange, type HistoryItem } from '@/data/view/portfolioView';
import { buildLedger, suggestMissingSplits, trDay, type SplitEvent } from '@/domain';
import { tr } from '@/i18n/tr';
import { useNow } from '@/lib/useNow';
import { useMarketStore } from '@/state/market';
import { usePortfolioView } from '@/state/portfolio';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';
import {
  Button,
  Card,
  ChangeBadge,
  Chip,
  IconButton,
  IconWell,
  Money,
  PressableScale,
  Screen,
  SectionHeader,
  SegmentedControl,
  StackHeader,
  Text,
  toast,
} from '@/ui';
import { PriceChart } from '@/ui/charts/PriceChart';
import {
  formatDate,
  formatMoney,
  formatPercent,
  formatPrice,
  formatQuantity,
  formatRelativeDay,
  type CurrencyCode,
} from '@/utils/format';

const RANGES: ChartRange[] = ['1A', '3A', '6A', '1Y', 'Tümü'];
type RecordTab = 'BUY' | 'SELL' | 'all';

interface Loaded {
  dates: string[];
  closes: number[];
  quote: StoredQuote | null;
  splits: SplitEvent[];
}

/** Varlık detay (docs/01-PROJE-DOKUMANI.md §6.3). */
export default function AssetScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const id = decodeURIComponent(rawId ?? '');
  const view = usePortfolioView();
  const watchlist = useMarketStore((s) => s.watchlist);
  const addWatch = useMarketStore((s) => s.addWatch);
  const removeWatch = useMarketStore((s) => s.removeWatch);
  const now = useNow();
  const [range, setRange] = useState<ChartRange>('3A');
  const [tab, setTab] = useState<RecordTab>('all');
  const [selected, setSelected] = useState<HistoryItem | null>(null);
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  const stored = view.data.assets.get(id);
  const inst: Instrument | null =
    instrumentFor(id, stored?.name) ??
    (stored
      ? {
          id,
          symbol: stored.symbol,
          name: stored.name ?? stored.symbol,
          market: stored.market,
          currency: stored.currency,
          sources: [],
        }
      : null);
  const holding = view.holdings.find((h) => h.assetId === id);
  const records = view.history.filter((h) => h.assetId === id);
  const ccy = (inst?.currency ?? 'TRY') as CurrencyCode;

  // Prices, the stored quote and reported splits; read again whenever the figures reload.
  useEffect(() => {
    let alive = true;
    (async () => {
      const db = await getDatabase();
      const byDay = (await loadCloses(db, [id]))[id] ?? {};
      const dates = Object.keys(byDay).sort();
      const quote = (await loadQuotes(db, [id])).get(id) ?? null;
      const splits = (await loadSplits(db, [id])).map((s) => ({
        assetId: s.assetId,
        date: s.date,
        ratio: s.ratio,
      }));
      if (alive) setLoaded({ dates, closes: dates.map((d) => byDay[d]), quote, splits });
    })().catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [id, view]);

  if (!inst) {
    return (
      <Screen header={<StackHeader title="Varlık" />}>
        <Text tone="secondary">Varlık bulunamadı.</Text>
      </Screen>
    );
  }

  const ledgerPos = buildLedger(view.data.txns).positions.get(id);
  const dates = loaded?.dates ?? [];
  const start = dates.length ? rangeStartIndex(dates, range) : 0;
  const values = (loaded?.closes ?? []).slice(start);
  const shownDates = dates.slice(start);
  const markers = records
    .filter((r) => (r.type === 'BUY' || r.type === 'SELL') && r.price !== undefined)
    .flatMap((r) => {
      const day = trDay(r.ts);
      if (!shownDates.length || day < shownDates[0]) return [];
      const i = shownDates.findIndex((d) => d >= day);
      return [
        {
          index: i === -1 ? shownDates.length - 1 : i,
          price: r.price!,
          side: r.type as 'BUY' | 'SELL',
        },
      ];
    });

  const price = holding?.price ?? loaded?.quote?.price ?? loaded?.closes.at(-1) ?? null;
  const ratio = holding
    ? holding.prevClose > 0
      ? holding.price / holding.prevClose - 1
      : null
    : changeRatio(loaded?.quote ?? null);
  const watched = watchlist.some((w) => w.instrument.id === id);
  const suggestions =
    view.isDemo || !loaded ? [] : suggestMissingSplits(view.data.txns, loaded.splits);
  const shown = records.filter((r) => (tab === 'all' ? true : r.type === tab));
  const buys = records.filter((r) => r.type === 'BUY').length;
  const sells = records.filter((r) => r.type === 'SELL').length;

  return (
    <Screen
      header={
        <StackHeader
          title={inst.symbol}
          right={
            view.isDemo ? undefined : (
              <IconButton
                icon={Star}
                accessibilityLabel={watched ? 'İzleme listesinden çıkar' : 'İzleme listesine ekle'}
                onPress={async () => {
                  if (watched) await removeWatch(id);
                  else await addWatch(id);
                  toast.show({
                    message: watched ? 'İzleme listesinden çıkarıldı' : 'İzleme listesine eklendi',
                  });
                }}
              />
            )
          }
        />
      }
      footer={
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <Button
            label="AL"
            variant="buy"
            onPress={() =>
              router.push({ pathname: '/islem/al-sat', params: { side: 'BUY', assetId: id } })
            }
            style={{ flex: 1 }}
            fullWidth
          />
          <Button
            label="SAT"
            variant="sell"
            disabled={!holding}
            onPress={() =>
              router.push({ pathname: '/islem/al-sat', params: { side: 'SELL', assetId: id } })
            }
            style={{ flex: 1 }}
            fullWidth
          />
        </View>
      }>
      <View style={{ gap: 4 }}>
        <Text variant="title3">{inst.name}</Text>
        <Text variant="caption" tone="secondary">
          {view.isDemo
            ? 'Örnek varlık · kurgusal fiyat'
            : quoteStatus(inst, loaded?.quote ?? null, now)}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <Text variant="title1">{price !== null ? formatInstrumentPrice(inst, price) : '—'}</Text>
        {ratio !== null ? <ChangeBadge value={ratio} size="md" /> : null}
      </View>

      <Card padding={0} style={{ paddingVertical: space.md }}>
        {values.length > 1 ? (
          <PriceChart
            values={values}
            markers={markers}
            costLine={holding?.avgCost ?? null}
            accessibilityLabel={`${inst.symbol} fiyat grafiği`}
          />
        ) : (
          <Text variant="footnote" tone="tertiary" style={{ padding: space.lg }}>
            {loaded
              ? 'Bu varlığın fiyat geçmişi henüz yok; internet bağlantısıyla indirilir.'
              : 'Yükleniyor…'}
          </Text>
        )}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: space.md,
            marginTop: space.sm,
          }}>
          <View style={{ flexDirection: 'row', gap: 2 }}>
            {RANGES.map((r) => (
              <Chip
                key={r}
                label={r}
                size="sm"
                selected={r === range}
                onPress={() => setRange(r)}
              />
            ))}
          </View>
        </View>
        <View
          style={{
            flexDirection: 'row',
            gap: space.md,
            paddingHorizontal: space.lg,
            marginTop: space.sm,
          }}>
          <Legend color={colors.up} label="▲ alış" />
          <Legend color={colors.down} label="▼ satış" />
          {holding ? <Legend color={colors.textTertiary} label="– – ort. maliyet" /> : null}
        </View>
      </Card>

      {suggestions.map((s) => (
        <View
          key={s.date}
          style={{
            flexDirection: 'row',
            gap: space.md,
            alignItems: 'center',
            padding: space.md,
            borderRadius: radius.md,
            backgroundColor: colors.warningSoft,
          }}>
          <Scissors size={18} color={colors.warning} strokeWidth={2.4} />
          <Text variant="footnote" style={{ flex: 1 }}>
            Kaynak {formatDate(`${s.date}T12:00:00Z`)} tarihinde ×{s.ratio} bölünme/bedelsiz
            bildiriyor, kayıtlarında yok.
          </Text>
          <Button
            label="Kaydet"
            size="sm"
            variant="secondary"
            onPress={() =>
              router.push({
                pathname: '/islem/bolunme',
                params: { assetId: id, date: s.date, ratio: s.ratio },
              })
            }
          />
        </View>
      ))}

      {holding ? (
        <Card>
          <SectionHeader title="POZİSYONUM" style={{ marginBottom: space.sm }} />
          <Line label="Adet" value={formatQuantity(holding.quantity)} />
          <Line label="Ort. maliyet" value={formatPrice(holding.avgCost, ccy)} />
          <Line label="Piyasa değeri" value={formatMoney(holding.valueTRY)} />
          <Line label="Toplam maliyet" value={formatMoney(holding.costTRY)} />
          <Line
            label="Açık K/Z"
            value={`${formatMoney(holding.unrealizedTRY, { sign: 'always' })}${holding.unrealizedRatio !== null ? `  ${formatPercent(holding.unrealizedRatio, { decimals: 2, sign: 'always' })}` : ''}`}
            tone={holding.unrealizedTRY >= 0 ? 'up' : 'down'}
          />
          <Line
            label="Bugün"
            value={formatMoney(holding.dailyChangeTRY, { sign: 'always' })}
            tone={holding.dailyChangeTRY >= 0 ? 'up' : 'down'}
          />
          <Line
            label="Gerçekleşen K/Z"
            value={formatMoney(holding.realizedTRY, { sign: 'always' })}
          />
          {holding.dividendsTRY > 0 ? (
            <Line label="Temettü (net)" value={formatMoney(holding.dividendsTRY)} />
          ) : null}
          <Line label="Portföy payı" value={formatPercent(holding.weight, { decimals: 1 })} />
          <Line label="Başa baş fiyat" value={formatPrice(holding.avgCost, ccy)} />
          {holding.fxSplit ? (
            <View
              style={{
                marginTop: space.sm,
                paddingTop: space.sm,
                borderTopWidth: 1,
                borderTopColor: colors.border,
              }}>
              <Line
                label="Fiyat etkisi (hisseden)"
                value={formatMoney(holding.fxSplit.priceEffect, { sign: 'always' })}
              />
              <Line
                label="Kur etkisi (dolardan)"
                value={formatMoney(holding.fxSplit.fxEffect, { sign: 'always' })}
              />
              <Line label="Ort. alış kuru" value={formatPrice(holding.avgFx, 'TRY')} />
            </View>
          ) : null}
        </Card>
      ) : (
        <Card>
          <Text variant="subhead">Bu varlık şu an portföyünde yok.</Text>
          {ledgerPos && (ledgerPos.realizedTRY.abs().gt(0) || ledgerPos.dividendsTRY.gt(0)) ? (
            <View style={{ marginTop: space.sm }}>
              <Line
                label="Gerçekleşen K/Z"
                value={formatMoney(ledgerPos.realizedTRY.toNumber(), { sign: 'always' })}
              />
              <Line label="Temettü (net)" value={formatMoney(ledgerPos.dividendsTRY.toNumber())} />
            </View>
          ) : null}
        </Card>
      )}

      {records.length ? (
        <View style={{ gap: space.sm }}>
          <SegmentedControl
            size="sm"
            value={tab}
            onChange={setTab}
            options={[
              { key: 'BUY', label: `Alışlar (${buys})` },
              { key: 'SELL', label: `Satışlar (${sells})` },
              { key: 'all', label: 'Tümü' },
            ]}
          />
          <Card padding={0} style={{ paddingHorizontal: space.lg, paddingVertical: space.xs }}>
            {shown.map((r, i) => {
              const v = txnVisual(r.type, colors);
              return (
                <PressableScale
                  key={r.id}
                  onPress={() => setSelected(r)}
                  haptic="selection"
                  accessibilityRole="button"
                  accessibilityLabel={tr.txn[r.type]}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: space.md,
                    paddingVertical: space.md,
                    borderTopWidth: i === 0 ? 0 : 1,
                    borderTopColor: colors.border,
                  }}>
                  <IconWell background={v.bg} size={34}>
                    <v.icon size={16} color={v.color} strokeWidth={2.4} />
                  </IconWell>
                  <View style={{ flex: 1 }}>
                    <Text variant="callout">{tr.txn[r.type]}</Text>
                    <Text variant="caption" tone="secondary">
                      {r.quantity !== undefined && r.price !== undefined
                        ? `${formatQuantity(r.quantity)} × ${formatPrice(r.price, r.currency)} · `
                        : ''}
                      {formatRelativeDay(r.ts, now)}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 2 }}>
                    <Money value={r.amountTRY} variant="numS" sign="always" />
                    {r.realizedRatio !== undefined ? <ChangeBadge value={r.realizedRatio} /> : null}
                  </View>
                </PressableScale>
              );
            })}
            {shown.length === 0 ? (
              <Text variant="footnote" tone="tertiary" style={{ paddingVertical: space.md }}>
                Kayıt yok.
              </Text>
            ) : null}
          </Card>
        </View>
      ) : null}

      <TxnDetailSheet item={selected} onClose={() => setSelected(null)} />
    </Screen>
  );
}

function Line({ label, value, tone }: { label: string; value: string; tone?: 'up' | 'down' }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 }}>
      <Text variant="subhead" tone="secondary">
        {label}
      </Text>
      <Text variant="numS" tone={tone}>
        {value}
      </Text>
    </View>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <Text variant="caption" color={color}>
      {label}
    </Text>
  );
}

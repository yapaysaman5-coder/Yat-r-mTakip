import { CalendarDays, SlidersHorizontal, X } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { EmptyPortfolio } from '@/components/EmptyPortfolio';
import { CustomRangeSheet } from '@/components/HeroParts';
import { PreviewNote } from '@/components/PreviewNote';
import { TxnDetailSheet, useTxnActions } from '@/components/TxnDetailSheet';
import type { HistoryItem, HoldingMarket } from '@/data/view/portfolioView';
import { addDays, trDay } from '@/domain';
import { tr } from '@/i18n/tr';
import { usePortfolioView } from '@/state/portfolio';
import { useTheme } from '@/theme/ThemeProvider';
import { GUTTER, space } from '@/theme/tokens';
import { Card, Chip, Money, Sheet, Text, TextField } from '@/ui';
import { formatDate, formatMonthYear, upperTR } from '@/utils/format';

import { TxnRow } from './TxnRow';

type TypeFilter = 'all' | 'BUY' | 'SELL' | 'CASH' | 'DIVIDEND' | 'OTHER';
type MarketFilter = 'all' | HoldingMarket;
type Period = 'all' | 'month' | '3m' | 'year' | 'lastYear' | 'custom';

const TYPES: [TypeFilter, string][] = [
  ['all', 'Tümü'],
  ['BUY', 'Alış'],
  ['SELL', 'Satış'],
  ['CASH', 'Para'],
  ['DIVIDEND', 'Temettü'],
  ['OTHER', 'Diğer'],
];
const MARKETS: [MarketFilter, string][] = [
  ['all', 'Tümü'],
  ['bist', tr.markets.bist],
  ['us', tr.markets.us],
  ['crypto', tr.markets.crypto],
];
const PERIODS: [Exclude<Period, 'custom'>, string][] = [
  ['all', 'Tüm zamanlar'],
  ['month', 'Bu ay'],
  ['3m', 'Son 3 ay'],
  ['year', 'Bu yıl'],
  ['lastYear', 'Geçen yıl'],
];

function matchesType(t: HistoryItem, f: TypeFilter): boolean {
  switch (f) {
    case 'all':
      return true;
    case 'CASH':
      return t.type === 'DEPOSIT' || t.type === 'WITHDRAW';
    case 'OTHER':
      return t.type === 'FEE' || t.type === 'SPLIT';
    default:
      return t.type === f;
  }
}

/** The days a period covers (inclusive), from today. */
function periodDays(p: Period, today: string, custom: { from: string; to: string } | null) {
  const year = today.slice(0, 4);
  switch (p) {
    case 'all':
      return null;
    case 'month':
      return { from: `${today.slice(0, 7)}-01`, to: today };
    case '3m':
      return { from: addDays(today, -91), to: today };
    case 'year':
      return { from: `${year}-01-01`, to: today };
    case 'lastYear':
      return { from: `${Number(year) - 1}-01-01`, to: `${Number(year) - 1}-12-31` };
    case 'custom':
      return custom;
  }
}

const fold = (s: string) => s.toLocaleLowerCase('tr');

/**
 * İşlemler (docs/01-PROJE-DOKUMANI.md §6.5): every record by month, with type chips, search
 * (symbol, record type, note), market and period filters, and swipe to edit or delete.
 */
export function Transactions({
  searching,
  onCloseSearch,
}: {
  searching: boolean;
  onCloseSearch: () => void;
}) {
  const { colors } = useTheme();
  const view = usePortfolioView();
  const actions = useTxnActions();
  const [type, setType] = useState<TypeFilter>('all');
  const [market, setMarket] = useState<MarketFilter>('all');
  const [period, setPeriod] = useState<Period>('all');
  const [custom, setCustom] = useState<{ from: string; to: string } | null>(null);
  const [query, setQuery] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [selected, setSelected] = useState<HistoryItem | null>(null);
  if (view.empty) return <EmptyPortfolio />;

  const range = periodDays(period, view.today, custom);
  const q = fold(query.trim());
  const visible = view.history.filter((t) => {
    if (t.type === 'SPLIT' && type !== 'OTHER') return false;
    if (!matchesType(t, type)) return false;
    if (market !== 'all' && t.market !== market) return false;
    if (range) {
      const d = trDay(t.ts);
      if (d < range.from || d > range.to) return false;
    }
    if (q) {
      const text = fold(
        [t.symbol, tr.txn[t.type], t.note, t.isAuto ? tr.txn.auto : ''].filter(Boolean).join(' '),
      );
      if (!text.includes(q)) return false;
    }
    return true;
  });

  const groups = new Map<string, HistoryItem[]>();
  for (const t of visible) {
    const key = formatMonthYear(t.ts);
    groups.set(key, [...(groups.get(key) ?? []), t]);
  }
  const extraFilters = (market !== 'all' ? 1 : 0) + (period !== 'all' ? 1 : 0);
  const periodLabel =
    period === 'custom' && custom
      ? `${formatDate(`${custom.from}T12:00:00Z`)} – ${formatDate(`${custom.to}T12:00:00Z`)}`
      : PERIODS.find(([k]) => k === period)?.[1];

  return (
    <View style={{ gap: space.lg }}>
      {searching ? (
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: space.sm }}>
          <TextField
            label="Ara"
            value={query}
            onChangeText={setQuery}
            placeholder="Sembol, işlem türü veya not"
            autoFocus
            style={{ flex: 1 }}
          />
          <Chip
            icon={X}
            accessibilityLabel="Aramayı kapat"
            onPress={() => {
              setQuery('');
              onCloseSearch();
            }}
          />
        </View>
      ) : null}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -GUTTER }}
        contentContainerStyle={{ gap: space.sm, paddingHorizontal: GUTTER }}>
        {TYPES.map(([k, label]) => (
          <Chip key={k} label={label} selected={type === k} onPress={() => setType(k)} />
        ))}
        <Chip
          icon={SlidersHorizontal}
          label={extraFilters ? `Filtre · ${extraFilters}` : 'Filtre'}
          selected={extraFilters > 0}
          onPress={() => setFiltersOpen(true)}
        />
      </ScrollView>
      {extraFilters > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.xs }}>
          {market !== 'all' ? (
            <Chip
              size="sm"
              icon={X}
              label={MARKETS.find(([k]) => k === market)![1]}
              onPress={() => setMarket('all')}
              accessibilityLabel="Piyasa filtresini kaldır"
            />
          ) : null}
          {period !== 'all' ? (
            <Chip
              size="sm"
              icon={X}
              label={periodLabel ?? ''}
              onPress={() => setPeriod('all')}
              accessibilityLabel="Tarih filtresini kaldır"
            />
          ) : null}
        </View>
      ) : null}
      {view.isDemo ? <PreviewNote /> : null}
      <TxnDetailSheet item={selected} onClose={() => setSelected(null)} />

      <Sheet visible={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filtrele">
        <View style={{ gap: space.lg }}>
          <View style={{ gap: space.sm }}>
            <Text variant="overline" tone="secondary">
              Piyasa
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.xs }}>
              {MARKETS.map(([k, label]) => (
                <Chip
                  key={k}
                  label={label}
                  dotColor={k === 'all' ? undefined : colors.market[k]}
                  selected={market === k}
                  onPress={() => setMarket(k)}
                />
              ))}
            </View>
          </View>
          <View style={{ gap: space.sm }}>
            <Text variant="overline" tone="secondary">
              Tarih
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.xs }}>
              {PERIODS.map(([k, label]) => (
                <Chip key={k} label={label} selected={period === k} onPress={() => setPeriod(k)} />
              ))}
              <Chip
                icon={CalendarDays}
                label="Özel aralık"
                selected={period === 'custom'}
                onPress={() => {
                  setFiltersOpen(false);
                  setCustomOpen(true);
                }}
              />
            </View>
          </View>
          <Text variant="footnote" tone="tertiary">
            {visible.length} kayıt gösteriliyor
          </Text>
        </View>
      </Sheet>
      <CustomRangeSheet
        visible={customOpen}
        onClose={() => setCustomOpen(false)}
        first={view.series.dates[0]}
        last={view.today}
        onApply={(r) => {
          setCustom(r);
          setPeriod('custom');
          setCustomOpen(false);
        }}
      />

      {visible.length === 0 ? (
        <Text variant="footnote" tone="tertiary" align="center">
          {q ? `“${query.trim()}” için kayıt yok.` : 'Bu filtrede kayıt yok.'}
        </Text>
      ) : null}
      {[...groups.entries()].map(([month, txns]) => {
        const net = txns.reduce((s, t) => s + t.amountTRY, 0);
        return (
          <View key={month} style={{ gap: space.sm }}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
              <Text variant="overline" tone="tertiary">
                {upperTR(month)}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
                <Text variant="caption" tone="tertiary">
                  Nakde etkisi
                </Text>
                <Money value={net} variant="numS" sign="always" tone="secondary" />
              </View>
            </View>
            <Card padding={0} style={{ paddingHorizontal: space.lg, paddingVertical: space.xs }}>
              {txns.map((t, i) => (
                <View key={t.id}>
                  {i > 0 ? (
                    <View style={{ height: 1, backgroundColor: colors.border, marginLeft: 52 }} />
                  ) : null}
                  <TxnRow
                    txn={t}
                    onPress={() => setSelected(t)}
                    onEdit={() => actions.edit(t)}
                    onDelete={() => void actions.remove(t)}
                  />
                </View>
              ))}
            </Card>
          </View>
        );
      })}
    </View>
  );
}

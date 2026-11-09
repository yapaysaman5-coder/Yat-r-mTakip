import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { AssetPicker } from '@/components/form/AssetPicker';
import {
  chosenDay,
  DateChoiceField,
  dateValueFor,
  type DateValue,
} from '@/components/form/DateChoice';
import type { StoredAsset } from '@/data/types';
import { quantityAt, trDay, trDayStart, type Transaction } from '@/domain';
import { issueText, rejectionText } from '@/i18n/rejections';
import { usePortfolioStore, usePortfolioView } from '@/state/portfolio';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';
import {
  AssetAvatar,
  Button,
  Chip,
  PressableScale,
  Screen,
  StackHeader,
  Text,
  TextField,
  toast,
} from '@/ui';
import { formatDate, formatQuantity, parseDecimalInput } from '@/utils/format';

const avatarMarket = (m: string) => (m === 'BIST' ? 'bist' : m === 'CRYPTO' ? 'crypto' : 'us');

const PRESETS: [label: string, ratio: string][] = [
  ['Bedelsiz %100', '2'],
  ['Bedelsiz %50', '1,5'],
  ['Bedelsiz %200', '3'],
  ['Bölünme 1:10', '10'],
];

/**
 * Bölünme / bedelsiz (docs/02-HESAPLAMA-MOTORU.md §13.1): units are multiplied on the ex-date,
 * total cost stays the same. Can be opened prefilled from a detected split suggestion.
 */
export default function SplitScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{
    assetId?: string;
    id?: string;
    date?: string;
    ratio?: string;
  }>();
  const view = usePortfolioView();
  const save = usePortfolioStore((s) => s.save);
  const editing = params.id ? view.history.find((h) => h.id === params.id)?.source : undefined;
  const [now] = useState(() => new Date());
  const [asset, setAsset] = useState<StoredAsset | null>(
    view.data.assets.get(editing?.assetId ?? params.assetId ?? '') ?? null,
  );
  const [picking, setPicking] = useState(false);
  const [date, setDate] = useState<DateValue>(() =>
    params.date
      ? { choice: 'other', other: formatDate(`${params.date}T12:00:00Z`), time: '' }
      : dateValueFor(editing?.ts, now),
  );
  const [ratio, setRatio] = useState((editing?.splitRatio ?? params.ratio ?? '').replace('.', ','));
  const [error, setError] = useState<string | null>(null);

  const day = chosenDay(date, now);
  // A split applies from the start of its ex-date (before that day's trades).
  const ts = day ? new Date(trDayStart(day)).toISOString() : null;
  const before =
    asset && ts
      ? quantityAt(
          view.data.txns.filter((t) => t.id !== editing?.id),
          asset.id,
          Date.parse(ts) - 1,
        ).toNumber()
      : 0;
  const r = Number(parseDecimalInput(ratio) ?? NaN);

  const submit = async () => {
    setError(null);
    if (!asset) return setError('Önce varlığı seç.');
    if (!day || !ts) return setError('Tarihi GG.AA.YYYY olarak yaz.');
    if (day > trDay(now)) return setError('İleri tarihli kayıt eklenemez.');
    if (!(r > 0) || r === 1) return setError('Oranı yaz (ör. %100 bedelsiz için 2).');
    const txn: Transaction = {
      id: editing?.id ?? '',
      type: 'SPLIT',
      ts,
      assetId: asset.id,
      splitRatio: String(r),
    };
    const res = await save(txn);
    if (!res.ok) {
      setError(
        res.rejection.code === 'INVALID'
          ? issueText(res.rejection.issues[0])
          : rejectionText(res.rejection, view.history),
      );
      return;
    }
    toast.show({ message: 'Bölünme kaydedildi', tone: 'success' });
    router.back();
  };

  return (
    <Screen header={<StackHeader title="Bölünme / Bedelsiz" />}>
      <PressableScale
        onPress={() => setPicking(true)}
        haptic="selection"
        accessibilityRole="button"
        accessibilityLabel="Varlık seç"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.md,
          padding: space.md,
          borderRadius: radius.md,
          backgroundColor: colors.surfaceAlt,
        }}>
        {asset ? (
          <AssetAvatar symbol={asset.symbol} market={avatarMarket(asset.market)} size={38} />
        ) : null}
        <View style={{ flex: 1 }}>
          <Text variant="caption" tone="secondary">
            Varlık
          </Text>
          <Text variant="bodyStrong" numberOfLines={1}>
            {asset ? `${asset.symbol} · ${asset.name ?? ''}` : 'Varlığı seç'}
          </Text>
        </View>
        <ChevronRight size={18} color={colors.textTertiary} strokeWidth={2.4} />
      </PressableScale>

      <DateChoiceField value={date} onChange={setDate} showTime={false} />
      <Text variant="caption" tone="tertiary">
        Hak kullanım (bölünme) tarihi: yeni adetlerin geçerli olduğu ilk gün.
      </Text>

      <TextField
        label="Oran (yeni adet ÷ eski adet)"
        value={ratio}
        onChangeText={setRatio}
        placeholder="2"
        keyboardType="decimal-pad"
        large
      />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.xs }}>
        {PRESETS.map(([label, value]) => (
          <Chip
            key={label}
            label={label}
            size="sm"
            selected={ratio === value}
            onPress={() => setRatio(value)}
          />
        ))}
      </View>

      {asset && r > 0 && r !== 1 ? (
        <View
          style={{
            padding: space.lg,
            borderRadius: radius.lg,
            backgroundColor: colors.surfaceAlt,
            gap: space.xs,
          }}>
          <Text variant="subhead">
            {formatQuantity(before)} adet → {formatQuantity(before * r)} adet
          </Text>
          <Text variant="caption" tone="tertiary">
            Toplam maliyet değişmez; adet başı maliyet {formatQuantity(r)} kat azalır.
          </Text>
        </View>
      ) : null}

      {error ? (
        <View
          style={{ padding: space.md, borderRadius: radius.md, backgroundColor: colors.downSoft }}>
          <Text variant="footnote" tone="down">
            {error}
          </Text>
        </View>
      ) : null}
      <Button label="Kaydet" onPress={submit} fullWidth />

      <AssetPicker visible={picking} onClose={() => setPicking(false)} heldOnly onPick={setAsset} />
    </Screen>
  );
}

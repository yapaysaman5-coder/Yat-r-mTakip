import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { AssetPicker } from '@/components/form/AssetPicker';
import {
  chosenDay,
  DateChoiceField,
  dateValueFor,
  type DateValue,
} from '@/components/form/DateChoice';
import { toInput } from '@/components/form/numbers';
import { getDatabase } from '@/data/database';
import { fxAssetId } from '@/data/engine';
import { getMarketRouter } from '@/data/market';
import { closeOnDay } from '@/data/service/trade';
import { defaultDividendTax, tradeTime } from '@/data/trade';
import type { StoredAsset } from '@/data/types';
import { quantityAt, trDay, type Transaction } from '@/domain';
import { issueText, rejectionText } from '@/i18n/rejections';
import { usePortfolioStore, usePortfolioView } from '@/state/portfolio';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';
import {
  AssetAvatar,
  Button,
  PressableScale,
  Screen,
  SegmentedControl,
  StackHeader,
  Text,
  TextField,
  toast,
} from '@/ui';
import {
  formatMoney,
  formatPercent,
  formatPrice,
  formatQuantity,
  parseDecimalInput,
  type CurrencyCode,
} from '@/utils/format';

const num = (text: string) => {
  const v = parseDecimalInput(text);
  return v === null ? null : Number(v);
};
const avatarMarket = (m: string) => (m === 'BIST' ? 'bist' : m === 'CRYPTO' ? 'crypto' : 'us');

/** Temettü: gross amount (in total or per share), withholding tax and the rate for USD. */
export default function DividendScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ assetId?: string; id?: string }>();
  const view = usePortfolioView();
  const save = usePortfolioStore((s) => s.save);
  const editing = params.id ? view.history.find((h) => h.id === params.id)?.source : undefined;
  const [now] = useState(() => new Date());
  const [asset, setAsset] = useState<StoredAsset | null>(
    view.data.assets.get(editing?.assetId ?? params.assetId ?? '') ?? null,
  );
  const [picking, setPicking] = useState(false);
  const [date, setDate] = useState<DateValue>(() => dateValueFor(editing?.ts, now));
  const [mode, setMode] = useState<'total' | 'perShare'>('total');
  const [gross, setGross] = useState(editing?.amount?.replace('.', ',') ?? '');
  const [taxPct, setTaxPct] = useState(() => {
    if (editing?.amount && editing.tax)
      return toInput((Number(editing.tax) / Number(editing.amount)) * 100, 2);
    const a = view.data.assets.get(params.assetId ?? '');
    return a ? toInput(defaultDividendTax(a.market) * 100, 0) : '15';
  });
  const [fx, setFx] = useState(
    editing?.fxRate && editing.fxRate !== '1' ? editing.fxRate.replace('.', ',') : '',
  );
  const [note, setNote] = useState(editing?.note ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const day = chosenDay(date, now);
  const foreign = !!asset && asset.currency !== 'TRY';
  const ccy = (asset?.currency ?? 'TRY') as CurrencyCode;

  useEffect(() => {
    let alive = true;
    if (!asset || !day || asset.currency === 'TRY') return;
    (async () => {
      const db = await getDatabase();
      const r = await closeOnDay(
        db,
        view.isDemo ? null : getMarketRouter(),
        fxAssetId(view.portfolio.kind, asset.currency),
        day,
      );
      if (alive && r) setFx((f) => f || toInput(r.close, 4));
    })().catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [asset, day, view.isDemo, view.portfolio.kind]);

  const ts = asset && day ? tradeTime(asset.market, day, now, date.time) : null;
  const held = asset && ts ? quantityAt(view.data.txns, asset.id, ts).toNumber() : 0;
  const grossInput = num(gross);
  const grossN = grossInput === null ? null : mode === 'perShare' ? grossInput * held : grossInput;
  const taxN = grossN !== null ? grossN * ((num(taxPct) ?? 0) / 100) : 0;
  const fxN = foreign ? num(fx) : 1;
  const netTRY = grossN !== null && fxN ? (grossN - taxN) * fxN : null;

  const submit = async () => {
    setError(null);
    if (!asset) return setError('Önce varlığı seç.');
    if (!day || !ts) return setError('Tarihi GG.AA.YYYY olarak yaz.');
    if (day > trDay(now)) return setError('İleri tarihli kayıt eklenemez.');
    if (!grossN || grossN <= 0) return setError('Brüt temettü tutarını yaz.');
    if (foreign && !fxN) return setError('Kuru yaz.');
    const txn: Transaction = {
      id: editing?.id ?? '',
      type: 'DIVIDEND',
      ts,
      assetId: asset.id,
      amount: String(Math.round(grossN * 1e8) / 1e8),
      tax: String(Math.round(taxN * 1e8) / 1e8),
      fxRate: foreign ? String(fxN) : '1',
      ...(note.trim() ? { note: note.trim() } : {}),
    };
    setBusy(true);
    const r = await save(txn);
    setBusy(false);
    if (!r.ok) {
      setError(
        r.rejection.code === 'INVALID'
          ? issueText(r.rejection.issues[0])
          : rejectionText(r.rejection, view.history),
      );
      return;
    }
    toast.show({
      message: editing ? 'Temettü güncellendi' : 'Temettü kaydedildi',
      tone: 'success',
    });
    router.back();
  };

  return (
    <Screen header={<StackHeader title={editing ? 'Temettüyü Düzenle' : 'Temettü'} />}>
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
            {asset ? `${asset.symbol} · ${asset.name ?? ''}` : 'Temettü veren varlığı seç'}
          </Text>
        </View>
        <ChevronRight size={18} color={colors.textTertiary} strokeWidth={2.4} />
      </PressableScale>

      <DateChoiceField value={date} onChange={setDate} />
      {asset ? (
        <Text variant="footnote" tone="secondary">
          O tarihte elindeki: {formatQuantity(held)} adet
        </Text>
      ) : null}

      <SegmentedControl
        size="sm"
        value={mode}
        onChange={setMode}
        options={[
          { key: 'total', label: 'Toplam brüt' },
          { key: 'perShare', label: 'Hisse başına' },
        ]}
      />
      <TextField
        label={`${mode === 'total' ? 'Brüt temettü' : 'Hisse başına brüt'} (${ccy === 'TRY' ? '₺' : '$'})`}
        value={gross}
        onChangeText={setGross}
        placeholder="0,00"
        keyboardType="decimal-pad"
        large
        hint={
          mode === 'perShare' && grossN ? `Toplam brüt: ${formatPrice(grossN, ccy)}` : undefined
        }
      />
      <TextField
        label="Stopaj (%)"
        value={taxPct}
        onChangeText={setTaxPct}
        keyboardType="decimal-pad"
        hint={
          asset?.market === 'US'
            ? 'ABD temettülerinde genellikle %20 kesilir'
            : 'BIST temettülerinde %15 stopaj kesilir'
        }
      />
      {foreign ? (
        <TextField
          label={`Kur (1 ${asset?.currency} kaç ₺)`}
          value={fx}
          onChangeText={setFx}
          keyboardType="decimal-pad"
        />
      ) : null}

      {netTRY !== null ? (
        <View
          style={{
            padding: space.lg,
            borderRadius: radius.lg,
            backgroundColor: colors.surfaceAlt,
            gap: space.sm,
          }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text variant="subhead" tone="secondary">
              Hesaba geçen (net)
            </Text>
            <Text variant="numM" tone="up">
              {formatMoney(netTRY, { sign: 'always' })}
            </Text>
          </View>
          <Text variant="caption" tone="tertiary">
            Brüt {formatPrice(grossN ?? 0, ccy)} − stopaj {formatPrice(taxN, ccy)} (
            {formatPercent((num(taxPct) ?? 0) / 100, { decimals: 0 })})
          </Text>
        </View>
      ) : null}

      <TextField label="Not (isteğe bağlı)" value={note} onChangeText={setNote} maxLength={120} />
      {error ? (
        <View
          style={{ padding: space.md, borderRadius: radius.md, backgroundColor: colors.downSoft }}>
          <Text variant="footnote" tone="down">
            {error}
          </Text>
        </View>
      ) : null}
      <Button
        label={editing ? 'Kaydet' : 'Temettüyü Kaydet'}
        onPress={submit}
        disabled={busy}
        fullWidth
      />

      <AssetPicker
        visible={picking}
        onClose={() => setPicking(false)}
        heldOnly
        onPick={(a) => {
          setAsset(a);
          setFx('');
          if (!editing) setTaxPct(toInput(defaultDividendTax(a.market) * 100, 0));
        }}
      />
    </Screen>
  );
}

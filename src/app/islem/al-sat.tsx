import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronRight, TriangleAlert } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { AssetPicker } from '@/components/form/AssetPicker';
import {
  chosenDay,
  DateChoiceField,
  dateValueFor,
  type DateValue,
} from '@/components/form/DateChoice';
import { priceDecimals, toInput } from '@/components/form/numbers';
import { getDatabase } from '@/data/database';
import { fxAssetId } from '@/data/engine';
import { getMarketRouter } from '@/data/market';
import { instrumentFor } from '@/data/market/instruments';
import { closeOnDay, ensureAsset, type DayClose } from '@/data/service/trade';
import { defaultFee, feeRule, previewTrade, tradeTime } from '@/data/trade';
import type { StoredAsset } from '@/data/types';
import { trDay, type Transaction } from '@/domain';
import { issueText, rejectionText } from '@/i18n/rejections';
import { currentEngine, usePortfolioStore, usePortfolioView } from '@/state/portfolio';
import { useSettings } from '@/state/settings';
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
  Toggle,
  toast,
} from '@/ui';
import {
  formatDate,
  formatMoney,
  formatPercent,
  formatPrice,
  formatQuantity,
  parseDecimalInput,
  type CurrencyCode,
} from '@/utils/format';

type Side = 'BUY' | 'SELL';
type Entry = 'quantity' | 'amount';
type Payment = 'cash' | 'external';

const avatarMarket = (m: string) => (m === 'BIST' ? 'bist' : m === 'CRYPTO' ? 'crypto' : 'us');
/** Shares on Borsa İstanbul trade in whole units; US fractions to 4, crypto to 8 decimals. */
const unitDecimals = (m: string) => (m === 'BIST' ? 0 : m === 'US' ? 4 : 8);
const num = (text: string) => {
  const v = parseDecimalInput(text);
  return v === null ? null : Number(v);
};

/** Al / Sat formu (docs/01-PROJE-DOKUMANI.md §6.4). */
export default function TradeScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ side?: string; assetId?: string; id?: string }>();
  const view = usePortfolioView();
  const save = usePortfolioStore((s) => s.save);
  const fees = useSettings((s) => s.fees);
  const remove = usePortfolioStore((s) => s.remove);

  const editing = params.id ? view.history.find((h) => h.id === params.id)?.source : undefined;
  const [now] = useState(() => new Date());
  const initialAsset = (() => {
    const id = editing?.assetId ?? params.assetId;
    if (!id) return null;
    const known = view.data.assets.get(id);
    if (known) return known;
    const inst = instrumentFor(id);
    return inst
      ? { id, symbol: inst.symbol, name: inst.name, market: inst.market, currency: inst.currency }
      : null;
  })();

  const [side, setSide] = useState<Side>(
    (editing?.type ?? params.side) === 'SELL' ? 'SELL' : 'BUY',
  );
  const [asset, setAsset] = useState<StoredAsset | null>(initialAsset);
  const [picking, setPicking] = useState(false);
  const [date, setDate] = useState<DateValue>(() => dateValueFor(editing?.ts, now));
  const [entry, setEntry] = useState<Entry>('quantity');
  const [quantity, setQuantity] = useState(editing?.quantity?.replace('.', ',') ?? '');
  const [amount, setAmount] = useState('');
  const [price, setPrice] = useState(editing?.price?.replace('.', ',') ?? '');
  const [fx, setFx] = useState(
    editing?.fxRate && editing.fxRate !== '1' ? editing.fxRate.replace('.', ',') : '',
  );
  const [fee, setFee] = useState(editing?.fee?.replace('.', ',') ?? '');
  const [feeTouched, setFeeTouched] = useState(!!editing);
  const [note, setNote] = useState(editing?.note ?? '');
  const [payment, setPayment] = useState<Payment>('cash');
  const [withdraw, setWithdraw] = useState(!!editing?.withdrawProceeds);
  // Typed by hand (or loaded for an edit): never replaced by a suggestion.
  const [priceTouched, setPriceTouched] = useState(!!editing);
  const [fxTouched, setFxTouched] = useState(!!editing);
  const [closeHint, setCloseHint] = useState<DayClose | null>(null);
  const [fxHint, setFxHint] = useState<DayClose | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const day = chosenDay(date, now);
  const foreign = !!asset && asset.currency !== 'TRY';
  const ccy = (asset?.currency ?? 'TRY') as CurrencyCode;
  const buy = side === 'BUY';
  const accent = buy ? colors.up : colors.down;

  // The chosen day's close (and USD/TRY) to suggest; fetched once per asset and day.
  useEffect(() => {
    let alive = true;
    if (!asset || !day) return;
    (async () => {
      const db = await getDatabase();
      const router = view.isDemo ? null : getMarketRouter();
      const c = await closeOnDay(db, router, asset.id, day);
      const r =
        asset.currency === 'TRY'
          ? null
          : await closeOnDay(db, router, fxAssetId(view.portfolio.kind, asset.currency), day);
      if (!alive) return;
      setCloseHint(c);
      setFxHint(r);
      // Fill empty fields with the day's figures (never overwrite what was typed).
      if (c && !priceTouched) setPrice(toInput(c.close, priceDecimals(c.close)));
      if (r && !fxTouched) setFx(toInput(r.close, 4));
    })().catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [asset, day, view.isDemo, view.portfolio.kind, priceTouched, fxTouched]);

  const priceN = num(price);
  const fxN = foreign ? num(fx) : 1;
  const amountN = num(amount);
  const qtyN =
    entry === 'amount' && asset && priceN && fxN && amountN
      ? Math.floor((amountN / (priceN * fxN)) * 10 ** unitDecimals(asset.market)) /
        10 ** unitDecimals(asset.market)
      : num(quantity);
  const gross = qtyN && priceN ? qtyN * priceN : 0;
  const autoFee = asset ? defaultFee(asset.market, gross, fees) : 0;
  const feeN = feeTouched ? (num(fee) ?? 0) : autoFee;

  const ts = asset && day ? tradeTime(asset.market, day, now, date.time) : null;
  const draft: Transaction | null =
    asset && ts && qtyN && qtyN > 0 && priceN !== null && fxN
      ? {
          id: editing?.id ?? '__draft__',
          type: side,
          ts,
          assetId: asset.id,
          quantity: String(qtyN),
          price: String(priceN),
          fee: String(feeN),
          fxRate: foreign ? String(fxN) : '1',
          ...(side === 'SELL' && withdraw ? { withdrawProceeds: true } : {}),
          ...(note.trim() ? { note: note.trim() } : {}),
        }
      : null;
  const existing = view.data.txns.filter((t) => !t.isAuto);
  const preview = draft ? previewTrade(existing, draft, currentEngine()) : null;
  const held =
    preview?.quantityBefore.toNumber() ??
    view.holdings.find((h) => h.assetId === asset?.id)?.quantity ??
    0;
  const totalAsset = buy ? gross + feeN : gross - feeN;
  const totalTRY = totalAsset * (fxN ?? 1);

  const submit = async () => {
    setError(null);
    if (!asset) return setError('Önce varlığı seç.');
    if (!day) return setError('Tarihi GG.AA.YYYY olarak yaz.');
    if (day > trDay(now)) return setError('İleri tarihli kayıt eklenemez.');
    if (!qtyN || qtyN <= 0) return setError('Adet sıfırdan büyük olmalı.');
    if (priceN === null || priceN < 0) return setError('Fiyatı yaz.');
    if (foreign && !fxN) return setError('Kuru yaz (1 USD kaç TL).');
    if (!draft) return;
    setBusy(true);
    const db = await getDatabase();
    if (!view.isDemo) await ensureAsset(db, asset);

    // "Dışarıdan yeni para": the whole cost comes in as a deposit right before the purchase.
    let depositId: string | null = null;
    if (buy && payment === 'external' && !editing) {
      const dep = await save({
        id: '',
        type: 'DEPOSIT',
        ts: draft.ts,
        amount: String(Math.ceil(totalTRY * 100) / 100),
        note: `${asset.symbol} alışı için`,
      });
      if (dep.ok) depositId = dep.txn.id;
    }
    const result = await save({ ...draft, id: editing?.id ?? '' });
    setBusy(false);
    if (!result.ok) {
      if (depositId) await remove(depositId);
      const r = result.rejection;
      setError(r.code === 'INVALID' ? issueText(r.issues[0]) : rejectionText(r, view.history));
      return;
    }
    toast.show({
      message: editing
        ? 'İşlem güncellendi'
        : buy
          ? `${asset.symbol} alışı kaydedildi`
          : `${asset.symbol} satışı kaydedildi`,
      tone: 'success',
    });
    router.back();
  };

  return (
    <Screen header={<StackHeader title={editing ? 'İşlemi Düzenle' : 'İşlem Ekle'} />}>
      <SegmentedControl
        value={side}
        onChange={(s) => {
          setSide(s);
          setError(null);
        }}
        options={[
          { key: 'BUY', label: 'AL' },
          { key: 'SELL', label: 'SAT' },
        ]}
      />

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
          borderWidth: 1.5,
          borderColor: asset ? accent : colors.border,
        }}>
        {asset ? (
          <AssetAvatar symbol={asset.symbol} market={avatarMarket(asset.market)} size={38} />
        ) : null}
        <View style={{ flex: 1 }}>
          <Text variant="caption" tone="secondary">
            Varlık
          </Text>
          <Text variant="bodyStrong" numberOfLines={1}>
            {asset ? `${asset.symbol} · ${asset.name ?? ''}` : 'Seç: BIST, ABD veya kripto'}
          </Text>
        </View>
        <ChevronRight size={18} color={colors.textTertiary} strokeWidth={2.4} />
      </PressableScale>

      <DateChoiceField value={date} onChange={setDate} />

      {!buy && asset ? (
        <View
          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text variant="footnote" tone="secondary">
            O tarihte elindeki: {formatQuantity(held)}{' '}
            {asset.market === 'CRYPTO' ? asset.symbol : 'adet'}
          </Text>
          <Button
            label="Tümünü sat"
            size="sm"
            variant="ghost"
            onPress={() => {
              setEntry('quantity');
              const d = unitDecimals(asset.market);
              const text = toInput(held, d);
              setQuantity(d > 0 ? text.replace(/,?0+$/, '') || '0' : text);
            }}
          />
        </View>
      ) : null}

      <SegmentedControl
        size="sm"
        value={entry}
        onChange={setEntry}
        options={[
          { key: 'quantity', label: 'Adet ile' },
          { key: 'amount', label: 'Tutar (₺) ile' },
        ]}
      />
      {entry === 'quantity' ? (
        <TextField
          label="Adet"
          value={quantity}
          onChangeText={setQuantity}
          placeholder="0"
          keyboardType="decimal-pad"
          large
        />
      ) : (
        <TextField
          label="Tutar (TL)"
          value={amount}
          onChangeText={setAmount}
          placeholder="0,00"
          keyboardType="decimal-pad"
          prefix="₺"
          large
          hint={
            qtyN
              ? `≈ ${formatQuantity(qtyN)} ${asset?.market === 'CRYPTO' ? asset.symbol : 'adet'}`
              : undefined
          }
        />
      )}

      <TextField
        label={`Fiyat (${ccy === 'TRY' ? '₺' : '$'})`}
        value={price}
        onChangeText={(t) => {
          setPriceTouched(true);
          setPrice(t);
        }}
        placeholder="0,00"
        keyboardType="decimal-pad"
        hint={
          closeHint
            ? `${closeHint.date === day ? 'Seçilen gün' : formatDate(`${closeHint.date}T12:00:00Z`)} kapanışı: ${formatPrice(closeHint.close, ccy)}`
            : asset
              ? 'Kapanış fiyatı bulunamadı; elle yaz.'
              : undefined
        }
      />
      {closeHint && num(price) !== closeHint.close ? (
        <Button
          label={`Kapanışı kullan (${formatPrice(closeHint.close, ccy)})`}
          size="sm"
          variant="ghost"
          onPress={() => setPrice(toInput(closeHint.close, priceDecimals(closeHint.close)))}
        />
      ) : null}

      {foreign ? (
        <TextField
          label={`Kur (1 ${asset?.currency} kaç ₺)`}
          value={fx}
          onChangeText={(t) => {
            setFxTouched(true);
            setFx(t);
          }}
          placeholder="0,0000"
          keyboardType="decimal-pad"
          hint={
            fxHint
              ? `${formatDate(`${fxHint.date}T12:00:00Z`)} kuru: ${toInput(fxHint.close, 4)}`
              : undefined
          }
        />
      ) : null}

      <TextField
        label={`Komisyon (${ccy === 'TRY' ? '₺' : '$'})`}
        value={feeTouched ? fee : toInput(autoFee, 2)}
        onChangeText={(t) => {
          setFeeTouched(true);
          setFee(t);
        }}
        placeholder="0,00"
        keyboardType="decimal-pad"
        hint={
          !feeTouched && asset && feeRule(asset.market, fees)
            ? `${feeRule(asset.market, fees)} · değiştirebilirsin`
            : undefined
        }
      />

      {asset && preview ? (
        <View
          style={{
            padding: space.lg,
            borderRadius: radius.lg,
            backgroundColor: colors.surfaceAlt,
            gap: space.sm,
          }}>
          <Row
            label={buy ? 'Toplam tutar' : 'Satış tutarı (komisyon düşülmüş)'}
            value={
              foreign
                ? `${formatPrice(totalAsset, ccy)} · ${formatMoney(totalTRY)}`
                : formatMoney(totalTRY)
            }
            strong
          />
          {buy ? (
            <>
              <Row
                label="Yeni ortalama maliyet"
                value={
                  preview.averageCostAfter
                    ? formatPrice(preview.averageCostAfter.toNumber(), ccy)
                    : '—'
                }
              />
              <Row label="Yeni adet" value={formatQuantity(preview.quantityAfter.toNumber())} />
              {!editing ? (
                <View style={{ gap: space.xs, marginTop: space.xs }}>
                  <Text variant="caption" tone="secondary">
                    Ödeme
                  </Text>
                  <SegmentedControl
                    size="sm"
                    value={payment}
                    onChange={setPayment}
                    options={[
                      {
                        key: 'cash',
                        label: `Portföy nakdi (${formatMoney(preview.cashBefore.toNumber(), { decimals: 0 })})`,
                      },
                      { key: 'external', label: 'Dışarıdan yeni para' },
                    ]}
                  />
                </View>
              ) : null}
              {payment === 'cash' && preview.autoDeposit ? (
                <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' }}>
                  <TriangleAlert size={16} color={colors.warning} strokeWidth={2.4} />
                  <Text variant="footnote" tone="secondary" style={{ flex: 1 }}>
                    Nakit yetersiz: {formatMoney(preview.autoDeposit.toNumber())} için otomatik para
                    yatırma eklenir (Canlı Bütçe’de “Yatırılan”).
                  </Text>
                </View>
              ) : null}
              {payment === 'external' && !editing ? (
                <Text variant="footnote" tone="secondary">
                  Alışla aynı anda {formatMoney(Math.ceil(totalTRY * 100) / 100)} para girişi de
                  kaydedilir.
                </Text>
              ) : null}
            </>
          ) : (
            <>
              <Row
                label="Kalan adet"
                value={formatQuantity(Math.max(0, preview.quantityAfter.toNumber()))}
              />
              {preview.realization ? (
                <Row
                  label="Tahmini gerçekleşen K/Z"
                  value={`${formatMoney(preview.realization.pnlTRY.toNumber(), { sign: 'always' })} (${formatPercent(
                    preview.realization.costBasisTRY.gt(0)
                      ? preview.realization.pnlTRY.div(preview.realization.costBasisTRY).toNumber()
                      : 0,
                    { decimals: 1, sign: 'always' },
                  )})`}
                  tone={preview.realization.pnlTRY.gte(0) ? 'up' : 'down'}
                />
              ) : null}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: space.xs,
                }}>
                <View style={{ flex: 1 }}>
                  <Text variant="subhead">Hesaptan çek</Text>
                  <Text variant="caption" tone="tertiary">
                    {withdraw
                      ? 'Satış tutarı portföyden çıkar (Çekilen artar)'
                      : 'Satış tutarı nakitte kalır'}
                  </Text>
                </View>
                <Toggle
                  value={withdraw}
                  onValueChange={setWithdraw}
                  accessibilityLabel="Hesaptan çek"
                />
              </View>
            </>
          )}
          {preview.issues.length ? (
            <Text variant="footnote" tone="down">
              {preview.issues[0].code === 'OVERSELL'
                ? `O tarihte en fazla ${formatQuantity(Number(preview.issues[0].available ?? 0))} satılabilir.`
                : 'Bu kayıt nakdi eksiye düşürür.'}
            </Text>
          ) : null}
        </View>
      ) : null}

      <TextField
        label="Not (isteğe bağlı)"
        value={note}
        onChangeText={setNote}
        maxLength={120}
        placeholder="ör. uzun vade"
      />

      {error ? (
        <View
          style={{ padding: space.md, borderRadius: radius.md, backgroundColor: colors.downSoft }}>
          <Text variant="footnote" tone="down">
            {error}
          </Text>
        </View>
      ) : null}

      <Button
        label={editing ? 'Kaydet' : buy ? 'ALIŞI KAYDET' : 'SATIŞI KAYDET'}
        variant={buy ? 'buy' : 'sell'}
        onPress={submit}
        disabled={busy || !!preview?.issues.length}
        fullWidth
      />

      <AssetPicker
        visible={picking}
        onClose={() => setPicking(false)}
        heldOnly={!buy}
        onPick={(a) => {
          setAsset(a);
          setPrice('');
          setFx('');
          setPriceTouched(false);
          setFxTouched(false);
          setCloseHint(null);
          setFxHint(null);
        }}
      />
    </Screen>
  );
}

function Row({
  label,
  value,
  strong,
  tone,
}: {
  label: string;
  value: string;
  strong?: boolean;
  tone?: 'up' | 'down';
}) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.md }}>
      <Text variant={strong ? 'subhead' : 'footnote'} tone="secondary" style={{ flexShrink: 1 }}>
        {label}
      </Text>
      <Text variant={strong ? 'numM' : 'numS'} tone={tone} align="right">
        {value}
      </Text>
    </View>
  );
}

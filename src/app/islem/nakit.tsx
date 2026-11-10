import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowDownToLine, ArrowUpFromLine } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { trDay, trDayEnd, trDayStart, type Transaction } from '@/domain';
import { issueText, rejectionText } from '@/i18n/rejections';
import { usePortfolioStore, usePortfolioView } from '@/state/portfolio';
import { useColors } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';
import { Button, Chip, Screen, SegmentedControl, StackHeader, Text, TextField, toast } from '@/ui';
import { formatDate, formatMoney, parseDecimalInput } from '@/utils/format';

type CashType = 'DEPOSIT' | 'WITHDRAW' | 'FEE';
type DateChoice = 'today' | 'yesterday' | 'other';

/** "09.11.2026" → "2026-11-09" (null if not a real date). */
function parseDay(text: string): string | null {
  const m = /^(\d{1,2})[./](\d{1,2})[./](\d{4})$/.exec(text.trim());
  if (!m) return null;
  const iso = `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  const d = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== iso ? null : iso;
}

/**
 * Para Yatır / Para Çek (Faz 6'dan öne alındı). A deposit on an earlier day is placed at the
 * start of that day and a withdrawal at its end, so that day's trades see the money as a
 * person would expect. Today's records use the current time.
 */
export default function CashFormScreen() {
  const router = useRouter();
  const colors = useColors();
  const params = useLocalSearchParams<{ type?: string; id?: string }>();
  const view = usePortfolioView();
  const save = usePortfolioStore((s) => s.save);

  const editing = params.id ? view.history.find((h) => h.id === params.id)?.source : undefined;
  const now = new Date();
  const today = trDay(now);
  const yesterday = trDay(now.getTime() - 86_400_000);
  const initialDay = editing ? trDay(editing.ts) : today;

  const initialType = editing?.type ?? params.type;
  const [type, setType] = useState<CashType>(
    initialType === 'WITHDRAW' || initialType === 'FEE' ? initialType : 'DEPOSIT',
  );
  const [amount, setAmount] = useState(
    editing?.amount ? formatMoney(editing.amount).replace('₺', '') : '',
  );
  const [choice, setChoice] = useState<DateChoice>(
    initialDay === today ? 'today' : initialDay === yesterday ? 'yesterday' : 'other',
  );
  const [otherDay, setOtherDay] = useState(
    initialDay === today ? '' : formatDate(`${initialDay}T12:00:00Z`),
  );
  const [note, setNote] = useState(editing?.note ?? '');
  const [errors, setErrors] = useState<{ amount?: string; date?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);

  const day = choice === 'today' ? today : choice === 'yesterday' ? yesterday : parseDay(otherDay);
  const deposit = type === 'DEPOSIT';
  const fee = type === 'FEE';
  const title = fee ? 'Hesap Ücreti' : deposit ? 'Para Yatır' : 'Para Çek';

  const submit = async () => {
    const value = parseDecimalInput(amount);
    const next: typeof errors = {};
    if (!value || Number(value) <= 0) next.amount = 'Sıfırdan büyük bir tutar gir.';
    if (!day) next.date = 'Tarihi GG.AA.YYYY olarak yaz (ör. 05.03.2026).';
    else if (day > today) next.date = 'İleri tarihli kayıt eklenemez.';
    setErrors(next);
    if (next.amount || next.date || !value || !day) return;

    const keepTime = editing && trDay(editing.ts) === day;
    const ts = keepTime
      ? editing.ts
      : day === today
        ? now.toISOString()
        : new Date(deposit ? trDayStart(day) : trDayEnd(day)).toISOString();
    const txn: Transaction = {
      id: editing?.id ?? '',
      type,
      ts,
      amount: value,
      ...(note.trim() ? { note: note.trim() } : {}),
    };
    setBusy(true);
    const result = await save(txn);
    setBusy(false);
    if (!result.ok) {
      const r = result.rejection;
      if (r.code === 'NEGATIVE_CASH') {
        const issue = r.issues[0];
        // The refused record itself (new, or the one being edited) went below zero.
        const own = issue.txnId === editing?.id || !view.history.some((h) => h.id === issue.txnId);
        const max = Number(value) + Number(issue.cash ?? 0);
        setErrors({
          form: own
            ? `Nakit yetmiyor: o tarihte en fazla ${formatMoney(Math.max(0, max))} ${fee ? 'düşülebilir' : 'çekebilirsin'}.`
            : rejectionText(r, view.history),
        });
      } else if (r.code === 'INVALID') {
        setErrors({ form: issueText(r.issues[0]) });
      } else {
        setErrors({ form: rejectionText(r, view.history) });
      }
      return;
    }
    toast.show({
      message: editing
        ? 'Kayıt güncellendi'
        : deposit
          ? 'Para girişi eklendi'
          : fee
            ? 'Hesap ücreti eklendi'
            : 'Para çıkışı eklendi',
      tone: 'success',
    });
    router.back();
  };

  return (
    <Screen header={<StackHeader title={editing ? 'Kaydı Düzenle' : title} />}>
      <SegmentedControl
        value={type}
        onChange={(t) => {
          setType(t);
          setErrors({});
        }}
        options={[
          { key: 'DEPOSIT', label: 'Para Yatır' },
          { key: 'WITHDRAW', label: 'Para Çek' },
          { key: 'FEE', label: 'Ücret' },
        ]}
      />

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.sm,
          padding: space.md,
          borderRadius: radius.md,
          backgroundColor: deposit ? colors.accentSoft : colors.warningSoft,
        }}>
        {deposit ? (
          <ArrowDownToLine size={18} color={colors.accent} strokeWidth={2.4} />
        ) : (
          <ArrowUpFromLine size={18} color={colors.warning} strokeWidth={2.4} />
        )}
        <Text variant="footnote" style={{ flex: 1 }}>
          {deposit
            ? `${view.portfolio.name} portföyüne nakit eklenir. Canlı Bütçe’de “Yatırılan” olarak görünür.`
            : fee
              ? `Saklama, hesap işletim gibi bir ücret: nakitten düşer ve Net K/Z’yi azaltır (yatırılan paraya dokunmaz). Kullanılabilir nakit: ${formatMoney(view.summary.cash)}.`
              : `Portföyden nakit çıkar. Şu an kullanılabilir nakit: ${formatMoney(view.summary.cash)}.`}
        </Text>
      </View>

      <TextField
        label="Tutar"
        value={amount}
        onChangeText={(t) => {
          setAmount(t);
          if (errors.amount || errors.form) setErrors({});
        }}
        placeholder="0,00"
        keyboardType="decimal-pad"
        prefix="₺"
        large
        autoFocus={!editing}
        error={errors.amount}
      />

      <View style={{ gap: space.xs }}>
        <Text variant="caption" tone="secondary">
          Tarih
        </Text>
        <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
          <Chip label="Bugün" selected={choice === 'today'} onPress={() => setChoice('today')} />
          <Chip
            label="Dün"
            selected={choice === 'yesterday'}
            onPress={() => setChoice('yesterday')}
          />
          <Chip
            label="Başka gün"
            selected={choice === 'other'}
            onPress={() => setChoice('other')}
          />
        </View>
        {choice === 'other' ? (
          <TextField
            label="Gün (GG.AA.YYYY)"
            value={otherDay}
            onChangeText={(t) => {
              setOtherDay(t);
              if (errors.date) setErrors({ ...errors, date: undefined });
            }}
            placeholder="05.03.2026"
            keyboardType="numbers-and-punctuation"
            maxLength={10}
            error={errors.date}
            style={{ marginTop: space.sm }}
          />
        ) : errors.date ? (
          <Text variant="caption" tone="down">
            {errors.date}
          </Text>
        ) : null}
      </View>

      <TextField
        label="Not (isteğe bağlı)"
        value={note}
        onChangeText={setNote}
        placeholder={fee ? 'ör. saklama ücreti' : 'ör. maaş, kira, birikim'}
        maxLength={120}
      />

      {errors.form ? (
        <View
          style={{ padding: space.md, borderRadius: radius.md, backgroundColor: colors.downSoft }}>
          <Text variant="footnote" tone="down">
            {errors.form}
          </Text>
        </View>
      ) : null}

      <Button
        label={editing ? 'Kaydet' : title}
        variant={deposit ? 'primary' : 'secondary'}
        onPress={submit}
        disabled={busy}
        fullWidth
      />
    </Screen>
  );
}

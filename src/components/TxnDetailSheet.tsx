import { useRouter } from 'expo-router';
import { Link2, Pencil, Trash2 } from 'lucide-react-native';
import { View } from 'react-native';

import type { HistoryItem } from '@/data/view/portfolioView';
import { rejectionText } from '@/i18n/rejections';
import { tr } from '@/i18n/tr';
import { usePortfolioStore } from '@/state/portfolio';
import { useColors } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';
import { Button, ChangeBadge, IconWell, Money, Sheet, Text, toast } from '@/ui';
import { formatDateTime, formatMoney, formatPrice, formatQuantity } from '@/utils/format';

import { txnVisual } from './txnVisual';

/** Edit (opens the right form) and delete with 5 seconds to undo, for a manual record. */
export function useTxnActions() {
  const router = useRouter();
  const remove = usePortfolioStore((s) => s.remove);
  const save = usePortfolioStore((s) => s.save);
  const history = usePortfolioStore((s) => s.view?.history ?? []);

  const edit = (item: HistoryItem) => {
    const t = item.source;
    if (!t) return;
    if (t.type === 'DEPOSIT' || t.type === 'WITHDRAW')
      router.push({ pathname: '/islem/nakit', params: { type: t.type, id: t.id } });
    else if (t.type === 'BUY' || t.type === 'SELL')
      router.push({ pathname: '/islem/al-sat', params: { side: t.type, id: t.id } });
    else if (t.type === 'DIVIDEND')
      router.push({ pathname: '/islem/temettu', params: { id: t.id } });
    else if (t.type === 'SPLIT') router.push({ pathname: '/islem/bolunme', params: { id: t.id } });
    else toast.show({ message: 'Hesap ücreti düzenleme Ayarlar fazında geliyor' });
  };

  const del = async (item: HistoryItem) => {
    const result = await remove(item.id);
    if (!result.ok) {
      toast.show({ message: rejectionText(result.rejection, history), tone: 'danger' });
      return;
    }
    const deleted = result.txn;
    toast.show({
      message: 'Kayıt silindi',
      actionLabel: 'GERİ AL',
      onAction: async () => {
        const back = await save(deleted);
        if (!back.ok) toast.show({ message: rejectionText(back.rejection), tone: 'danger' });
      },
    });
  };

  return { edit, remove: del };
}

/** A record's details with edit and delete (undo for 5 seconds). */
export function TxnDetailSheet({
  item,
  onClose,
}: {
  item: HistoryItem | null;
  onClose: () => void;
}) {
  const colors = useColors();
  const actions = useTxnActions();
  const history = usePortfolioStore((s) => s.view?.history ?? []);

  const t = item?.source;
  const v = item ? txnVisual(item.type, colors) : null;
  const linked = item?.linkedTo ? history.find((h) => h.id === item.linkedTo) : undefined;

  const onDelete = () => {
    if (!item) return;
    onClose();
    void actions.remove(item);
  };

  const onEdit = () => {
    if (!item) return;
    onClose();
    actions.edit(item);
  };

  const rows: [string, string][] = [];
  if (item) {
    rows.push(['Tarih', formatDateTime(item.ts)]);
    if (item.symbol) rows.push(['Varlık', item.symbol]);
    if (item.quantity !== undefined) rows.push(['Adet', formatQuantity(item.quantity)]);
    if (item.price !== undefined) rows.push(['Fiyat', formatPrice(item.price, item.currency)]);
    if (t?.fee && Number(t.fee) > 0) rows.push(['Komisyon', formatPrice(t.fee, item.currency)]);
    if (t?.fxRate && item.currency !== 'TRY') rows.push(['Kur', formatPrice(t.fxRate, 'TRY')]);
    if (t?.type === 'DIVIDEND') {
      rows.push(['Brüt temettü', formatPrice(t.amount ?? 0, item.currency)]);
      if (t.tax && Number(t.tax) > 0) rows.push(['Stopaj', formatPrice(t.tax, item.currency)]);
    }
    if (t?.note) rows.push(['Not', t.note]);
  }

  return (
    <Sheet
      visible={!!item}
      onClose={onClose}
      title={item ? (tr.txn[item.type] ?? item.type) : ''}
      subtitle={item?.isAuto ? 'Otomatik kayıt' : undefined}>
      {item && v ? (
        <View style={{ gap: space.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <IconWell background={v.bg} size={48}>
              <v.icon size={22} color={v.color} strokeWidth={2.4} />
            </IconWell>
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="caption" tone="secondary">
                Nakde etkisi
              </Text>
              <Money value={item.amountTRY} variant="numL" sign="always" colorize />
            </View>
            {item.realizedRatio !== undefined ? (
              <View style={{ alignItems: 'flex-end', gap: 2 }}>
                <Text variant="caption" tone="secondary">
                  Gerçekleşen K/Z
                </Text>
                <ChangeBadge value={item.realizedRatio} size="md" />
              </View>
            ) : null}
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

          {item.isAuto ? (
            <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' }}>
              <Link2 size={16} color={colors.textSecondary} strokeWidth={2.4} />
              <Text variant="footnote" tone="secondary" style={{ flex: 1 }}>
                {item.type === 'DEPOSIT'
                  ? `Bu para girişi, ${linked?.symbol ?? ''} alışında nakit yetmediği için otomatik eklendi (eksik tutar, bir üst kuruşa yuvarlanarak). `
                  : 'Satış tutarı, satışla birlikte otomatik çekildi. '}
                Bağlı olduğu kayıt değişince kendiliğinden güncellenir.
                {linked ? ` Tutar: ${formatMoney(Math.abs(item.amountTRY))}.` : ''}
              </Text>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', gap: space.sm }}>
              <Button
                label="Düzenle"
                icon={Pencil}
                variant="secondary"
                onPress={onEdit}
                style={{ flex: 1 }}
              />
              <Button
                label="Sil"
                icon={Trash2}
                variant="danger"
                onPress={onDelete}
                style={{ flex: 1 }}
              />
            </View>
          )}
        </View>
      ) : null}
    </Sheet>
  );
}

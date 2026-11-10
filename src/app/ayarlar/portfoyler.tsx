import { Check, FolderPlus, Pencil, Sparkles, Trash2, Wallet } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { getDatabase } from '@/data/database';
import {
  createPortfolio,
  deleteOwnPortfolio,
  PORTFOLIO_REASON,
  renameOwnPortfolio,
} from '@/data/service/portfolios';
import type { Portfolio } from '@/data/types';
import { usePortfolioStore } from '@/state/portfolio';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';
import {
  Button,
  Card,
  IconWell,
  PressableScale,
  Screen,
  Sheet,
  StackHeader,
  Text,
  TextField,
  toast,
} from '@/ui';

type Editing = { mode: 'add' } | { mode: 'rename'; portfolio: Portfolio } | null;

/** Ayarlar › Portföyler (docs/01-PROJE-DOKUMANI.md §6.8): add, rename, delete, choose. */
export default function PortfoliosScreen() {
  const { colors } = useTheme();
  const portfolios = usePortfolioStore((s) => s.portfolios);
  const activeId = usePortfolioStore((s) => s.view?.portfolio.id);
  const select = usePortfolioStore((s) => s.select);
  const reload = usePortfolioStore((s) => s.reload);
  const [editing, setEditing] = useState<Editing>(null);
  const [deleting, setDeleting] = useState<Portfolio | null>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const open = (e: Editing) => {
    setEditing(e);
    setName(e?.mode === 'rename' ? e.portfolio.name : '');
    setError(null);
  };

  const submit = async () => {
    if (!editing) return;
    const db = await getDatabase();
    const r =
      editing.mode === 'add'
        ? await createPortfolio(db, name)
        : await renameOwnPortfolio(db, editing.portfolio.id, name);
    if (!r.ok) {
      setError(PORTFOLIO_REASON[r.reason]);
      return;
    }
    setEditing(null);
    if (editing.mode === 'add' && r.portfolio) {
      await select(r.portfolio.id);
      toast.show({ message: `${r.portfolio.name} eklendi ve seçildi`, tone: 'success' });
    } else {
      await reload();
      toast.show({ message: 'Ad değiştirildi', tone: 'success' });
    }
  };

  const remove = async () => {
    if (!deleting) return;
    const r = await deleteOwnPortfolio(await getDatabase(), deleting.id);
    setDeleting(null);
    if (!r.ok) {
      toast.show({ message: PORTFOLIO_REASON[r.reason], tone: 'danger' });
      return;
    }
    await reload();
    toast.show({ message: `${deleting.name} silindi` });
  };

  return (
    <Screen header={<StackHeader title="Portföyler" />}>
      <Card padding={0} style={{ paddingHorizontal: space.lg, paddingVertical: space.xs }}>
        {portfolios.map((p, i) => {
          const active = p.id === activeId;
          const demo = p.kind === 'demo';
          return (
            <View
              key={p.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: space.md,
                paddingVertical: space.md,
                borderTopWidth: i === 0 ? 0 : 1,
                borderTopColor: colors.border,
              }}>
              <PressableScale
                onPress={() => select(p.id)}
                haptic="selection"
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`${p.name}${active ? ', seçili' : ', seç'}`}
                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                <IconWell background={demo ? colors.accent2Soft : colors.accentSoft} size={38}>
                  {demo ? (
                    <Sparkles size={18} color={colors.accent2} strokeWidth={2.4} />
                  ) : (
                    <Wallet size={18} color={colors.accent} strokeWidth={2.4} />
                  )}
                </IconWell>
                <View style={{ flex: 1 }}>
                  <Text variant="callout">{p.name}</Text>
                  <Text variant="caption" tone="secondary">
                    {demo ? 'Örnek · kurgusal fiyatlar' : 'Kendi portföyün'}
                  </Text>
                </View>
                {active ? <Check size={18} color={colors.accent} strokeWidth={2.6} /> : null}
              </PressableScale>
              {!demo ? (
                <PressableScale
                  onPress={() => open({ mode: 'rename', portfolio: p })}
                  haptic="selection"
                  accessibilityRole="button"
                  accessibilityLabel={`${p.name} adını değiştir`}
                  style={{ padding: space.xs }}>
                  <Pencil size={18} color={colors.textSecondary} strokeWidth={2.2} />
                </PressableScale>
              ) : null}
              <PressableScale
                onPress={() => setDeleting(p)}
                haptic="selection"
                accessibilityRole="button"
                accessibilityLabel={`${p.name} sil`}
                style={{ padding: space.xs }}>
                <Trash2 size={18} color={colors.down} strokeWidth={2.2} />
              </PressableScale>
            </View>
          );
        })}
      </Card>
      <Button
        label="Yeni portföy"
        icon={FolderPlus}
        variant="secondary"
        fullWidth
        onPress={() => open({ mode: 'add' })}
      />
      <Text variant="caption" tone="tertiary">
        Her portföyün kayıtları, nakdi ve grafikleri ayrıdır. Seçili portföy tüm ekranlarda
        gösterilir; üstteki portföy adına dokunarak da değiştirebilirsin.
      </Text>

      <Sheet
        visible={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.mode === 'add' ? 'Yeni portföy' : 'Adı değiştir'}>
        <View style={{ gap: space.md }}>
          <TextField
            label="Portföy adı"
            value={name}
            onChangeText={(t) => {
              setName(t);
              setError(null);
            }}
            placeholder="ör. Uzun Vade, Emeklilik, Kripto"
            maxLength={40}
            autoFocus
            error={error}
          />
          <Button label={editing?.mode === 'add' ? 'Ekle' : 'Kaydet'} fullWidth onPress={submit} />
        </View>
      </Sheet>

      <Sheet
        visible={!!deleting}
        onClose={() => setDeleting(null)}
        title={`${deleting?.name ?? ''} silinsin mi?`}
        subtitle="Bu portföyün tüm kayıtları ve grafik geçmişi silinir. Geri alınamaz; istersen önce yedek al.">
        <View
          style={{
            gap: space.sm,
            padding: space.md,
            borderRadius: radius.md,
            backgroundColor: colors.downSoft,
          }}>
          <Button label="Evet, sil" variant="danger" fullWidth onPress={remove} />
          <Button label="Vazgeç" variant="secondary" fullWidth onPress={() => setDeleting(null)} />
        </View>
      </Sheet>
    </Screen>
  );
}

import { useRouter } from 'expo-router';
import { Eye, Pencil, ShoppingCart, Star, Trash2, TrendingDown } from 'lucide-react-native';
import { View } from 'react-native';

import type { Holding } from '@/data/view/portfolioView';
import { rejectionText } from '@/i18n/rejections';
import { useMarketStore } from '@/state/market';
import { usePortfolioStore, usePortfolioView } from '@/state/portfolio';
import { useColors } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';
import { IconWell, ListRow, Sheet, toast } from '@/ui';

/** Navigation and delete-with-undo for a holding, shared by swipes and the long-press menu. */
export function useHoldingActions() {
  const router = useRouter();
  const view = usePortfolioView();
  const removeMany = usePortfolioStore((s) => s.removeMany);
  const restoreMany = usePortfolioStore((s) => s.restoreMany);
  return {
    detail: (h: Holding) => router.push(`/varlik/${encodeURIComponent(h.assetId)}`),
    buy: (h: Holding) =>
      router.push({ pathname: '/islem/al-sat', params: { side: 'BUY', assetId: h.assetId } }),
    sell: (h: Holding) =>
      router.push({ pathname: '/islem/al-sat', params: { side: 'SELL', assetId: h.assetId } }),
    /** Deletes every record of the asset as one change; 5 seconds to undo. */
    remove: async (h: Holding) => {
      const ids = view.history.filter((r) => r.assetId === h.assetId && r.source).map((r) => r.id);
      const result = await removeMany(ids);
      if (!result.ok) {
        toast.show({ message: rejectionText(result.rejection, view.history), tone: 'danger' });
        return;
      }
      const removed = result.txns;
      toast.show({
        message: `${h.symbol}: ${removed.length} kayıt silindi`,
        actionLabel: 'GERİ AL',
        onAction: async () => {
          const back = await restoreMany(removed);
          if (!back.ok) toast.show({ message: rejectionText(back.rejection), tone: 'danger' });
        },
      });
    },
  };
}

/** Long-press menu of a holding. */
export function HoldingMenu({
  holding,
  onClose,
}: {
  holding: Holding | null;
  onClose: () => void;
}) {
  const colors = useColors();
  const actions = useHoldingActions();
  const watchlist = useMarketStore((s) => s.watchlist);
  const addWatch = useMarketStore((s) => s.addWatch);
  const view = usePortfolioView();
  if (!holding) return <Sheet visible={false} onClose={onClose} />;
  const watched = watchlist.some((w) => w.instrument.id === holding.assetId);
  const icon = (I: typeof Eye, color: string, bg: string) => (
    <IconWell background={bg}>
      <I size={18} color={color} strokeWidth={2.4} />
    </IconWell>
  );
  const run = (fn: () => void) => () => {
    onClose();
    fn();
  };
  return (
    <Sheet visible onClose={onClose} title={holding.symbol} subtitle={holding.name}>
      <View
        style={{
          backgroundColor: colors.surfaceAlt,
          borderRadius: radius.lg,
          paddingHorizontal: space.lg,
        }}>
        <ListRow
          title="Ayrıntı"
          leading={icon(Eye, colors.accent, colors.accentSoft)}
          showChevron
          onPress={run(() => actions.detail(holding))}
        />
        <ListRow
          title="Al"
          leading={icon(ShoppingCart, colors.up, colors.upSoft)}
          showChevron
          onPress={run(() => actions.buy(holding))}
        />
        <ListRow
          title="Sat"
          leading={icon(TrendingDown, colors.down, colors.downSoft)}
          showChevron
          onPress={run(() => actions.sell(holding))}
        />
        <ListRow
          title="Kayıtları düzenle"
          subtitle="Alış, satış ve temettüler"
          leading={icon(Pencil, colors.accent2, colors.accent2Soft)}
          showChevron
          onPress={run(() => actions.detail(holding))}
        />
        {!view.isDemo && !watched ? (
          <ListRow
            title="İzleme listesine ekle"
            leading={icon(Star, colors.warning, colors.warningSoft)}
            onPress={run(async () => {
              await addWatch(holding.assetId);
              toast.show({ message: 'İzleme listesine eklendi' });
            })}
          />
        ) : null}
        <ListRow
          title="Tüm kayıtlarını sil"
          subtitle="Geri alınabilir"
          leading={icon(Trash2, colors.down, colors.downSoft)}
          onPress={run(() => actions.remove(holding))}
        />
      </View>
    </Sheet>
  );
}

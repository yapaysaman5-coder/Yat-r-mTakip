import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { getDatabase } from '@/data/database';
import { instrumentFor } from '@/data/market/instruments';
import { searchInstruments, type SearchResult } from '@/data/market/search';
import { recentAssetIds } from '@/data/service/trade';
import type { StoredAsset } from '@/data/types';
import type { Market } from '@/domain';
import { useMarketStore } from '@/state/market';
import { usePortfolioView } from '@/state/portfolio';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';
import { AssetAvatar, Chip, PressableScale, Sheet, Text, TextField } from '@/ui';
import { formatQuantity } from '@/utils/format';

type Tab = 'all' | 'BIST' | 'US' | 'CRYPTO';

const MARKET_LABEL: Partial<Record<Market, string>> = {
  BIST: 'BIST',
  US: 'ABD',
  CRYPTO: 'Kripto',
  FX: 'Döviz',
  COMMODITY: 'Emtia',
  INDEX: 'Endeks',
};

const avatarMarket = (m: Market) => (m === 'BIST' ? 'bist' : m === 'CRYPTO' ? 'crypto' : 'us');

/**
 * Varlık seçimi (docs/01-PROJE-DOKUMANI.md §6.4): BIST / ABD / Kripto tabs and recent assets.
 * Selling and dividends only offer what the portfolio holds; the example portfolio only
 * offers its own (fictional) assets.
 */
export function AssetPicker({
  visible,
  onClose,
  onPick,
  heldOnly = false,
}: {
  visible: boolean;
  onClose: () => void;
  onPick: (asset: StoredAsset) => void;
  heldOnly?: boolean;
}) {
  const { colors } = useTheme();
  const view = usePortfolioView();
  const watchlist = useMarketStore((s) => s.watchlist);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<Tab>('all');
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    if (!visible) return;
    let alive = true;
    getDatabase()
      .then((db) => recentAssetIds(db))
      .then((ids) => {
        if (alive) setRecent(ids);
      });
    return () => {
      alive = false;
    };
  }, [visible]);

  const held = view.holdings.map((h): StoredAsset => ({
    id: h.assetId,
    symbol: h.symbol,
    name: h.name,
    market: view.data.assets.get(h.assetId)?.market ?? 'US',
    currency: h.currency,
  }));
  const own = [...view.data.assets.values()].filter((a) => !a.id.includes('USDTRY'));

  let list: (StoredAsset & { note?: string })[];
  if (heldOnly || view.isDemo) {
    const base = heldOnly ? held : own;
    const q = query.trim().toLocaleLowerCase('tr');
    list = base.filter(
      (a) =>
        !q ||
        a.symbol.toLocaleLowerCase('tr').includes(q) ||
        (a.name ?? '').toLocaleLowerCase('tr').includes(q),
    );
  } else if (query.trim()) {
    list = searchInstruments(query, { market: tab === 'all' ? undefined : tab, limit: 25 })
      .filter(
        (r: SearchResult) => r.market === 'BIST' || r.market === 'US' || r.market === 'CRYPTO',
      )
      .map((r) => ({
        id: r.id,
        symbol: r.symbol,
        name: r.name,
        market: r.market,
        currency: r.currency,
        note: r.unverified ? 'katalogda yok, fiyat kaynağı doğrular' : r.detail,
      }));
  } else {
    // Recent first, then the watchlist's tradable items.
    const ids = [
      ...recent,
      ...watchlist.map((w) => w.instrument.id).filter((id) => /^(BIST|US|CRYPTO):/.test(id)),
    ];
    list = [...new Set(ids)].flatMap((id) => {
      const known = view.data.assets.get(id);
      const inst = instrumentFor(id);
      if (!inst) return [];
      const a: StoredAsset = known ?? {
        id,
        symbol: inst.symbol,
        name: inst.name,
        market: inst.market,
        currency: inst.currency,
      };
      return tab === 'all' || a.market === tab
        ? [{ ...a, note: recent.includes(id) ? 'son kullanılan' : 'izleme listesi' }]
        : [];
    });
  }

  const qty = (id: string) => view.holdings.find((h) => h.assetId === id)?.quantity;

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={heldOnly ? 'Elindeki varlıklar' : 'Varlık seç'}
      subtitle={
        view.isDemo
          ? 'Örnek portföyde yalnızca örnek varlıklar kullanılır.'
          : heldOnly
            ? undefined
            : 'Sembol veya şirket adı yaz. Arama internetsiz de çalışır.'
      }>
      <View style={{ gap: space.md }}>
        <TextField
          label="Ara"
          value={query}
          onChangeText={setQuery}
          placeholder={view.isDemo || heldOnly ? 'ör. THYAO' : 'ör. THYAO, Apple, BTC'}
        />
        {!heldOnly && !view.isDemo ? (
          <View style={{ flexDirection: 'row', gap: space.xs }}>
            {(
              [
                ['all', 'Tümü'],
                ['BIST', 'BIST'],
                ['US', 'ABD'],
                ['CRYPTO', 'Kripto'],
              ] as const
            ).map(([key, label]) => (
              <Chip
                key={key}
                label={label}
                size="sm"
                selected={tab === key}
                onPress={() => setTab(key)}
              />
            ))}
          </View>
        ) : null}
        <View
          style={{
            backgroundColor: colors.surfaceAlt,
            borderRadius: radius.lg,
            paddingHorizontal: space.md,
          }}>
          {list.slice(0, 25).map((a, i) => {
            const q = qty(a.id);
            return (
              <PressableScale
                key={a.id}
                onPress={() => {
                  onPick(a);
                  onClose();
                }}
                haptic="selection"
                accessibilityRole="button"
                accessibilityLabel={`${a.symbol} seç`}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: space.md,
                  paddingVertical: space.sm + 2,
                  borderTopWidth: i === 0 ? 0 : 1,
                  borderTopColor: colors.border,
                }}>
                <AssetAvatar symbol={a.symbol} market={avatarMarket(a.market)} size={34} />
                <View style={{ flex: 1 }}>
                  <Text variant="callout" numberOfLines={1}>
                    {a.symbol} · {a.name}
                  </Text>
                  <Text variant="caption" tone="tertiary" numberOfLines={1}>
                    {[
                      MARKET_LABEL[a.market],
                      a.note,
                      q !== undefined ? `elinde ${formatQuantity(q)}` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                </View>
              </PressableScale>
            );
          })}
          {list.length === 0 ? (
            <Text variant="footnote" tone="tertiary" style={{ paddingVertical: space.md }}>
              {heldOnly
                ? 'Bu portföyde elde tutulan varlık yok.'
                : query.trim()
                  ? 'Sonuç yok.'
                  : 'Aramaya başla: BIST, ABD hisseleri ve kripto paralar.'}
            </Text>
          ) : null}
        </View>
      </View>
    </Sheet>
  );
}

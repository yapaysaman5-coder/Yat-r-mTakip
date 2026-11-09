import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { getDatabase } from '@/data/database';
import { lookupCoinsOnline } from '@/data/market';
import { COINGECKO_PIN, instrumentFor, pinSources } from '@/data/market/instruments';
import type { CoinCandidate, LookupResult } from '@/data/market/lookup';
import { searchInstruments, type SearchResult } from '@/data/market/search';
import { listAssets } from '@/data/repo/assets';
import { recentAssetIds } from '@/data/service/trade';
import type { StoredAsset } from '@/data/types';
import type { Market } from '@/domain';
import { useMarketStore } from '@/state/market';
import { usePortfolioView } from '@/state/portfolio';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';
import { AssetAvatar, Chip, PressableScale, Sheet, Text, TextField } from '@/ui';
import { formatPrice, formatQuantity } from '@/utils/format';

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
  initialQuery = '',
  initialTab = 'all',
}: {
  visible: boolean;
  onClose: () => void;
  onPick: (asset: StoredAsset) => void;
  heldOnly?: boolean;
  /** Start with this search (mount the picker when opening it for this to apply). */
  initialQuery?: string;
  initialTab?: Tab;
}) {
  const { colors } = useTheme();
  const view = usePortfolioView();
  const watchlist = useMarketStore((s) => s.watchlist);
  const [query, setQuery] = useState(initialQuery);
  const [tab, setTab] = useState<Tab>(initialTab);
  const [recent, setRecent] = useState<string[]>([]);
  const [stored, setStored] = useState<Map<string, StoredAsset>>(new Map());
  const [online, setOnline] = useState<{
    query: string;
    result: LookupResult | null;
  } | null>(null);

  useEffect(() => {
    if (!visible) return;
    let alive = true;
    getDatabase()
      .then(async (db) => {
        const [ids, assets] = await Promise.all([recentAssetIds(db), listAssets(db)]);
        if (!alive) return;
        setRecent(ids);
        setStored(new Map(assets.map((a) => [a.id, a])));
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [visible]);

  // A coin the catalog does not know: ask Binance and CoinGecko (after typing stops).
  const typed = query.trim();
  const catalogHit =
    typed.length >= 2 &&
    searchInstruments(typed, { market: 'CRYPTO', limit: 25 }).some(
      (r) => !r.unverified && r.symbol === typed.toUpperCase(),
    );
  const wantsLookup =
    visible &&
    !heldOnly &&
    !view.isDemo &&
    (tab === 'all' || tab === 'CRYPTO') &&
    typed.length >= 2 &&
    !catalogHit;
  useEffect(() => {
    if (!wantsLookup) return;
    let alive = true;
    const timer = setTimeout(() => {
      setOnline({ query: typed, result: null });
      lookupCoinsOnline(typed)
        .then((result) => {
          if (alive) setOnline({ query: typed, result });
        })
        .catch(() => {
          if (alive) {
            setOnline({
              query: typed,
              result: { candidates: [], reached: { binance: false, coingecko: false } },
            });
          }
        });
    }, 600);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [wantsLookup, typed]);
  const lookup = wantsLookup && online?.query === typed ? online : null;
  const lookupFailed =
    !!lookup?.result && !lookup.result.reached.binance && !lookup.result.reached.coingecko;

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
      .filter((r) => !(r.unverified && r.market === 'CRYPTO' && wantsLookup && !lookupFailed))
      .map((r) => ({
        id: r.id,
        symbol: r.symbol,
        name: r.name,
        market: r.market,
        currency: r.currency,
        note: r.unverified
          ? r.market === 'CRYPTO'
            ? 'katalogda yok · internet gelince Binance’te aranır'
            : 'katalogda yok, fiyat kaynağı doğrular'
          : r.detail,
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

  const pick = (a: StoredAsset) => {
    // The chosen source applies at once (the form looks up that day's price).
    pinSources([a]);
    onPick(a);
    onClose();
  };

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
                onPress={() => pick(a)}
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
          {list.length === 0 && !lookup ? (
            <Text variant="footnote" tone="tertiary" style={{ paddingVertical: space.md }}>
              {heldOnly
                ? 'Bu portföyde elde tutulan varlık yok.'
                : query.trim()
                  ? 'Sonuç yok.'
                  : 'Aramaya başla: BIST, ABD hisseleri ve kripto paralar.'}
            </Text>
          ) : null}
        </View>
        {lookup ? (
          <OnlineResults
            query={typed}
            result={lookup.result}
            stored={stored}
            onPick={(c) =>
              pick({
                id: c.assetId,
                symbol: c.symbol,
                name: c.name,
                market: 'CRYPTO',
                currency: 'USD',
                providerSymbol: c.source === 'coingecko' ? `${COINGECKO_PIN}${c.ref}` : c.ref,
              })
            }
            onPickWithoutPrice={() =>
              pick({
                id: `CRYPTO:${typed.toUpperCase()}`,
                symbol: typed.toUpperCase(),
                name: typed.toUpperCase(),
                market: 'CRYPTO',
                currency: 'USD',
              })
            }
          />
        ) : null}
      </View>
    </Sheet>
  );
}

const usd = (v: number | null) =>
  v === null ? null : v > 0 && v < 0.000001 ? '< $0,000001' : formatPrice(v, 'USD');

/** Coins found on Binance / CoinGecko for what was typed. */
function OnlineResults({
  query,
  result,
  stored,
  onPick,
  onPickWithoutPrice,
}: {
  query: string;
  result: LookupResult | null;
  stored: Map<string, StoredAsset>;
  onPick: (c: CoinCandidate) => void;
  onPickWithoutPrice: () => void;
}) {
  const { colors } = useTheme();
  const symbol = query.toUpperCase();
  const plainSymbol = /^[A-Z0-9]{1,12}$/.test(symbol);
  const noAnswer = !!result && !result.reached.binance && !result.reached.coingecko;
  return (
    <View style={{ gap: space.sm }}>
      <Text variant="overline" tone="secondary">
        İnternette bulunanlar
      </Text>
      <View
        style={{
          backgroundColor: colors.surfaceAlt,
          borderRadius: radius.lg,
          paddingHorizontal: space.md,
        }}>
        {!result ? (
          <Text variant="footnote" tone="tertiary" style={{ paddingVertical: space.md }}>
            Binance ve CoinGecko’da aranıyor…
          </Text>
        ) : noAnswer ? (
          <Text variant="footnote" tone="tertiary" style={{ paddingVertical: space.md }}>
            Kaynaklara ulaşılamadı (internet yok mu?). Yukarıdaki satırdan yine de ekleyebilirsin.
          </Text>
        ) : (
          <>
            {result.candidates.map((c, i) => {
              const existing = stored.get(c.assetId);
              const sameCoin =
                !!existing &&
                (c.source === 'coingecko'
                  ? existing.providerSymbol === `${COINGECKO_PIN}${c.ref}`
                  : !existing.providerSymbol?.startsWith(COINGECKO_PIN));
              // A coin already stored under this symbol keeps it, unless it never had a source
              // (no Binance pair): then it can be matched to a CoinGecko coin now.
              const unpriced =
                !!existing &&
                !existing.providerSymbol?.startsWith(COINGECKO_PIN) &&
                !result.candidates.some((x) => x.source === 'binance');
              const blocked = !!existing && !sameCoin && !unpriced;
              const detail = [
                c.source === 'binance' ? `Binance · ${c.symbol}/USDT · canlı` : 'CoinGecko',
                c.rank ? `#${c.rank}` : null,
                usd(c.priceUSD),
                sameCoin ? 'kayıtlı' : null,
              ]
                .filter(Boolean)
                .join(' · ');
              return (
                <PressableScale
                  key={`${c.source}:${c.ref}`}
                  onPress={() => onPick(c)}
                  disabled={blocked}
                  haptic="selection"
                  accessibilityRole="button"
                  accessibilityLabel={`${c.symbol}, ${c.name}, ${detail} seç`}
                  accessibilityState={{ disabled: blocked }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: space.md,
                    paddingVertical: space.sm + 2,
                    borderTopWidth: i === 0 ? 0 : 1,
                    borderTopColor: colors.border,
                    opacity: blocked ? 0.45 : 1,
                  }}>
                  <AssetAvatar symbol={c.symbol} market="crypto" size={34} />
                  <View style={{ flex: 1 }}>
                    <Text variant="callout" numberOfLines={1}>
                      {c.symbol} · {c.name}
                    </Text>
                    <Text variant="caption" tone="tertiary" numberOfLines={1}>
                      {blocked ? 'Bu sembolle başka bir coin kayıtlı' : detail}
                    </Text>
                  </View>
                </PressableScale>
              );
            })}
            {result.candidates.length === 0 ? (
              <Text variant="footnote" tone="tertiary" style={{ paddingVertical: space.md }}>
                “{query}” Binance’te ve CoinGecko’da bulunamadı.
              </Text>
            ) : null}
            {result.candidates.length === 0 && plainSymbol && !stored.has(`CRYPTO:${symbol}`) ? (
              <PressableScale
                onPress={onPickWithoutPrice}
                haptic="selection"
                accessibilityRole="button"
                accessibilityLabel={`${symbol} fiyatsız ekle`}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: space.md,
                  paddingVertical: space.sm + 2,
                  borderTopWidth: 1,
                  borderTopColor: colors.border,
                }}>
                <AssetAvatar symbol={symbol} market="crypto" size={34} />
                <View style={{ flex: 1 }}>
                  <Text variant="callout">{symbol} · fiyatsız ekle</Text>
                  <Text variant="caption" tone="tertiary">
                    Fiyatı elle girersin; son işlem fiyatınla değerlenir
                  </Text>
                </View>
              </PressableScale>
            ) : null}
            {result.candidates.some((c) => c.source === 'coingecko') ? (
              <Text
                variant="caption"
                tone="tertiary"
                style={{
                  paddingVertical: space.sm,
                  borderTopWidth: 1,
                  borderTopColor: colors.border,
                }}>
                Aynı sembol birden çok coine ait olabilir: ad, sıra ve fiyattan doğru olanı seç.
                CoinGecko coinleri 15 sn’de bir güncellenir; geçmiş en fazla 1 yıl.
              </Text>
            ) : null}
          </>
        )}
      </View>
    </View>
  );
}

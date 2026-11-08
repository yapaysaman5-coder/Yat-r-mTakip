import { Inbox, Plus, ShoppingCart, Sparkles, TrendingDown } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';
import {
  AssetAvatar,
  Button,
  Card,
  ChangeBadge,
  Chip,
  EmptyState,
  LiveDot,
  Money,
  Screen,
  SectionHeader,
  SegmentedControl,
  Sheet,
  Skeleton,
  StackHeader,
  Text,
  toast,
} from '@/ui';

/** Living style guide: every building block in every state, in the active theme. */
export default function GalleryScreen() {
  const { colors } = useTheme();
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [mode, setMode] = useState<'value' | 'cost'>('value');
  const [chip, setChip] = useState('1A');
  const [sheet, setSheet] = useState(false);

  return (
    <Screen header={<StackHeader title="Tasarım Vitrini" />}>
      <Block title="YAZI">
        <Text variant="hero">₺1.284.562,40</Text>
        <Text variant="title1">Başlık 1</Text>
        <Text variant="title2">Başlık 2</Text>
        <Text variant="title3">Başlık 3</Text>
        <Text variant="body">Gövde metni: yumuşak, okunaklı ve sıcak.</Text>
        <Text variant="footnote" tone="secondary">
          Dipnot · ikincil renk
        </Text>
        <Text variant="overline" tone="tertiary">
          ETİKET · BÜYÜK HARF
        </Text>
        <Text variant="numL">0123456789 · rakamlar eşit genişlikte</Text>
      </Block>

      <Block title="BUTONLAR">
        <Button label="Ana eylem" icon={Plus} fullWidth />
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <Button label="AL" variant="buy" icon={ShoppingCart} style={{ flex: 1 }} fullWidth />
          <Button label="SAT" variant="sell" icon={TrendingDown} style={{ flex: 1 }} fullWidth />
        </View>
        <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
          <Button label="İkincil" variant="secondary" size="sm" />
          <Button label="Metin" variant="ghost" size="sm" />
          <Button label="Sil" variant="danger" size="sm" />
          <Button label="Pasif" size="sm" disabled />
        </View>
      </Block>

      <Block title="SEÇİCİLER">
        <SegmentedControl
          size="lg"
          value={side}
          onChange={setSide}
          options={[
            { key: 'buy', label: 'AL', activeColor: colors.up },
            { key: 'sell', label: 'SAT', activeColor: colors.down },
          ]}
        />
        <SegmentedControl
          value={mode}
          onChange={setMode}
          options={[
            { key: 'value', label: 'VARLIK' },
            { key: 'cost', label: 'MALİYET' },
          ]}
        />
        <View style={{ flexDirection: 'row', gap: space.xs, flexWrap: 'wrap' }}>
          {['1G', '1H', '1A', '3A', '6A', '1Y'].map((r) => (
            <Chip key={r} label={r} size="sm" selected={chip === r} onPress={() => setChip(r)} />
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
          <Chip label="BIST" dotColor={colors.market.bist} selected />
          <Chip label="ABD" dotColor={colors.market.us} />
          <Chip label="Kripto" dotColor={colors.market.crypto} />
        </View>
      </Block>

      <Block title="DEĞİŞİM VE TUTAR">
        <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
          <ChangeBadge value={0.012} />
          <ChangeBadge value={-0.004} />
          <ChangeBadge value={0} />
          <ChangeBadge value={3700} kind="money" size="md" />
          <ChangeBadge value={-1250.5} kind="money" size="md" />
        </View>
        <Money value={214880.4} variant="numL" colorize sign="always" />
        <Money value={-31302.48} variant="numL" colorize />
        <Money value={1284562.4} variant="numL" compact />
        <Money value={241.3} currency="USD" variant="numL" sensitive={false} />
      </Block>

      <Block title="DURUM VE VARLIK">
        <View style={{ flexDirection: 'row', gap: space.xl }}>
          <LiveDot status="live" />
          <LiveDot status="delayed" />
          <LiveDot status="closed" />
        </View>
        <View style={{ flexDirection: 'row', gap: space.md }}>
          <AssetAvatar symbol="THYAO" market="bist" />
          <AssetAvatar symbol="AAPL" market="us" />
          <AssetAvatar symbol="BTC" market="crypto" />
          <AssetAvatar symbol="ETH" market="crypto" />
        </View>
      </Block>

      <Block title="YÜKLENİYOR">
        <View style={{ flexDirection: 'row', gap: space.md, alignItems: 'center' }}>
          <Skeleton width={44} height={44} radius={15} />
          <View style={{ flex: 1, gap: space.sm }}>
            <Skeleton width="60%" />
            <Skeleton width="35%" height={10} />
          </View>
          <Skeleton width={80} height={18} />
        </View>
      </Block>

      <Block title="BİLDİRİM VE ALT SAYFA">
        <Button
          label="Bilgi mesajı"
          variant="secondary"
          fullWidth
          onPress={() => toast.show({ message: 'Fiyatlar güncellendi' })}
        />
        <Button
          label="Başarı mesajı"
          variant="secondary"
          fullWidth
          onPress={() => toast.show({ message: 'Alış kaydedildi', tone: 'success' })}
        />
        <Button
          label="Silme + Geri Al"
          variant="secondary"
          fullWidth
          onPress={() =>
            toast.show({
              message: 'THYAO ve 5 işlemi silindi',
              tone: 'danger',
              actionLabel: 'GERİ AL',
              onAction: () => toast.show({ message: 'Geri alındı', tone: 'success' }),
            })
          }
        />
        <Button
          label="Alt sayfayı aç"
          variant="secondary"
          fullWidth
          onPress={() => setSheet(true)}
        />
      </Block>

      <Card>
        <EmptyState
          icon={Inbox}
          title="Henüz işlem yok"
          message="İlk alışını ekleyerek portföyünü oluşturmaya başla."
          actionLabel="İlk işlemi ekle"
        />
      </Card>

      <Sheet
        visible={sheet}
        onClose={() => setSheet(false)}
        title="Alt sayfa"
        subtitle="Aşağı çekerek, dışarı dokunarak veya geri tuşuyla kapanır.">
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: space.md,
            marginBottom: space.lg,
          }}>
          <Sparkles size={20} color={colors.accent2} />
          <Text variant="body" style={{ flex: 1 }}>
            Yumuşak bir yay animasyonuyla açılır.
          </Text>
        </View>
        <Button label="Tamam" fullWidth onPress={() => setSheet(false)} />
      </Sheet>
    </Screen>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ gap: space.sm }}>
      <SectionHeader title={title} style={{ paddingHorizontal: space.xs }} />
      <Card style={{ gap: space.md }}>{children}</Card>
    </View>
  );
}

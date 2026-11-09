import { Check, Sparkles, WalletCards } from 'lucide-react-native';
import { View } from 'react-native';

import { usePortfolioStore } from '@/state/portfolio';
import { useColors } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';
import { IconWell, ListRow, Sheet, Text } from '@/ui';

/** Portfolio picker opened from the name at the top of the home screen. */
export function PortfolioSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const colors = useColors();
  const portfolios = usePortfolioStore((s) => s.portfolios);
  const activeId = usePortfolioStore((s) => s.view?.portfolio.id);
  const select = usePortfolioStore((s) => s.select);

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Portföyler"
      subtitle="Her portföyün kayıtları ve hesapları ayrıdır.">
      <View
        style={{
          backgroundColor: colors.surfaceAlt,
          borderRadius: radius.lg,
          paddingHorizontal: space.lg,
        }}>
        {portfolios.map((p) => {
          const demo = p.kind === 'demo';
          return (
            <ListRow
              key={p.id}
              title={p.name}
              subtitle={demo ? 'Kurgusal fiyatlarla örnek' : 'Kendi kayıtların'}
              leading={
                <IconWell background={demo ? colors.accent2Soft : colors.accentSoft}>
                  {demo ? (
                    <Sparkles size={18} color={colors.accent2} strokeWidth={2.4} />
                  ) : (
                    <WalletCards size={18} color={colors.accent} strokeWidth={2.4} />
                  )}
                </IconWell>
              }
              trailing={
                p.id === activeId ? (
                  <Check size={20} color={colors.accent} strokeWidth={2.6} />
                ) : undefined
              }
              onPress={() => {
                onClose();
                if (p.id !== activeId) select(p.id);
              }}
            />
          );
        })}
      </View>
      <Text variant="caption" tone="tertiary" style={{ marginTop: space.md }}>
        Yeni portföy ekleme ve düzenleme Ayarlar’a geliyor (Faz 10).
      </Text>
    </Sheet>
  );
}

import { useRouter } from 'expo-router';
import { ArrowDownToLine, Sparkles, WalletCards } from 'lucide-react-native';
import { View } from 'react-native';

import { usePortfolioStore } from '@/state/portfolio';
import { space } from '@/theme/tokens';
import { Button, EmptyState } from '@/ui';

/** Shown on every tab while the active portfolio has no records yet. */
export function EmptyPortfolio({ message }: { message?: string }) {
  const router = useRouter();
  const portfolios = usePortfolioStore((s) => s.portfolios);
  const select = usePortfolioStore((s) => s.select);
  const demo = portfolios.find((p) => p.kind === 'demo');
  return (
    <View style={{ gap: space.md }}>
      <EmptyState
        icon={WalletCards}
        title="Henüz kayıt yok"
        message={
          message ??
          'İlk para girişini ekleyerek başla. Alış ve satış formları bir sonraki aşamada geliyor.'
        }
      />
      <Button
        label="Para Yatır"
        icon={ArrowDownToLine}
        fullWidth
        onPress={() => router.push({ pathname: '/islem/nakit', params: { type: 'DEPOSIT' } })}
      />
      {demo ? (
        <Button
          label="Örnek portföye göz at"
          icon={Sparkles}
          variant="secondary"
          fullWidth
          onPress={() => select(demo.id)}
        />
      ) : null}
    </View>
  );
}

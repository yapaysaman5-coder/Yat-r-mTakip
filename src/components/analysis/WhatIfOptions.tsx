import { Landmark } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import type { AnalysisView } from '@/data/view/analysisView';
import { usePortfolioStore } from '@/state/portfolio';
import { useSettings } from '@/state/settings';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';
import { Button, Chip, SegmentedControl, Sheet, Text, TextField, toast } from '@/ui';
import { formatNumber } from '@/utils/format';

/**
 * "Ya Olsaydı?" settings (docs/01-PROJE-DOKUMANI.md §6.7): TL or USD, what is replayed (money
 * in/out or buys/sells) and the yearly deposit rate for "Mevduat".
 */
export function WhatIfOptions({ analysis }: { analysis: AnalysisView }) {
  const { colors } = useTheme();
  const currency = useSettings((s) => s.whatIfCurrency);
  const setCurrency = useSettings((s) => s.setWhatIfCurrency);
  const basis = useSettings((s) => s.whatIfBasis);
  const setBasis = useSettings((s) => s.setWhatIfBasis);
  const rate = useSettings((s) => s.depositRate);
  const [editing, setEditing] = useState(false);
  const hasDeposit = analysis.series.some((s) => s.key === 'deposit');

  return (
    <View
      style={{
        gap: space.sm,
        padding: space.md,
        borderRadius: radius.lg,
        backgroundColor: colors.surfaceAlt,
      }}>
      <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
        <Text variant="caption" tone="secondary" style={{ width: 92 }}>
          Para birimi
        </Text>
        <SegmentedControl
          size="sm"
          value={currency}
          onChange={(c) => {
            if (c === 'USD' && !analysis.usdAvailable) {
              toast.show({ message: 'Dolar/TL geçmişi henüz yok; internet gelince indirilecek' });
              return;
            }
            setCurrency(c);
          }}
          style={{ flex: 1 }}
          options={[
            { key: 'TRY', label: '₺ TL' },
            { key: 'USD', label: '$ Dolar' },
          ]}
        />
      </View>
      <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
        <Text variant="caption" tone="secondary" style={{ width: 92 }}>
          Karşılaştır
        </Text>
        <SegmentedControl
          size="sm"
          value={basis}
          onChange={setBasis}
          style={{ flex: 1 }}
          options={[
            { key: 'flows', label: 'Para giriş/çıkışı' },
            { key: 'trades', label: 'Alım/satımlar' },
          ]}
        />
      </View>
      {hasDeposit ? (
        <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
          <Text variant="caption" tone="secondary" style={{ width: 92 }}>
            Mevduat faizi
          </Text>
          <Chip
            size="sm"
            icon={Landmark}
            label={`yıllık net %${formatNumber(rate * 100, { maxDecimals: 2 })}`}
            onPress={() => setEditing(true)}
            accessibilityLabel="Mevduat faizini değiştir"
          />
        </View>
      ) : null}
      <Text variant="caption" tone="tertiary">
        {basis === 'flows'
          ? 'Her para girişin ve çıkışın, aynı gün ve tutarla bu seçeneklere yapılmış sayılır.'
          : 'Her alışın ve satışın tutarı, aynı gün bu seçeneklere yatırılmış sayılır; nakit ve temettü hariç.'}
        {currency === 'USD' ? ' Tüm tutarlar o günün Dolar/TL kuruyla dolara çevrilir.' : ''}
      </Text>
      <DepositRateSheet visible={editing} onClose={() => setEditing(false)} />
    </View>
  );
}

function DepositRateSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const rate = useSettings((s) => s.depositRate);
  const setRate = useSettings((s) => s.setDepositRate);
  const reload = usePortfolioStore((s) => s.reload);
  const [text, setText] = useState(formatNumber(rate * 100, { maxDecimals: 2 }));
  const [error, setError] = useState<string | null>(null);
  const save = async () => {
    const v = Number(text.replace(/\./g, '').replace(',', '.'));
    if (!Number.isFinite(v) || v < 0 || v > 500) {
      setError('0 ile 500 arasında bir yüzde yaz (ör. 40 veya 37,5).');
      return;
    }
    setError(null);
    setRate(v / 100);
    onClose();
    await reload();
  };
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Mevduat faizi"
      subtitle="“Mevduat” seçeneği bu yıllık net faizle (stopaj sonrası) günlük bileşik hesaplanır.">
      <View style={{ gap: space.md }}>
        <TextField
          label="Yıllık net faiz (%)"
          value={text}
          onChangeText={setText}
          keyboardType="decimal-pad"
          prefix="%"
          error={error}
          hint="Bankanın ilan ettiği brüt faizden stopajı düşerek yaz."
        />
        <Button label="Kaydet" fullWidth onPress={save} />
      </View>
    </Sheet>
  );
}

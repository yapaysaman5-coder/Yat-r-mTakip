import { useState } from 'react';
import { View } from 'react-native';

import { usePortfolioStore } from '@/state/portfolio';
import { useSettings } from '@/state/settings';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';
import {
  Button,
  Card,
  Screen,
  SectionHeader,
  SegmentedControl,
  StackHeader,
  Text,
  TextField,
  toast,
} from '@/ui';
import { formatNumber } from '@/utils/format';

const show = (n: number, max = 4) => formatNumber(n, { maxDecimals: max });
const parse = (t: string) => Number(t.trim().replace(/\./g, '').replace(',', '.'));

/**
 * Ayarlar › Hesaplama (docs/01-PROJE-DOKUMANI.md §6.8): cost method, suggested commissions,
 * the risk-free rate (Sharpe, Sortino, Alpha) and the deposit rate ("Ya Olsaydı?").
 */
export default function CalculationScreen() {
  const { colors } = useTheme();
  const s = useSettings();
  const reload = usePortfolioStore((st) => st.reload);
  const [bist, setBist] = useState(show(s.fees.bistRate * 1000));
  const [us, setUs] = useState(show(s.fees.usPerOrder, 2));
  const [crypto, setCrypto] = useState(show(s.fees.cryptoRate * 100));
  const [riskFree, setRiskFree] = useState(show(s.riskFree * 100, 2));
  const [deposit, setDeposit] = useState(show(s.depositRate * 100, 2));
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    const v = {
      bist: parse(bist),
      us: parse(us),
      crypto: parse(crypto),
      riskFree: parse(riskFree),
      deposit: parse(deposit),
    };
    const bad = Object.entries(v).find(([, n]) => !Number.isFinite(n) || n < 0 || n > 500);
    if (bad) {
      setError('Her alana 0 ile 500 arasında bir sayı yaz (ondalık için virgül).');
      return;
    }
    setError(null);
    s.setFees({ bistRate: v.bist / 1000, usPerOrder: v.us, cryptoRate: v.crypto / 100 });
    s.setRiskFree(v.riskFree / 100);
    s.setDepositRate(v.deposit / 100);
    await reload();
    toast.show({ message: 'Hesaplama ayarları kaydedildi', tone: 'success' });
  };

  return (
    <Screen header={<StackHeader title="Hesaplama" />}>
      <Card style={{ gap: space.md }}>
        <SectionHeader title="MALİYET YÖNTEMİ" />
        <SegmentedControl
          value={s.costMethod}
          onChange={async (m) => {
            s.setCostMethod(m);
            await reload();
            toast.show({
              message:
                m === 'fifo' ? 'FIFO ile yeniden hesaplandı' : 'Ortalama ile yeniden hesaplandı',
            });
          }}
          options={[
            { key: 'average', label: 'Ağırlıklı ortalama' },
            { key: 'fifo', label: 'FIFO' },
          ]}
        />
        <Text variant="footnote" tone="secondary">
          {s.costMethod === 'average'
            ? 'Satışın maliyeti, eldeki tüm adetlerin ortalama maliyetidir (Türkiye’de aracı kurumların gösterdiği yöntem).'
            : 'Satışta önce en eski alınan adetler satılmış sayılır (ilk giren ilk çıkar).'}{' '}
          Yöntem toplam değeri ve Net K/Z’yi değiştirmez; yalnızca K/Z’nin gerçekleşen ve
          gerçekleşmemiş arasındaki dağılımını değiştirir.
        </Text>
      </Card>

      <Card style={{ gap: space.md }}>
        <SectionHeader title="VARSAYILAN KOMİSYONLAR" />
        <Text variant="footnote" tone="secondary">
          Alış/satış formunda önerilir; her işlemde değiştirebilirsin.
        </Text>
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <TextField
            label="BIST (‰)"
            value={bist}
            onChangeText={setBist}
            keyboardType="decimal-pad"
            style={{ flex: 1 }}
          />
          <TextField
            label="ABD ($/emir)"
            value={us}
            onChangeText={setUs}
            keyboardType="decimal-pad"
            style={{ flex: 1 }}
          />
          <TextField
            label="Kripto (%)"
            value={crypto}
            onChangeText={setCrypto}
            keyboardType="decimal-pad"
            style={{ flex: 1 }}
          />
        </View>
      </Card>

      <Card style={{ gap: space.md }}>
        <SectionHeader title="ORANLAR" />
        <TextField
          label="Risksiz faiz (yıllık %)"
          value={riskFree}
          onChangeText={setRiskFree}
          keyboardType="decimal-pad"
          hint="Sharpe, Sortino ve Alpha bunun üstündeki getiriyi ölçer. Boş bırakma: 0 yaz."
        />
        <TextField
          label="Mevduat faizi (yıllık net %)"
          value={deposit}
          onChangeText={setDeposit}
          keyboardType="decimal-pad"
          hint="“Ya Olsaydı?”daki Mevduat seçeneği."
        />
      </Card>

      {error ? (
        <View
          style={{ padding: space.md, borderRadius: radius.md, backgroundColor: colors.downSoft }}>
          <Text variant="footnote" tone="down">
            {error}
          </Text>
        </View>
      ) : null}
      <Button label="Kaydet" fullWidth onPress={save} />
      <Text variant="caption" tone="tertiary">
        Para girişi gerektiren alışlarda otomatik para girişi her zaman açıktır: geçmiş kayıtların
        tutarlı kalması buna bağlı.
      </Text>
    </Screen>
  );
}

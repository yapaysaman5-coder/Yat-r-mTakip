import { useRouter } from 'expo-router';
import { Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { Footnote, ScienceLink } from '@/components/science/bits';
import {
  DEFAULT_PLAN,
  PLAN_CLASSES,
  PLAN_CLASS_NAME,
  RISK_PROFILES,
  type InvestmentPlan,
  type PlanClass,
  type RiskProfile,
} from '@/data/view/planView';
import { usePortfolioView } from '@/state/portfolio';
import { useSettings } from '@/state/settings';
import { space } from '@/theme/tokens';
import {
  Button,
  Card,
  Chip,
  Screen,
  SectionHeader,
  SegmentedControl,
  StackHeader,
  Text,
  TextField,
  toast,
} from '@/ui';
import { formatNumber, parseNumberInput } from '@/utils/format';

const show = (r: number) => formatNumber(r * 100, { maxDecimals: 1 });

/** Plan editor: target mix, band, single-position limit, risk profile, horizon, review. */
export default function PlanEditScreen() {
  const router = useRouter();
  const view = usePortfolioView();
  const existing = useSettings((s) => s.plans[view.portfolio.id]);
  const setPlan = useSettings((s) => s.setPlan);
  const base = existing ?? DEFAULT_PLAN(view.today);
  const [targets, setTargets] = useState<Record<PlanClass, string>>(
    Object.fromEntries(PLAN_CLASSES.map((k) => [k, show(base.targets[k])])) as Record<
      PlanClass,
      string
    >,
  );
  const [band, setBand] = useState(String(Math.round(base.band * 100)));
  const [maxSingle, setMaxSingle] = useState(String(Math.round(base.maxSingle * 100)));
  const [risk, setRisk] = useState<RiskProfile>(base.risk);
  const [horizon, setHorizon] = useState(String(base.horizonYears));
  const [review, setReview] = useState<'6' | '12'>(base.reviewMonths === 6 ? '6' : '12');
  const [note, setNote] = useState(base.note ?? '');
  const [error, setError] = useState<string | null>(null);

  const values = PLAN_CLASSES.map((k) => parseNumberInput(targets[k] || '0'));
  const sum = values.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);

  const fromToday = () => {
    const total = view.summary.totalValue;
    if (total <= 0) return;
    const w: Record<PlanClass, number> = {
      bist: view.summary.allocation.bist / total,
      us: view.summary.allocation.us / total,
      crypto: view.summary.allocation.crypto / total,
      cash: Math.max(0, view.summary.cash) / total,
    };
    // Whole percentages that still add up to 100.
    const rounded = PLAN_CLASSES.map((k) => Math.round(w[k] * 100));
    const diff = 100 - rounded.reduce((a, b) => a + b, 0);
    const big = rounded.indexOf(Math.max(...rounded));
    rounded[big] += diff;
    setTargets(
      Object.fromEntries(PLAN_CLASSES.map((k, i) => [k, String(rounded[i])])) as Record<
        PlanClass,
        string
      >,
    );
  };

  const save = () => {
    const years = parseNumberInput(horizon);
    if (values.some((v) => !Number.isFinite(v) || v < 0 || v > 100)) {
      setError('Her hedef 0 ile 100 arasında olmalı.');
      return;
    }
    if (Math.abs(sum - 100) > 0.5) {
      setError(`Hedeflerin toplamı 100 olmalı (şu an ${formatNumber(sum, { maxDecimals: 1 })}).`);
      return;
    }
    if (!Number.isFinite(years) || years < 1 || years > 60) {
      setError('Vade 1 ile 60 yıl arasında olmalı.');
      return;
    }
    const plan: InvestmentPlan = {
      targets: Object.fromEntries(PLAN_CLASSES.map((k, i) => [k, values[i] / 100])) as Record<
        PlanClass,
        number
      >,
      band: Number(band) / 100,
      maxSingle: Number(maxSingle) / 100,
      risk,
      horizonYears: Math.round(years),
      reviewMonths: review === '6' ? 6 : 12,
      reviewedOn: existing?.reviewedOn ?? view.today,
      note: note.trim() || undefined,
    };
    setPlan(view.portfolio.id, plan);
    toast.show({ message: existing ? 'Plan güncellendi' : 'Plan kaydedildi', tone: 'success' });
    router.back();
  };

  return (
    <Screen header={<StackHeader title={existing ? 'Planı düzenle' : 'Yeni plan'} />}>
      <Card style={{ gap: space.md }}>
        <View
          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <SectionHeader title="HEDEF DAĞILIM (%)" />
          <Chip label="Bugünkü dağılım" size="sm" onPress={fromToday} />
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {PLAN_CLASSES.map((k) => (
            <TextField
              key={k}
              label={PLAN_CLASS_NAME[k]}
              value={targets[k]}
              onChangeText={(t) => setTargets({ ...targets, [k]: t })}
              keyboardType="decimal-pad"
              style={{ flexBasis: '47%', flexGrow: 1 }}
            />
          ))}
        </View>
        <Text variant="caption" tone={Math.abs(sum - 100) > 0.5 ? 'warning' : 'tertiary'}>
          Toplam %{formatNumber(sum, { maxDecimals: 1 })}
          {Math.abs(sum - 100) > 0.5 ? ' · 100 olmalı' : ''}
        </Text>
      </Card>

      <Card style={{ gap: space.md }}>
        <SectionHeader title="SAPMA BANDI" />
        <SegmentedControl
          value={band}
          onChange={setBand}
          options={[
            { key: '3', label: '±3 puan' },
            { key: '5', label: '±5 puan' },
            { key: '10', label: '±10 puan' },
          ]}
        />
        <Footnote>
          Bir sınıf hedefinden bu kadar saparsa “bant dışı” sayılır. Vanguard’ın araştırması yılda
          bir-iki kontrol ve yaklaşık 5 puanlık bandı makul bulur.
        </Footnote>
        <SectionHeader title="TEK POZİSYON SINIRI" />
        <SegmentedControl
          value={maxSingle}
          onChange={setMaxSingle}
          options={[
            { key: '10', label: '%10' },
            { key: '20', label: '%20' },
            { key: '30', label: '%30' },
            { key: '100', label: 'Yok' },
          ]}
        />
      </Card>

      <Card style={{ gap: space.md }}>
        <SectionHeader title="RİSK PROFİLİ VE VADE" />
        <SegmentedControl
          value={risk}
          onChange={setRisk}
          options={(Object.keys(RISK_PROFILES) as RiskProfile[]).map((k) => ({
            key: k,
            label: RISK_PROFILES[k].name,
          }))}
        />
        <Text variant="footnote" tone="secondary">
          {RISK_PROFILES[risk].text} Hedef planlamada varsayım olarak kullanılır: yılda reel %
          {formatNumber(RISK_PROFILES[risk].realReturn * 100)} getiri, %
          {formatNumber(RISK_PROFILES[risk].volatility * 100)} oynaklık.
        </Text>
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <TextField
            label="Vade (yıl)"
            value={horizon}
            onChangeText={setHorizon}
            keyboardType="number-pad"
            style={{ flex: 1 }}
          />
          <View style={{ flex: 1, gap: space.xs }}>
            <Text variant="caption" tone="secondary">
              Gözden geçirme
            </Text>
            <SegmentedControl
              size="sm"
              value={review}
              onChange={setReview}
              options={[
                { key: '6', label: '6 ay' },
                { key: '12', label: '12 ay' },
              ]}
            />
          </View>
        </View>
        <TextField
          label="Not (neden bu plan?)"
          value={note}
          onChangeText={setNote}
          maxLength={200}
          placeholder="ör. Emeklilik için; düşüşte plana sadık kal"
        />
      </Card>

      {error ? (
        <Text variant="footnote" tone="down">
          {error}
        </Text>
      ) : null}
      <Button label="Kaydet" onPress={save} fullWidth />
      {existing ? (
        <Button
          label="Planı sil"
          icon={Trash2}
          variant="ghost"
          onPress={() => {
            setPlan(view.portfolio.id, null);
            toast.show({ message: 'Plan silindi' });
            router.back();
          }}
          fullWidth
        />
      ) : null}
      <ScienceLink id="yeniden-dengeleme" />
    </Screen>
  );
}

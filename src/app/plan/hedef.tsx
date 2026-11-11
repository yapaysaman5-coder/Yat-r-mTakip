import { useLocalSearchParams, useRouter } from 'expo-router';
import { Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { FanChart } from '@/components/plan/FanChart';
import { CardTitle, Footnote, ScienceLink, Stat, Stats, Verdict } from '@/components/science/bits';
import { GOAL_PATHS, simulateGoal, type Goal } from '@/data/view/goalView';
import { RISK_PROFILES, type RiskProfile } from '@/data/view/planView';
import { usePortfolioView } from '@/state/portfolio';
import { useSettings } from '@/state/settings';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';
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
  Toggle,
} from '@/ui';
import { formatMoney, formatNumber, formatPercent, parseNumberInput } from '@/utils/format';

type Assumption = RiskProfile | 'ozel';

const newGoalId = () => `g${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

const num = (n: number, d = 0) => formatNumber(n, { maxDecimals: d });
const amountText = (n: number) => formatNumber(n, { maxDecimals: 0 });

/**
 * Hedef planlama: a goal in today's lira and its probability under the chosen assumptions
 * (Monte Carlo, docs/02-HESAPLAMA-MOTORU.md §16.6).
 */
export default function GoalScreen() {
  const router = useRouter();
  const view = usePortfolioView();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const goals = useSettings((s) => s.goals[view.portfolio.id]) ?? [];
  const plan = useSettings((s) => s.plans[view.portfolio.id]);
  const setGoals = useSettings((s) => s.setGoals);
  const existing = goals.find((g) => g.id === id);
  const startProfile: Assumption = existing
    ? ((Object.keys(RISK_PROFILES) as RiskProfile[]).find(
        (k) =>
          RISK_PROFILES[k].realReturn === existing.realReturn &&
          RISK_PROFILES[k].volatility === existing.volatility,
      ) ?? 'ozel')
    : (plan?.risk ?? 'dengeli');

  const [name, setName] = useState(existing?.name ?? 'Emeklilik');
  const [target, setTarget] = useState(amountText(existing?.target ?? 5_000_000));
  const [years, setYears] = useState(String(existing?.years ?? plan?.horizonYears ?? 15));
  const [monthly, setMonthly] = useState(amountText(existing?.monthly ?? 10_000));
  const [usePortfolio, setUsePortfolio] = useState(existing?.usePortfolio ?? true);
  const [start, setStart] = useState(amountText(existing?.start ?? 0));
  const [assumption, setAssumption] = useState<Assumption>(startProfile);
  const [customReturn, setCustomReturn] = useState(
    num((existing?.realReturn ?? RISK_PROFILES.dengeli.realReturn) * 100, 1),
  );
  const [customVol, setCustomVol] = useState(
    num((existing?.volatility ?? RISK_PROFILES.dengeli.volatility) * 100, 1),
  );

  const realReturn =
    assumption === 'ozel'
      ? parseNumberInput(customReturn) / 100
      : RISK_PROFILES[assumption].realReturn;
  const volatility =
    assumption === 'ozel'
      ? parseNumberInput(customVol) / 100
      : RISK_PROFILES[assumption].volatility;
  const input = {
    start: usePortfolio ? view.summary.totalValue : parseNumberInput(start),
    monthly: parseNumberInput(monthly),
    years: parseNumberInput(years),
    target: parseNumberInput(target),
    realReturn,
    volatility,
  };
  const invalid =
    !Object.values(input).every(Number.isFinite) ||
    input.start < 0 ||
    input.monthly < 0 ||
    input.target <= 0 ||
    input.years < 1 ||
    input.years > 50 ||
    realReturn < -0.1 ||
    realReturn > 0.2 ||
    volatility < 0 ||
    volatility > 0.6;
  const r = invalid ? null : simulateGoal(input);

  const save = () => {
    if (invalid) return;
    const goal: Goal = {
      id: existing?.id ?? newGoalId(),
      name: name.trim() || 'Hedef',
      target: input.target,
      years: Math.round(input.years),
      monthly: input.monthly,
      realReturn,
      volatility,
      usePortfolio,
      start: usePortfolio ? 0 : input.start,
      createdOn: existing?.createdOn ?? view.today,
    };
    setGoals(
      view.portfolio.id,
      existing ? goals.map((g) => (g.id === goal.id ? goal : g)) : [...goals, goal],
    );
    toast.show({ message: existing ? 'Hedef güncellendi' : 'Hedef kaydedildi', tone: 'success' });
    router.back();
  };

  const p = r?.probability ?? 0;
  return (
    <Screen header={<StackHeader title={existing ? existing.name : 'Yeni hedef'} />}>
      {r ? (
        <Card elevated style={{ gap: space.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: space.md }}>
            <View style={{ flex: 1 }}>
              <Text variant="overline" tone="tertiary">
                HEDEFE ULAŞMA OLASILIĞI
              </Text>
              <Text variant="numXL" tone={p >= 0.8 ? 'up' : p >= 0.5 ? 'primary' : 'down'}>
                {formatPercent(p, { decimals: 0 })}
              </Text>
            </View>
            <Text variant="caption" tone="tertiary" align="right" style={{ paddingBottom: 8 }}>
              {formatNumber(r.paths)} senaryo{'\n'}bugünün lirasıyla
            </Text>
          </View>
          <FanChart fan={r.fan} target={input.target} />
          <View style={{ flexDirection: 'row', gap: space.lg, flexWrap: 'wrap' }}>
            <Legend label="orta senaryo" kind="line" />
            <Legend label="%10–%90 aralığı" kind="band" />
            <Legend label="hedef" kind="dash" />
          </View>
          <Stats>
            <Stat
              label={`${Math.round(input.years)} yıl sonra (orta)`}
              value={formatMoney(r.median, { decimals: 0, compact: true })}
              sub={`kötü %10: ${formatMoney(r.fan.at(-1)!.p10, { decimals: 0, compact: true })} · iyi %10: ${formatMoney(r.fan.at(-1)!.p90, { decimals: 0, compact: true })}`}
            />
            <Stat
              label="Toplam koyduğun"
              value={formatMoney(r.contributed, { decimals: 0, compact: true })}
              sub={`yatırılanın altında bitme olasılığı ${formatPercent(r.lossProbability, { decimals: 0 })}`}
            />
          </Stats>
          <Verdict
            tone={p >= 0.8 ? 'up' : p >= 0.5 ? 'neutral' : 'warning'}
            title={
              p >= 0.8
                ? 'Bu varsayımlarla hedef büyük olasılıkla tutuyor'
                : p >= 0.5
                  ? 'Hedef mümkün ama garantili değil'
                  : 'Bu varsayımlarla hedef zor'
            }
            text={
              r.monthlyFor80 !== null && p < 0.8
                ? `%80 olasılık için aylık yaklaşık ${formatMoney(r.monthlyFor80, { decimals: 0 })} gerekirdi (aynı süre ve varsayımlarla).`
                : p >= 0.8
                  ? 'Varsayımlar değişirse olasılık da değişir; yılda bir yeniden bakmak yeterli.'
                  : undefined
            }
          />
        </Card>
      ) : (
        <Verdict
          tone="warning"
          title="Değerleri kontrol et"
          text="Tutarlar sayı olmalı; süre 1–50 yıl, getiri −%10 ile %20, oynaklık %0–%60 arası."
        />
      )}

      <Card style={{ gap: space.md }}>
        <SectionHeader title="HEDEF" />
        <TextField label="Adı" value={name} onChangeText={setName} maxLength={40} />
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <TextField
            label="Hedef tutar (bugünün ₺)"
            value={target}
            onChangeText={setTarget}
            keyboardType="decimal-pad"
            style={{ flex: 3 }}
          />
          <TextField
            label="Süre (yıl)"
            value={years}
            onChangeText={setYears}
            keyboardType="number-pad"
            style={{ flex: 2 }}
          />
        </View>
        <TextField
          label="Aylık ekleme (bugünün ₺, enflasyonla artar)"
          value={monthly}
          onChangeText={setMonthly}
          keyboardType="decimal-pad"
          prefix="₺"
        />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <View style={{ flex: 1 }}>
            <Text variant="callout">Portföyün bugünkü değeriyle başla</Text>
            <Text variant="caption" tone="secondary">
              {formatMoney(view.summary.totalValue, { decimals: 0 })}
            </Text>
          </View>
          <Toggle
            value={usePortfolio}
            onValueChange={setUsePortfolio}
            accessibilityLabel="Portföyün bugünkü değeriyle başla"
          />
        </View>
        {!usePortfolio ? (
          <TextField
            label="Başlangıç tutarı"
            value={start}
            onChangeText={setStart}
            keyboardType="decimal-pad"
            prefix="₺"
          />
        ) : null}
      </Card>

      <Card style={{ gap: space.md }}>
        <CardTitle title="VARSAYIMLAR" right="enflasyon üstü (reel)" />
        <SegmentedControl
          value={assumption}
          onChange={setAssumption}
          options={[
            ...(Object.keys(RISK_PROFILES) as RiskProfile[]).map((k) => ({
              key: k,
              label: RISK_PROFILES[k].name,
            })),
            { key: 'ozel', label: 'Özel' },
          ]}
        />
        {assumption === 'ozel' ? (
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <TextField
              label="Yıllık reel getiri (%)"
              value={customReturn}
              onChangeText={setCustomReturn}
              keyboardType="decimal-pad"
              style={{ flex: 1 }}
            />
            <TextField
              label="Yıllık oynaklık (%)"
              value={customVol}
              onChangeText={setCustomVol}
              keyboardType="decimal-pad"
              style={{ flex: 1 }}
            />
          </View>
        ) : (
          <Text variant="footnote" tone="secondary">
            {RISK_PROFILES[assumption].text} Yılda reel %
            {num(RISK_PROFILES[assumption].realReturn * 100, 1)} beklenen getiri, %
            {num(RISK_PROFILES[assumption].volatility * 100)} oynaklık.
          </Text>
        )}
        <Footnote>
          Karşılaştırma için: 1900–2024 arasında dünya hisseleri yılda reel %5,2, tahviller %1,7
          getirdi (Dimson, Marsh, Staunton). Aylık getiriler lognormal dağılımdan çekilir;{' '}
          {formatNumber(GOAL_PATHS)} senaryo, sabit tohumla (aynı girdi aynı sonucu verir). Vergi,
          komisyon ve kur farkı dahil değildir. Gelecek geçmişe benzemek zorunda değildir.
        </Footnote>
      </Card>

      <Button
        label={existing ? 'Kaydet' : 'Hedefi kaydet'}
        onPress={save}
        disabled={invalid}
        fullWidth
      />
      {existing ? (
        <Button
          label="Hedefi sil"
          icon={Trash2}
          variant="ghost"
          onPress={() => {
            setGoals(
              view.portfolio.id,
              goals.filter((g) => g.id !== existing.id),
            );
            toast.show({ message: 'Hedef silindi' });
            router.back();
          }}
          fullWidth
        />
      ) : null}
      <ScienceLink id="olasilik" />
    </Screen>
  );
}

function Legend({ label, kind }: { label: string; kind: 'line' | 'band' | 'dash' }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View
        style={{
          width: 16,
          height: kind === 'band' ? 10 : 0,
          borderRadius: 3,
          backgroundColor: kind === 'band' ? colors.accentSoft : undefined,
          borderTopWidth: kind === 'band' ? 0 : 2,
          borderStyle: kind === 'dash' ? 'dashed' : 'solid',
          borderColor: kind === 'dash' ? colors.accent2 : colors.accent,
        }}
      />
      <Text variant="caption" tone="tertiary">
        {label}
      </Text>
    </View>
  );
}

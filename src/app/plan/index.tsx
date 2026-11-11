import { useRouter } from 'expo-router';
import {
  CalendarCheck,
  ChevronRight,
  ClipboardList,
  Pencil,
  Plus,
  Target,
} from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { CardTitle, Footnote, MeterRow, ScienceLink, Verdict } from '@/components/science/bits';
import { simulateGoal, type Goal } from '@/data/view/goalView';
import {
  PLAN_CLASS_NAME,
  planCheck,
  RISK_PROFILES,
  type InvestmentPlan,
  type PlanClass,
} from '@/data/view/planView';
import { usePortfolioView } from '@/state/portfolio';
import { useSettings } from '@/state/settings';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';
import {
  Button,
  Card,
  IconButton,
  PressableScale,
  Screen,
  StackHeader,
  Text,
  TextField,
  toast,
} from '@/ui';
import {
  formatDate,
  formatMoney,
  formatNumber,
  formatPercent,
  parseNumberInput,
} from '@/utils/format';

const pctText = (r: number, d = 0) => formatPercent(r, { decimals: d });
const ptsText = (r: number) =>
  `${formatNumber(r * 100, { maxDecimals: 1, minDecimals: 1, sign: 'always' })} puan`;

/**
 * Yatırım planı (docs/01-PROJE-DOKUMANI.md §6.13): the person's own target mix, how far the
 * portfolio has drifted from it, and their goals. The figures follow the person's own plan;
 * the app suggests no target and no asset.
 */
export default function PlanScreen() {
  const router = useRouter();
  const view = usePortfolioView();
  const plan = useSettings((s) => s.plans[view.portfolio.id]);
  const goals = useSettings((s) => s.goals[view.portfolio.id]) ?? [];
  return (
    <Screen
      header={
        <StackHeader
          title="Yatırım Planı"
          right={
            plan ? (
              <IconButton
                icon={Pencil}
                accessibilityLabel="Planı düzenle"
                onPress={() => router.push('/plan/duzenle')}
              />
            ) : undefined
          }
        />
      }>
      {plan ? <PlanBody plan={plan} /> : <NoPlan />}
      <Goals goals={goals} />
    </Screen>
  );
}

function NoPlan() {
  const { colors } = useTheme();
  const router = useRouter();
  return (
    <Card style={{ gap: space.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <ClipboardList size={20} color={colors.accent} strokeWidth={2.2} />
        <Text variant="title3">Planını bir kez yaz</Text>
      </View>
      <Text variant="footnote" tone="secondary">
        Hedef dağılımını (BIST, ABD, kripto, nakit), ne kadar sapmaya izin verdiğini ve ne sıklıkla
        gözden geçireceğini belirle. Uygulama portföyünün bu plandan ne kadar uzaklaştığını ve yeni
        parayla plana nasıl yaklaşacağını hesaplar. Hedefleri sen belirlersin; uygulama varlık
        önermez.
      </Text>
      <Button
        label="Plan oluştur"
        icon={Plus}
        onPress={() => router.push('/plan/duzenle')}
        fullWidth
      />
      <ScienceLink id="otomatik-plan" />
    </Card>
  );
}

function PlanBody({ plan }: { plan: InvestmentPlan }) {
  const { colors } = useTheme();
  const router = useRouter();
  const view = usePortfolioView();
  const setPlan = useSettings((s) => s.setPlan);
  const [money, setMoney] = useState('');
  const newMoney = parseNumberInput(money);
  const c = planCheck(view, plan, {
    today: view.today,
    newMoney: Number.isFinite(newMoney) && newMoney > 0 ? newMoney : 0,
  });
  const profile = RISK_PROFILES[plan.risk];
  const classColor = (k: PlanClass) =>
    k === 'bist'
      ? colors.market.bist
      : k === 'us'
        ? colors.market.us
        : k === 'crypto'
          ? colors.market.crypto
          : colors.market.cash;
  const score = c.adherence;
  return (
    <>
      <Card elevated style={{ gap: space.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: space.md }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="overline" tone="tertiary">
              PLANA UYUM
            </Text>
            <Text
              variant="numXL"
              tone={score >= 0.95 ? 'up' : score >= 0.85 ? 'primary' : 'warning'}>
              {pctText(score)}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 2, paddingBottom: 6 }}>
            <Text variant="caption" tone="secondary">
              {profile.name} · {plan.horizonYears} yıl
            </Text>
            <Text variant="caption" tone="tertiary">
              bant ±{formatNumber(plan.band * 100)} puan
            </Text>
          </View>
        </View>
        <Verdict
          tone={c.outside.length ? 'warning' : 'up'}
          title={
            c.outside.length
              ? `${c.outside.map((r) => PLAN_CLASS_NAME[r.key]).join(', ')} bant dışında`
              : 'Tüm varlık sınıfları bant içinde'
          }
          text={
            c.outside.length
              ? `Plana dönmek için yaklaşık ${formatMoney(c.tradeVolume, { decimals: 0 })} yer değiştirmesi gerekir. Yeni parayı eksik sınıflara yönlendirmek, satış yapmadan yaklaştırır.`
              : 'Portföyün yazdığın plana uygun. Bir sonraki kontrol takvimdeki tarihte.'
          }
        />
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: space.sm,
            padding: space.md,
            borderRadius: radius.md,
            backgroundColor: c.reviewDue ? colors.warningSoft : colors.surfaceAlt,
          }}>
          <CalendarCheck
            size={18}
            color={c.reviewDue ? colors.warning : colors.textSecondary}
            strokeWidth={2.2}
          />
          <View style={{ flex: 1 }}>
            <Text variant="subhead">
              {c.reviewDue ? 'Gözden geçirme zamanı' : 'Sonraki gözden geçirme'}
            </Text>
            <Text variant="caption" tone="secondary">
              {formatDate(`${c.nextReview}T12:00:00Z`)} · {plan.reviewMonths} ayda bir
            </Text>
          </View>
          {c.reviewDue ? (
            <Button
              label="Yaptım"
              size="sm"
              variant="secondary"
              onPress={() => {
                setPlan(view.portfolio.id, { ...plan, reviewedOn: view.today });
                toast.show({ message: 'Gözden geçirme kaydedildi', tone: 'success' });
              }}
            />
          ) : null}
        </View>
      </Card>

      <Card style={{ gap: space.lg }}>
        <CardTitle title="HEDEF VE GERÇEK" right="çizgi = hedef" />
        {c.rows.map((r) => (
          <View key={r.key} style={{ gap: 6 }}>
            <MeterRow
              label={PLAN_CLASS_NAME[r.key]}
              value={`${pctText(r.weight)} / ${pctText(r.target)}`}
              ratio={r.weight}
              marker={r.target}
              color={r.outside ? colors.warning : classColor(r.key)}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text variant="caption" tone={r.outside ? 'warning' : 'tertiary'}>
                sapma {ptsText(r.drift)}
                {r.outside ? ' · bant dışı' : ''}
              </Text>
              <Text variant="caption" tone="tertiary">
                plana göre fark {formatMoney(r.toTarget, { decimals: 0, sign: 'always' })}
              </Text>
            </View>
          </View>
        ))}
        <Footnote>
          “Plana göre fark”, satış dahil hedef ağırlığa dönmek için gereken tutardır. Hangi varlıkla
          yapılacağı senin kararın; uygulama varlık önermez.
        </Footnote>
      </Card>

      <Card style={{ gap: space.md }}>
        <CardTitle title="YENİ PARAYLA DENGELE" />
        <TextField
          label="Ekleyeceğin tutar"
          value={money}
          onChangeText={setMoney}
          keyboardType="decimal-pad"
          prefix="₺"
          placeholder="ör. 10.000"
        />
        {c.newMoney > 0 ? (
          <>
            {c.rows
              .filter((r) => r.fromNewMoney > 0.5)
              .map((r) => (
                <View key={r.key} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: classColor(r.key),
                      }}
                    />
                    <Text variant="callout">{PLAN_CLASS_NAME[r.key]}</Text>
                  </View>
                  <Text variant="numM">{formatMoney(r.fromNewMoney, { decimals: 0 })}</Text>
                </View>
              ))}
            <Text variant="caption" tone="tertiary">
              Sonrasında en büyük sapma{' '}
              {formatNumber(c.driftAfterNewMoney * 100, { maxDecimals: 1 })} puan olur.
            </Text>
          </>
        ) : (
          <Footnote>
            Yeni parayı hedefin en çok gerisindeki sınıflara paylaştırır; satış yapmadan, maliyet ve
            vergi doğurmadan plana yaklaşmanın yoludur.
          </Footnote>
        )}
      </Card>

      {c.oversized.length ? (
        <Card style={{ gap: space.md }}>
          <CardTitle title="TEK POZİSYON SINIRI" right={`en fazla ${pctText(plan.maxSingle)}`} />
          {c.oversized.map((o) => (
            <PressableScale
              key={o.assetId}
              onPress={() => router.push(`/varlik/${encodeURIComponent(o.assetId)}`)}
              haptic="selection"
              scaleTo={0.985}
              accessibilityRole="button"
              style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text variant="callout">{o.symbol}</Text>
              <Text variant="numM" tone="warning">
                {pctText(o.weight, 1)}
              </Text>
            </PressableScale>
          ))}
          <Footnote>Bu pozisyonlar planında yazdığın tek pozisyon sınırını aşıyor.</Footnote>
        </Card>
      ) : null}

      <Card variant="alt" style={{ gap: space.sm }}>
        <Text variant="subhead">Risk profili: {profile.name}</Text>
        <Text variant="footnote" tone="secondary">
          {profile.text}
        </Text>
        {plan.note ? (
          <Text variant="footnote" style={{ fontStyle: 'italic' }}>
            “{plan.note}”
          </Text>
        ) : null}
        <ScienceLink id="yeniden-dengeleme" />
      </Card>
    </>
  );
}

function Goals({ goals }: { goals: Goal[] }) {
  const { colors } = useTheme();
  const router = useRouter();
  const view = usePortfolioView();
  return (
    <Card style={{ gap: space.md }}>
      <CardTitle title="HEDEFLER" right="bugünün lirasıyla" />
      {goals.length === 0 ? (
        <Text variant="footnote" tone="secondary">
          Ev, emeklilik, eğitim… Bir tutar ve süre gir; uygulama binlerce olası piyasa senaryosuyla
          hedefe ulaşma olasılığını hesaplasın.
        </Text>
      ) : null}
      {goals.map((g, i) => {
        const r = simulateGoal({
          start: g.usePortfolio ? view.summary.totalValue : g.start,
          monthly: g.monthly,
          years: g.years,
          target: g.target,
          realReturn: g.realReturn,
          volatility: g.volatility,
          paths: 1500,
        });
        const p = r.probability;
        return (
          <PressableScale
            key={g.id}
            onPress={() => router.push(`/plan/hedef?id=${g.id}`)}
            haptic="selection"
            scaleTo={0.985}
            accessibilityRole="button"
            accessibilityLabel={`${g.name}: olasılık ${pctText(p)}`}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: space.md,
              paddingTop: i ? space.md : 0,
              borderTopWidth: i ? 1 : 0,
              borderTopColor: colors.border,
            }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.accentSoft,
              }}>
              <Target size={20} color={colors.accent} strokeWidth={2.2} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="callout">{g.name}</Text>
              <Text variant="caption" tone="secondary">
                {formatMoney(g.target, { decimals: 0 })} · {g.years} yıl ·{' '}
                {formatMoney(g.monthly, { decimals: 0 })}/ay
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text variant="numM" tone={p >= 0.8 ? 'up' : p >= 0.5 ? 'primary' : 'down'}>
                {pctText(p)}
              </Text>
              <Text variant="caption" tone="tertiary">
                olasılık
              </Text>
            </View>
            <ChevronRight size={16} color={colors.textTertiary} strokeWidth={2.2} />
          </PressableScale>
        );
      })}
      <Button
        label="Hedef ekle"
        icon={Plus}
        variant="secondary"
        onPress={() => router.push('/plan/hedef')}
        fullWidth
      />
      <ScienceLink id="olasilik" />
    </Card>
  );
}

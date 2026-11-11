import { useRouter } from 'expo-router';
import { ChevronRight, ClipboardList } from 'lucide-react-native';
import { View } from 'react-native';

import { simulateGoal } from '@/data/view/goalView';
import { PLAN_CLASS_NAME, planCheck } from '@/data/view/planView';
import { usePortfolioView } from '@/state/portfolio';
import { useSettings } from '@/state/settings';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';
import { Card, IconWell, PressableScale, SectionHeader, Text } from '@/ui';
import { formatPercent } from '@/utils/format';

/** Fon screen: the plan in one line (adherence, drift, goals) and the way to the Plan screen. */
export function PlanSummary() {
  const { colors } = useTheme();
  const router = useRouter();
  const view = usePortfolioView();
  const plan = useSettings((s) => s.plans[view.portfolio.id]);
  const goals = useSettings((s) => s.goals[view.portfolio.id]) ?? [];
  const check = plan ? planCheck(view, plan, { today: view.today }) : null;
  const first = goals[0];
  const goal = first
    ? simulateGoal({
        start: first.usePortfolio ? view.summary.totalValue : first.start,
        monthly: first.monthly,
        years: first.years,
        target: first.target,
        realReturn: first.realReturn,
        volatility: first.volatility,
        paths: 1500,
      })
    : null;
  return (
    <PressableScale
      onPress={() => router.push('/plan')}
      haptic="selection"
      scaleTo={0.985}
      accessibilityRole="button"
      accessibilityLabel="Yatırım planı ve hedefler">
      <Card style={{ gap: space.md }}>
        <View
          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <SectionHeader title="YATIRIM PLANI" />
          <ChevronRight size={16} color={colors.textTertiary} strokeWidth={2.2} />
        </View>
        {check ? (
          <View style={{ flexDirection: 'row', gap: space.lg }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="caption" tone="secondary">
                Plana uyum
              </Text>
              <Text
                variant="numL"
                tone={
                  check.adherence >= 0.95 ? 'up' : check.adherence >= 0.85 ? 'primary' : 'warning'
                }>
                {formatPercent(check.adherence, { decimals: 0 })}
              </Text>
              <Text
                variant="caption"
                tone={check.outside.length ? 'warning' : 'tertiary'}
                numberOfLines={1}>
                {check.outside.length
                  ? check.outside.length > 2
                    ? `${check.outside.length} sınıf bant dışı`
                    : `${check.outside.map((r) => PLAN_CLASS_NAME[r.key]).join(', ')} bant dışı`
                  : check.reviewDue
                    ? 'gözden geçirme zamanı'
                    : 'bant içinde'}
              </Text>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="caption" tone="secondary" numberOfLines={1}>
                {first ? first.name : 'Hedef'}
              </Text>
              <Text
                variant="numL"
                tone={
                  goal
                    ? goal.probability >= 0.8
                      ? 'up'
                      : goal.probability >= 0.5
                        ? 'primary'
                        : 'down'
                    : 'tertiary'
                }>
                {goal ? formatPercent(goal.probability, { decimals: 0 }) : '—'}
              </Text>
              <Text variant="caption" tone="tertiary" numberOfLines={1}>
                {goal ? `olasılık · ${goals.length} hedef` : 'hedef ekle'}
              </Text>
            </View>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <IconWell background={colors.accentSoft}>
              <ClipboardList size={20} color={colors.accent} strokeWidth={2.2} />
            </IconWell>
            <Text variant="footnote" tone="secondary" style={{ flex: 1 }}>
              Hedef dağılımını ve hedeflerini yaz: sapmaları, yeni parayla dengelemeyi ve hedefe
              ulaşma olasılığını gör.
            </Text>
          </View>
        )}
      </Card>
    </PressableScale>
  );
}

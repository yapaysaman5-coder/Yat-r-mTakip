import { BarChart3, PieChart, Sparkles } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { MetricInfoSheet, MetricTile } from '@/components/MetricTile';
import type { MetricKey } from '@/components/metricInfo';
import { EmptyPortfolio } from '@/components/EmptyPortfolio';
import { PreviewNote } from '@/components/PreviewNote';
import {
  ANALYSIS_PERIODS,
  periodReturn,
  type AnalysisPeriod,
  type MonthReturn,
} from '@/data/view/analysisView';
import { useMarketStore } from '@/state/market';
import { useAnalysis, usePortfolioView } from '@/state/portfolio';
import { seriesColor } from '@/theme/chartColors';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';
import {
  Card,
  ChangeBadge,
  Chip,
  EmptyState,
  Money,
  Screen,
  SectionHeader,
  SegmentedControl,
  TabHeader,
  Text,
  toast,
} from '@/ui';
import { ComparisonChart } from '@/ui/charts/ComparisonChart';
import { rebasePercent } from '@/ui/charts/scale';
import {
  formatCompact,
  formatDate,
  formatMoney,
  formatNumber,
  formatPercent,
  MONTHS_TR,
} from '@/utils/format';

type Section = 'whatif' | 'performance' | 'allocation';
type Mode = 'value' | 'percent';

const BENCHMARK_NAME = 'BIST 100';
const RANGES: AnalysisPeriod[] = ANALYSIS_PERIODS;
const MAX_SERIES = 6;
const MEDALS = ['🥇', '🥈', '🥉'];
const CONTEXT = `Ölçüt: ${BENCHMARK_NAME} · Risksiz faiz: %0 (Ayarlar › Hesaplama’dan girilecek)`;

const pct = (r: number | null, decimals = 1) =>
  r === null ? '—' : formatPercent(r, { decimals, sign: 'always' });
/** Values that round to zero on screen get no colour. */
const tone = (r: number | null) =>
  r === null || Math.abs(r) < 0.00005 ? 'primary' : r > 0 ? 'up' : 'down';
const dec2 = (n: number | null) =>
  n === null ? '—' : formatNumber(n, { minDecimals: 2, maxDecimals: 2 });

export default function AnalysisScreen() {
  const [section, setSection] = useState<Section>('whatif');
  const [info, setInfo] = useState<{ key: MetricKey; value: string } | null>(null);
  const open = (key: MetricKey, value: string) => setInfo({ key, value });
  const view = usePortfolioView();

  if (view.empty) {
    return (
      <Screen withTabBar header={<TabHeader title="Analiz" />}>
        <EmptyPortfolio message="Performans ve “Ya Olsaydı?” hesapları ilk kayıtlarınla başlar." />
      </Screen>
    );
  }

  return (
    <Screen withTabBar header={<TabHeader title="Analiz" />}>
      {view.isDemo ? <PreviewNote /> : null}
      <Scorecard onInfo={open} />
      <SegmentedControl
        value={section}
        onChange={setSection}
        options={[
          { key: 'whatif', label: 'Ya Olsaydı?' },
          { key: 'performance', label: 'Performans' },
          { key: 'allocation', label: 'Dağılım' },
        ]}
      />
      {section === 'whatif' ? <WhatIf /> : null}
      {section === 'performance' ? <Performance onInfo={open} /> : null}
      {section === 'allocation' ? (
        <EmptyState
          icon={PieChart}
          title="Dağılım"
          message="Piyasa, para birimi ve sektör dağılımı ile portföy ısı haritası burada olacak. (Faz 9)"
        />
      ) : null}
      <MetricInfoSheet
        metric={info?.key ?? null}
        value={info?.value}
        context={
          info && ['alpha', 'beta', 'sharpe', 'sortino', 'excess'].includes(info.key)
            ? CONTEXT
            : undefined
        }
        onClose={() => setInfo(null)}
      />
    </Screen>
  );
}

/* ───────────────────────── Scorecard ───────────────────────── */

function Scorecard({ onInfo }: { onInfo: (k: MetricKey, v: string) => void }) {
  const { summary, series } = usePortfolioView();
  const m = useAnalysis().metrics;
  const today = pct(summary.dailyChangeRatio, 2);
  return (
    <Card>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: space.md,
        }}>
        <SectionHeader title="PERFORMANS KARNESİ" />
        <Text variant="caption" tone="tertiary">
          {series.dates.length ? `${formatDate(`${series.dates[0]}T12:00:00Z`)}’ten beri` : ''}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        <MetricTile
          label="Bugün"
          value={today}
          tone={tone(summary.dailyChangeRatio)}
          sub={formatMoney(summary.dailyChange, { sign: 'always', decimals: 0 })}
          onPress={() => onInfo('today', today)}
        />
        <MetricTile
          label="TWR"
          value={pct(m?.twr ?? null)}
          tone={tone(m?.twr ?? null)}
          sub={m ? `yıllık ${pct(m.twrAnnual)}` : 'en az 2 gün gerekir'}
          onPress={() => onInfo('twr', pct(m?.twr ?? null))}
        />
        <MetricTile
          label="XIRR (yıllık)"
          value={pct(m?.xirr ?? null)}
          tone={tone(m?.xirr ?? null)}
          sub="nakit akışına göre"
          onPress={() => onInfo('xirr', pct(m?.xirr ?? null))}
        />
        <MetricTile
          label="Alpha (yıllık)"
          value={pct(m?.alpha ?? null)}
          tone={tone(m?.alpha ?? null)}
          sub={
            m?.beta != null
              ? `${BENCHMARK_NAME}’e göre · β ${dec2(m.beta)}`
              : 'ölçüt fiyatı bekleniyor'
          }
          onPress={() => onInfo('alpha', pct(m?.alpha ?? null))}
        />
      </View>
    </Card>
  );
}

/* ───────────────────────── Ya Olsaydı? ───────────────────────── */

function WhatIf() {
  const analysis = useAnalysis();
  const syncing = useMarketStore((s) => s.syncing);
  const online = useMarketStore((s) => s.online);
  if (analysis.series.length < 2) {
    return (
      <EmptyState
        icon={BarChart3}
        title={syncing ? 'Ölçüt fiyatları indiriliyor…' : 'Ölçüt fiyatları henüz yok'}
        message={
          online === false
            ? 'İnternet bağlantısı gelince altın, BIST 100, S&P 500, Dolar/TL ve diğerlerinin geçmiş fiyatları indirilecek.'
            : 'Altın, BIST 100, S&P 500, Dolar/TL ve diğerlerinin ilk kaydından bugüne günlük fiyatları indiriliyor. Birazdan burada.'
        }
      />
    );
  }
  return <WhatIfBody />;
}

function WhatIfBody() {
  const { colors, dark } = useTheme();
  const analysis = useAnalysis();
  const BENCHMARKS = analysis.series;
  const VALUES = Object.fromEntries(BENCHMARKS.map((b) => [b.key, b.values]));
  const NET_INVESTED = analysis.netInvested;
  const [range, setRange] = useState<AnalysisPeriod>('Tümü');
  const [mode, setMode] = useState<Mode>('value');
  const [visible, setVisible] = useState<string[]>(
    ['me', 'xu100', 'gold', 'spx', 'usd'].filter((k) => k in VALUES),
  );

  const start = analysis.periodStart[range];
  const dates = analysis.dates.slice(start);
  const toggle = (key: string) => {
    if (key === 'me') return;
    if (visible.includes(key)) setVisible(visible.filter((k) => k !== key));
    else if (visible.length >= MAX_SERIES)
      toast.show({ message: `Aynı anda en fazla ${MAX_SERIES} seri` });
    else setVisible([...visible, key]);
  };

  const series = BENCHMARKS.filter((b) => visible.includes(b.key)).map((b) => ({
    key: b.key,
    name: b.name,
    color: seriesColor(b.key, dark, colors.accent),
    emphasis: b.key === 'me',
    values:
      mode === 'value'
        ? VALUES[b.key].slice(start)
        : rebasePercent(VALUES[b.key], NET_INVESTED, start),
  }));

  const last = analysis.dates.length - 1;
  const me = VALUES.me[last];
  const ranked = [...BENCHMARKS].sort((a, b) => VALUES[b.key][last] - VALUES[a.key][last]);
  const netInvested = NET_INVESTED[last];
  const beaten = BENCHMARKS.filter((b) => b.key !== 'me' && VALUES[b.key][last] < me).length;
  const best = ranked.find((b) => b.key !== 'me')!;
  const realReturn = VALUES.cpi ? me / VALUES.cpi[last] - 1 : null;

  return (
    <View style={{ gap: space.lg }}>
      <Card padding={0} style={{ paddingVertical: space.lg }}>
        <View style={{ paddingHorizontal: space.lg, gap: space.xs }}>
          <Text variant="title3">Aynı parayı başka yere yatırsaydın?</Text>
          <Text variant="footnote" tone="secondary">
            Her para girişin ve çıkışın, aynı gün ve aynı tutarla bu seçeneklere yapılmış gibi
            hesaplanır.
          </Text>
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: space.lg,
            marginTop: space.lg,
            gap: space.sm,
          }}>
          <View style={{ flexDirection: 'row', gap: 2, flexShrink: 1, flexWrap: 'wrap' }}>
            {RANGES.map((r) => (
              <Chip
                key={r}
                label={r}
                size="sm"
                selected={r === range}
                onPress={() => setRange(r)}
              />
            ))}
          </View>
        </View>
        <SegmentedControl
          size="sm"
          value={mode}
          onChange={setMode}
          style={{ marginHorizontal: space.lg, marginTop: space.md }}
          options={[
            { key: 'value', label: '₺ Değer' },
            { key: 'percent', label: '% Getiri' },
          ]}
        />

        <View style={{ paddingLeft: space.lg, paddingRight: space.sm, marginTop: space.lg }}>
          <ComparisonChart
            dates={dates}
            series={series}
            reference={
              mode === 'value'
                ? { values: NET_INVESTED.slice(start), label: 'Net yatırılan' }
                : undefined
            }
            zeroLine={mode === 'percent'}
            formatAxis={(v) =>
              mode === 'value' ? formatCompact(v) : formatPercent(v, { decimals: 0 })
            }
            formatValue={(v) =>
              mode === 'value'
                ? formatMoney(v, { decimals: 0 })
                : formatPercent(v, { decimals: 1, sign: 'always' })
            }
            height={250}
          />
        </View>

        <View style={{ paddingHorizontal: space.lg, marginTop: space.sm, gap: space.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
            {mode === 'value' ? (
              <>
                <View
                  style={{
                    width: 16,
                    height: 0,
                    borderTopWidth: 1.5,
                    borderStyle: 'dashed',
                    borderColor: colors.textTertiary,
                  }}
                />
                <Text variant="caption" tone="tertiary">
                  Net yatırılan para
                </Text>
                <Text variant="caption" tone="tertiary">
                  ·
                </Text>
              </>
            ) : null}
            <Text variant="caption" tone="tertiary" style={{ flex: 1 }}>
              Değerleri görmek için grafiğe dokunup kaydır
            </Text>
          </View>
          <Text variant="overline" tone="tertiary">
            GRAFİKTE GÖSTER
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.xs + 2 }}>
            {BENCHMARKS.map((b) => (
              <Chip
                key={b.key}
                label={b.name}
                size="sm"
                dotColor={seriesColor(b.key, dark, colors.accent)}
                selected={visible.includes(b.key)}
                onPress={() => toggle(b.key)}
              />
            ))}
          </View>
        </View>
      </Card>

      <Card padding={0} style={{ paddingVertical: space.sm }}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            paddingHorizontal: space.lg,
            paddingTop: space.sm,
            paddingBottom: space.xs,
          }}>
          <SectionHeader title="LİG TABLOSU" />
          <Text variant="overline" tone="tertiary">
            BUGÜNKÜ DEĞER
          </Text>
        </View>
        {ranked.map((b, i) => {
          const value = VALUES[b.key][last];
          const isMe = b.key === 'me';
          return (
            <View
              key={b.key}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: space.md,
                paddingVertical: space.md - 2,
                paddingRight: space.lg,
                paddingLeft: isMe ? space.sm : space.lg,
                marginHorizontal: isMe ? space.sm : 0,
                borderRadius: isMe ? radius.md : 0,
                backgroundColor: isMe ? colors.accentSoft : 'transparent',
              }}>
              <View style={{ width: 24, alignItems: 'center' }}>
                {i < 3 ? (
                  <Text style={{ fontSize: 17, lineHeight: 22 }}>{MEDALS[i]}</Text>
                ) : (
                  <Text variant="numS" tone="tertiary">
                    {i + 1}
                  </Text>
                )}
              </View>
              <View
                style={{
                  width: 4,
                  height: 26,
                  borderRadius: 2,
                  backgroundColor: seriesColor(b.key, dark, colors.accent),
                }}
              />
              <View style={{ flex: 1 }}>
                <Text variant={isMe ? 'bodyStrong' : 'callout'} tone={isMe ? 'accent' : 'primary'}>
                  {b.name}
                </Text>
                <Text variant="caption" tone="secondary">
                  {pct(netInvested > 0 ? (value - netInvested) / netInvested : null)} getiri
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 3 }}>
                <Money value={value} variant="numM" decimals={0} />
                {isMe ? (
                  <Text variant="caption" tone="accent">
                    SEN
                  </Text>
                ) : (
                  <ChangeBadge value={value - me} kind="money" variant="plain" decimals={0} />
                )}
              </View>
            </View>
          );
        })}
      </Card>

      <Card variant="alt">
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: space.sm,
            marginBottom: space.md,
          }}>
          <Sparkles size={18} color={colors.accent2} strokeWidth={2.4} />
          <Text variant="title3">Özet</Text>
        </View>
        <View style={{ gap: space.sm }}>
          <Insight
            text={`Portföyün ${BENCHMARKS.length - 1} seçenekten ${beaten} tanesini geride bıraktı.`}
          />
          <Insight
            text={
              VALUES[best.key][last] > me
                ? `En iyi seçenek ${best.name} olurdu: bugün ${formatMoney(VALUES[best.key][last] - me, { decimals: 0 })} daha fazla.`
                : `Tüm seçeneklerden iyi gittin: en yakın ${best.name}, ${formatMoney(me - VALUES[best.key][last], { decimals: 0 })} geride.`
            }
          />
          {realReturn !== null ? (
            <Insight
              text={`Enflasyona (TÜFE) göre reel getirin ${pct(realReturn)}${realReturn < 0 ? ': paranın alım gücü biraz azaldı.' : '.'}`}
            />
          ) : null}
        </View>
      </Card>
    </View>
  );
}

function Insight({ text }: { text: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' }}>
      <View
        style={{
          width: 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: colors.accent2,
          marginTop: 7,
        }}
      />
      <Text variant="footnote" style={{ flex: 1 }}>
        {text}
      </Text>
    </View>
  );
}

/* ───────────────────────── Performans ───────────────────────── */

const points = (r: number | null, unit: string) =>
  r === null
    ? '—'
    : `${formatNumber(r * 100, { minDecimals: 1, maxDecimals: 1, sign: 'always' })}${unit}`;

function monthLabel(yyyymm: string) {
  const [y, m] = yyyymm.split('-').map(Number);
  return `${MONTHS_TR[m - 1]} ${y}`;
}

function Performance({ onInfo }: { onInfo: (k: MetricKey, v: string) => void }) {
  const { colors } = useTheme();
  const analysis = useAnalysis();
  const m = analysis.metrics;
  const me = analysis.series[0];
  const main = analysis.mainBenchmark;
  if (!m) {
    return (
      <EmptyState
        icon={BarChart3}
        title="Biraz daha geçmiş gerekiyor"
        message="Risk ve getiri ölçüleri en az iki günlük değer geçmişiyle hesaplanır."
      />
    );
  }

  return (
    <View style={{ gap: space.lg }}>
      <Card>
        <SectionHeader title="RİSK VE GETİRİ" style={{ marginBottom: space.md }} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          <MetricTile
            label="Beta"
            value={dec2(m.beta)}
            sub={main ? `${BENCHMARK_NAME}’e göre` : 'ölçüt fiyatı yok'}
            onPress={() => onInfo('beta', dec2(m.beta))}
          />
          <MetricTile
            label="Volatilite (yıllık)"
            value={formatPercent(m.volatility, { decimals: 1 })}
            sub={`Risk seviyesi ${m.riskLevel} / 7`}
            onPress={() => onInfo('volatility', formatPercent(m.volatility, { decimals: 1 }))}
          />
          <MetricTile
            label="Sharpe"
            value={dec2(m.sharpe)}
            sub="risk başına getiri"
            onPress={() => onInfo('sharpe', dec2(m.sharpe))}
          />
          <MetricTile
            label="Sortino"
            value={dec2(m.sortino)}
            sub="düşüş riskine göre"
            onPress={() => onInfo('sortino', dec2(m.sortino))}
          />
          <MetricTile
            label="Maks. düşüş"
            value={formatPercent(-m.maxDrawdown, { decimals: 1 })}
            tone="down"
            sub="zirveden en büyük kayıp"
            onPress={() => onInfo('maxDrawdown', formatPercent(-m.maxDrawdown, { decimals: 1 }))}
          />
          <MetricTile
            label="Fazla getiri"
            value={points(m.excessReturn, ' p')}
            tone={tone(m.excessReturn)}
            sub={`${BENCHMARK_NAME}’e göre, tüm dönem`}
            onPress={() => onInfo('excess', points(m.excessReturn, ' puan'))}
          />
          {m.bestMonth && m.worstMonth ? (
            <>
              <MetricTile
                label="En iyi ay"
                value={pct(m.bestMonth.ratio)}
                tone={tone(m.bestMonth.ratio)}
                sub={monthLabel(m.bestMonth.month)}
                onPress={() => onInfo('bestMonth', pct(m.bestMonth!.ratio))}
              />
              <MetricTile
                label="En kötü ay"
                value={pct(m.worstMonth.ratio)}
                tone={tone(m.worstMonth.ratio)}
                sub={monthLabel(m.worstMonth.month)}
                onPress={() => onInfo('bestMonth', pct(m.worstMonth!.ratio))}
              />
            </>
          ) : null}
        </View>
      </Card>

      <Card>
        <SectionHeader title="DÖNEMSEL GETİRİ (TWR)" style={{ marginBottom: space.md }} />
        <View style={{ flexDirection: 'row', paddingBottom: space.sm }}>
          <Text variant="overline" tone="tertiary" style={{ flex: 1 }}>
            DÖNEM
          </Text>
          {['PORTFÖY', BENCHMARK_NAME.toUpperCase(), 'FARK'].map((h) => (
            <Text key={h} variant="overline" tone="tertiary" align="right" style={{ width: 82 }}>
              {h}
            </Text>
          ))}
        </View>
        {RANGES.map((r, i) => {
          const start = analysis.periodStart[r];
          const a = periodReturn(me, start);
          const b = main ? periodReturn(main, start) : null;
          return (
            <View
              key={r}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: space.sm + 2,
                borderTopWidth: i === 0 ? 0 : 1,
                borderTopColor: colors.border,
              }}>
              <Text variant="subhead" style={{ flex: 1 }}>
                {r}
              </Text>
              <Text variant="numS" tone={tone(a)} align="right" style={{ width: 82 }}>
                {pct(a)}
              </Text>
              <Text variant="numS" tone="secondary" align="right" style={{ width: 82 }}>
                {pct(b)}
              </Text>
              <Text
                variant="numS"
                tone={tone(b === null ? null : a - b)}
                align="right"
                style={{ width: 82 }}>
                {points(b === null ? null : a - b, ' p')}
              </Text>
            </View>
          );
        })}
      </Card>

      <MonthlyHeatmap months={m.months} />
    </View>
  );
}

function MonthlyHeatmap({ months }: { months: MonthReturn[] }) {
  const { colors } = useTheme();
  const years = [...new Set(months.map((x) => x.month.slice(0, 4)))];
  const max = Math.max(1e-9, ...months.map((x) => Math.abs(x.ratio)));
  const SHORT = ['O', 'Ş', 'M', 'N', 'M', 'H', 'T', 'A', 'E', 'E', 'K', 'A'];
  return (
    <Card>
      <SectionHeader title="AYLIK GETİRİ HARİTASI" style={{ marginBottom: space.md }} />
      <View style={{ flexDirection: 'row', marginLeft: 40, marginBottom: 4 }}>
        {SHORT.map((s, i) => (
          <Text
            key={i}
            variant="caption"
            tone="tertiary"
            align="center"
            style={{ flex: 1, fontSize: 10 }}>
            {s}
          </Text>
        ))}
      </View>
      {years.map((y) => (
        <View
          key={y}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 3 }}>
          <Text variant="caption" tone="secondary" style={{ width: 37 }}>
            {y}
          </Text>
          {Array.from({ length: 12 }, (_, mi) => {
            const key = `${y}-${String(mi + 1).padStart(2, '0')}`;
            const cell = months.find((x) => x.month === key);
            const strength = cell ? 0.18 + 0.7 * Math.min(1, Math.abs(cell.ratio) / max) : 0;
            const base = cell && cell.ratio < 0 ? colors.down : colors.up;
            return (
              <View
                key={key}
                accessibilityLabel={cell ? `${monthLabel(key)} ${pct(cell.ratio)}` : undefined}
                style={{
                  flex: 1,
                  height: 30,
                  borderRadius: 6,
                  backgroundColor: cell ? base : colors.surfaceAlt,
                  opacity: cell ? strength : 0.5,
                }}
              />
            );
          })}
        </View>
      ))}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: space.sm }}>
        <Text variant="caption" tone="tertiary">
          Koyu renk = büyük hareket
        </Text>
        <Text variant="caption" tone="tertiary">
          Dokun: ay detayı (Faz 9)
        </Text>
      </View>
    </Card>
  );
}

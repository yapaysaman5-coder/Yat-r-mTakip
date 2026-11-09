import { ChevronRight } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { EmptyPortfolio } from '@/components/EmptyPortfolio';
import { buildStatement, monthRecords, type MonthStatement } from '@/data/view/historyView';
import { usePortfolioView } from '@/state/portfolio';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';
import { Card, ChangeBadge, Money, PressableScale, Sheet, Text } from '@/ui';
import { formatDate, formatMoney, formatMonthYear, upperTR } from '@/utils/format';

import { TxnRow } from './TxnRow';

const monthName = (m: string) => formatMonthYear(`${m}-15T12:00:00Z`);

/**
 * Aylık Ekstre (docs/01-PROJE-DOKUMANI.md §6.5), like a bank or fund statement: for each month
 * the opening value, money in and out, what the market added and the closing value, with the
 * month's time-weighted return. A month opens its details.
 */
export function Statement() {
  const { colors } = useTheme();
  const view = usePortfolioView();
  const [open, setOpen] = useState<MonthStatement | null>(null);
  if (view.empty) return <EmptyPortfolio />;
  const months = buildStatement(view);

  const byYear = new Map<string, MonthStatement[]>();
  for (const m of months) {
    const y = m.month.slice(0, 4);
    byYear.set(y, [...(byYear.get(y) ?? []), m]);
  }

  return (
    <View style={{ gap: space.lg }}>
      <MonthSheet month={open} onClose={() => setOpen(null)} />
      {[...byYear.entries()].map(([year, list]) => {
        // The year's return: the months' returns compounded.
        const yearReturn = list.some((m) => m.return !== null)
          ? list.reduce((a, m) => a * (1 + (m.return ?? 0)), 1) - 1
          : null;
        return (
          <View key={year} style={{ gap: space.sm }}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
              <Text variant="overline" tone="tertiary">
                {year}
              </Text>
              {yearReturn !== null ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
                  <Text variant="caption" tone="tertiary">
                    Yıl getirisi
                  </Text>
                  <ChangeBadge value={yearReturn} />
                </View>
              ) : null}
            </View>
            <Card padding={0} style={{ paddingHorizontal: space.lg, paddingVertical: space.xs }}>
              {list.map((m, i) => (
                <PressableScale
                  key={m.month}
                  onPress={() => setOpen(m)}
                  haptic="selection"
                  scaleTo={0.985}
                  accessibilityRole="button"
                  accessibilityLabel={`${monthName(m.month)} ekstresi`}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: space.md,
                    paddingVertical: space.md,
                    borderTopWidth: i === 0 ? 0 : 1,
                    borderTopColor: colors.border,
                  }}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
                      <Text variant="callout">{monthName(m.month)}</Text>
                      {m.partial ? (
                        <Text variant="caption" tone="accent">
                          · sürüyor
                        </Text>
                      ) : null}
                    </View>
                    <Text variant="caption" tone="secondary" numberOfLines={1}>
                      {flowLine(m)}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 3 }}>
                    <Money value={m.close} variant="numM" decimals={0} />
                    {m.return !== null ? <ChangeBadge value={m.return} /> : null}
                  </View>
                  <ChevronRight size={16} color={colors.textTertiary} strokeWidth={2.4} />
                </PressableScale>
              ))}
            </Card>
          </View>
        );
      })}
      <Text variant="caption" tone="tertiary">
        Aylık getiri zaman ağırlıklıdır: ay içindeki para giriş ve çıkışları getiriyi etkilemez.
        Piyasa K/Z = ay sonu − ay başı − (giren − çıkan); temettü ve ücretler dahildir.
      </Text>
    </View>
  );
}

function flowLine(m: MonthStatement): string {
  const parts = [`Piyasa ${formatMoney(m.market, { decimals: 0, sign: 'always' })}`];
  if (m.inflow > 0) parts.push(`giren ${formatMoney(m.inflow, { decimals: 0 })}`);
  if (m.outflow > 0) parts.push(`çıkan ${formatMoney(m.outflow, { decimals: 0 })}`);
  return parts.join(' · ');
}

export function MonthSheet({
  month,
  onClose,
}: {
  month: MonthStatement | null;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const view = usePortfolioView();
  if (!month) return <Sheet visible={false} onClose={onClose} />;
  const records = monthRecords(view, month.month);
  const line = (
    label: string,
    value: number,
    opts: { sign?: boolean; strong?: boolean; colorize?: boolean } = {},
  ) => (
    <View
      key={label}
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: space.sm,
        borderTopWidth: opts.strong ? 1 : 0,
        borderTopColor: colors.border,
      }}>
      <Text
        variant={opts.strong ? 'bodyStrong' : 'body'}
        tone={opts.strong ? 'primary' : 'secondary'}>
        {label}
      </Text>
      <Money
        value={value}
        variant={opts.strong ? 'numL' : 'numM'}
        sign={opts.sign ? 'always' : 'auto'}
        colorize={opts.colorize}
      />
    </View>
  );
  return (
    <Sheet
      visible
      onClose={onClose}
      title={monthName(month.month)}
      subtitle={`${formatDate(`${month.firstDay}T12:00:00Z`)} – ${formatDate(`${month.lastDay}T12:00:00Z`)}${month.partial ? ' (sürüyor)' : ''}`}>
      <View style={{ gap: space.lg }}>
        <View
          style={{
            backgroundColor: colors.surfaceAlt,
            borderRadius: radius.lg,
            paddingHorizontal: space.lg,
            paddingVertical: space.sm,
          }}>
          {line('Ay başı değer', month.open)}
          {line('Giren para', month.inflow, { sign: true })}
          {line('Çıkan para', -month.outflow, { sign: true })}
          {line('Piyasa K/Z', month.market, { sign: true, colorize: true })}
          {line(month.partial ? 'Bugünkü değer' : 'Ay sonu değer', month.close, { strong: true })}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingTop: space.xs,
              paddingBottom: space.sm,
            }}>
            <Text variant="body" tone="secondary">
              Aylık getiri
            </Text>
            {month.return !== null ? (
              <ChangeBadge value={month.return} size="md" />
            ) : (
              <Text>—</Text>
            )}
          </View>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          <Info label="Gerçekleşen K/Z" value={formatMoney(month.realized, { sign: 'always' })} />
          <Info label="Temettü" value={formatMoney(month.dividends)} />
          <Info label="Hesap ücretleri" value={formatMoney(month.accountFees)} />
          <Info label="Alış / satış" value={`${month.trades} işlem`} />
        </View>

        {records.length ? (
          <View style={{ gap: space.xs }}>
            <Text variant="overline" tone="secondary">
              {upperTR('Ayın kayıtları')}
            </Text>
            <View
              style={{
                backgroundColor: colors.surfaceAlt,
                borderRadius: radius.lg,
                paddingHorizontal: space.md,
              }}>
              {records.map((r, i) => (
                <View
                  key={r.id}
                  style={{
                    borderTopWidth: i === 0 ? 0 : 1,
                    borderTopColor: colors.border,
                  }}>
                  <TxnRow txn={r} onPress={() => undefined} background={colors.surfaceAlt} />
                </View>
              ))}
            </View>
          </View>
        ) : (
          <Text variant="footnote" tone="tertiary">
            Bu ay kayıt yok; değişim yalnızca fiyatlardan.
          </Text>
        )}
      </View>
    </Sheet>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexBasis: '47%',
        flexGrow: 1,
        backgroundColor: colors.surfaceAlt,
        borderRadius: radius.md,
        padding: space.md,
        gap: 2,
      }}>
      <Text variant="caption" tone="secondary">
        {label}
      </Text>
      <Text variant="numM">{value}</Text>
    </View>
  );
}

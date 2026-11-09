import { useState } from 'react';
import { View } from 'react-native';

import { chosenDay, parseDay } from '@/components/form/DateChoice';
import { changeBetween, type HomeChart } from '@/data/view/chart';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';
import { Button, ChangeBadge, Chip, Sheet, Text, TextField } from '@/ui';
import { formatDate } from '@/utils/format';

/**
 * What the finger reads on the balance chart:
 * one finger → that point and its change since the start of the range;
 * two fingers → the change between the two points (deposits and withdrawals taken out).
 */
export function ReadOut({
  chart,
  index,
  range,
}: {
  chart: HomeChart;
  index: number | null;
  range: [number, number] | null;
}) {
  const { colors } = useTheme();
  const [a, b] = range ?? [0, index ?? 0];
  const change = changeBetween(chart, a, b);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
      <ChangeBadge value={change.amount} kind="money" variant="hero" size="md" />
      {change.ratio !== null ? <ChangeBadge value={change.ratio} variant="hero" size="md" /> : null}
      <Text
        variant="footnote"
        color={colors.heroTextSecondary}
        numberOfLines={1}
        style={{ flexShrink: 1 }}>
        {range ? `${chart.labels[a]} → ${chart.labels[b]}` : chart.labels[b]}
      </Text>
    </View>
  );
}

const PRESETS: [label: string, months: number][] = [
  ['Son 2 yıl', 24],
  ['Son 9 ay', 9],
  ['Son 2 hafta', 0.5],
];

/** "Özel" range: two dates (GG.AA.YYYY), within the portfolio's history. */
export function CustomRangeSheet({
  visible,
  onClose,
  onApply,
  first,
  last,
}: {
  visible: boolean;
  onClose: () => void;
  onApply: (r: { from: string; to: string }) => void;
  first?: string;
  last?: string;
}) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const apply = (f: string | null, t: string | null) => {
    if (!f || !t) return setError('Tarihleri GG.AA.YYYY olarak yaz.');
    if (f >= t) return setError('Başlangıç, bitişten önce olmalı.');
    setError(null);
    onApply({ from: f, to: t });
  };
  const today = last ?? chosenDay({ choice: 'today', other: '', time: '' }, new Date())!;
  const back = (months: number) => {
    const d = new Date(`${today}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - Math.round(months * 30.44));
    return d.toISOString().slice(0, 10);
  };
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Özel tarih aralığı"
      subtitle={
        first && last
          ? `Geçmişin ${formatDate(`${first}T12:00:00Z`)} – ${formatDate(`${last}T12:00:00Z`)} arasında.`
          : undefined
      }>
      <View style={{ gap: space.md }}>
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <TextField
            label="Başlangıç"
            value={from}
            onChangeText={setFrom}
            placeholder="01.01.2026"
            keyboardType="numbers-and-punctuation"
            maxLength={10}
            style={{ flex: 1 }}
          />
          <TextField
            label="Bitiş"
            value={to}
            onChangeText={setTo}
            placeholder={last ? formatDate(`${last}T12:00:00Z`) : ''}
            keyboardType="numbers-and-punctuation"
            maxLength={10}
            style={{ flex: 1 }}
          />
        </View>
        <View style={{ flexDirection: 'row', gap: space.xs, flexWrap: 'wrap' }}>
          {PRESETS.map(([label, months]) => (
            <Chip key={label} label={label} size="sm" onPress={() => apply(back(months), today)} />
          ))}
        </View>
        {error ? (
          <Text variant="footnote" tone="down">
            {error}
          </Text>
        ) : null}
        <Button
          label="Göster"
          fullWidth
          onPress={() => apply(parseDay(from), to.trim() ? parseDay(to) : today)}
        />
      </View>
    </Sheet>
  );
}

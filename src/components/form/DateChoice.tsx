import { View } from 'react-native';

import { addDays, trDay } from '@/domain';
import { space } from '@/theme/tokens';
import { Chip, Text, TextField } from '@/ui';
import { formatDate } from '@/utils/format';

export type DayChoice = 'today' | 'yesterday' | 'other';

export interface DateValue {
  choice: DayChoice;
  /** GG.AA.YYYY when choice is "other". */
  other: string;
  /** Optional SS:DD. */
  time: string;
}

/** "09.11.2026" → "2026-11-09" (null if not a real date). */
export function parseDay(text: string): string | null {
  const m = /^(\d{1,2})[./](\d{1,2})[./](\d{4})$/.exec(text.trim());
  if (!m) return null;
  const iso = `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  const d = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== iso ? null : iso;
}

/** The chosen Istanbul day, or null when "another day" is not a valid date. */
export function chosenDay(v: DateValue, now: Date): string | null {
  const today = trDay(now);
  if (v.choice === 'today') return today;
  if (v.choice === 'yesterday') return addDays(today, -1);
  return parseDay(v.other);
}

/** Initial value for a stored timestamp (edit) or for today. */
export function dateValueFor(ts: string | undefined, now: Date): DateValue {
  if (!ts) return { choice: 'today', other: '', time: '' };
  const day = trDay(ts);
  const today = trDay(now);
  const t = new Date(Date.parse(ts) + 3 * 3_600_000);
  const time = `${String(t.getUTCHours()).padStart(2, '0')}:${String(t.getUTCMinutes()).padStart(2, '0')}`;
  if (day === today) return { choice: 'today', other: '', time };
  if (day === addDays(today, -1)) return { choice: 'yesterday', other: '', time };
  return { choice: 'other', other: formatDate(`${day}T12:00:00Z`), time };
}

/** Bugün / Dün / Başka gün, plus an optional time. */
export function DateChoiceField({
  value,
  onChange,
  error,
  showTime = true,
}: {
  value: DateValue;
  onChange: (v: DateValue) => void;
  error?: string | null;
  showTime?: boolean;
}) {
  return (
    <View style={{ gap: space.xs }}>
      <Text variant="caption" tone="secondary">
        Tarih
      </Text>
      <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
        <Chip
          label="Bugün"
          selected={value.choice === 'today'}
          onPress={() => onChange({ ...value, choice: 'today' })}
        />
        <Chip
          label="Dün"
          selected={value.choice === 'yesterday'}
          onPress={() => onChange({ ...value, choice: 'yesterday' })}
        />
        <Chip
          label="Başka gün"
          selected={value.choice === 'other'}
          onPress={() => onChange({ ...value, choice: 'other' })}
        />
      </View>
      <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.xs }}>
        {value.choice === 'other' ? (
          <TextField
            label="Gün (GG.AA.YYYY)"
            value={value.other}
            onChangeText={(other) => onChange({ ...value, other })}
            placeholder="05.03.2026"
            keyboardType="numbers-and-punctuation"
            maxLength={10}
            style={{ flex: 1.4 }}
          />
        ) : null}
        {showTime && value.choice !== 'today' ? (
          <TextField
            label="Saat (isteğe bağlı)"
            value={value.time}
            onChangeText={(time) => onChange({ ...value, time })}
            placeholder="ör. 14:30"
            keyboardType="numbers-and-punctuation"
            maxLength={5}
            style={{ flex: 1 }}
          />
        ) : null}
      </View>
      {error ? (
        <Text variant="caption" tone="down">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

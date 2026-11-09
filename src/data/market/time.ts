import { trDay, trDayEnd, trDayStart } from '@/domain';

export { trDay, trDayEnd, trDayStart };

/** "2026-11-09" → "09-11-2026" (İş Yatırım) */
export const dmy = (day: string, sep = '-') => day.split('-').reverse().join(sep);

/** "09-11-2026" or "09.11.2026" → "2026-11-09" */
export const fromDmy = (text: string) => {
  const [d, m, y] = text.split(/[-.]/);
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
};

/** Unix seconds at Istanbul midnight starting `day`. */
export const unixStart = (day: string) => Math.floor(trDayStart(day) / 1000);

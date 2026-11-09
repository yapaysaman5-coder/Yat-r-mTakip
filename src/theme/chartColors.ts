/**
 * Fixed colour per comparison series, so "Gram Altın" is always the same gold on every chart.
 * Two sets: lighter tones for dark themes, deeper tones for the light theme.
 */
const DARK: Record<string, string> = {
  xu100: '#FF8A7A',
  xu030: '#FFB38A',
  gold: '#F5C451',
  silver: '#C6CFDB',
  spx: '#8FA8FF',
  ndx: '#B99CFF',
  rut: '#5ED3C2',
  btc: '#FF9F43',
  usd: '#7BD88F',
  eur: '#62C6F0',
  cpi: '#FF7AB6',
  deposit: '#A9B6CA',
};

const LIGHT: Record<string, string> = {
  xu100: '#D9483B',
  xu030: '#C9622F',
  gold: '#A87C00',
  silver: '#6E7A8D',
  spx: '#3F5BD6',
  ndx: '#7A4FD6',
  rut: '#14897B',
  btc: '#C86A0A',
  usd: '#25894A',
  eur: '#1679B5',
  cpi: '#C02E78',
  deposit: '#5D6B80',
};

/** Colour for a comparison series; the user's own portfolio uses the theme accent. */
export function seriesColor(key: string, dark: boolean, accent: string): string {
  if (key === 'me') return accent;
  return (dark ? DARK : LIGHT)[key] ?? accent;
}

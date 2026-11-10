import { trDay } from '@/domain';
import { tr } from '@/i18n/tr';

import type { PortfolioView } from './portfolioView';

/**
 * Transactions as CSV (Ayarlar › Veri ve Yedekleme): one row per record, oldest first, for
 * Excel or Google Sheets in Turkish: ";" between columns, "," for decimals, a byte-order mark
 * so the Turkish letters open right. Automatic records are included and marked.
 */
const HEADER = [
  'Tarih',
  'Saat',
  'İşlem',
  'Varlık',
  'Piyasa',
  'Adet',
  'Fiyat',
  'Para birimi',
  'Kur (TL)',
  'Komisyon (TL)',
  'Stopaj (TL)',
  'Nakde etkisi (TL)',
  'Gerçekleşen K/Z (TL)',
  'Otomatik',
  'Not',
];

const MARKET: Record<string, string> = { bist: 'BIST', us: 'ABD', crypto: 'Kripto' };

function number(n: number | undefined, decimals = 8): string {
  if (n === undefined || !Number.isFinite(n)) return '';
  const fixed = n.toFixed(decimals).replace(/\.?0+$/, '');
  return (fixed === '-0' ? '0' : fixed).replace('.', ',');
}

function text(s: string | undefined): string {
  if (!s) return '';
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function istanbulTime(ts: string): string {
  const d = new Date(Date.parse(ts) + 3 * 3_600_000);
  return d.toISOString().slice(11, 16);
}

export function transactionsCsv(view: PortfolioView): string {
  const rows = [...view.history].reverse().map((h) => {
    const t = h.source;
    return [
      trDay(h.ts),
      istanbulTime(h.ts),
      tr.txn[h.type],
      h.symbol ?? '',
      h.market ? MARKET[h.market] : '',
      number(h.quantity),
      number(h.price),
      h.symbol ? h.currency : 'TRY',
      t?.fxRate ? number(Number(t.fxRate), 6) : '',
      number(h.feeTRY, 2),
      number(h.taxTRY, 2),
      number(h.amountTRY, 2),
      h.realized ? number(h.realized.pnlTRY, 2) : '',
      h.isAuto ? 'evet' : '',
      text(h.note),
    ].join(';');
  });
  return `﻿${[HEADER.join(';'), ...rows].join('\r\n')}\r\n`;
}

export function csvFileName(view: PortfolioView): string {
  const name = view.portfolio.name
    .toLocaleLowerCase('tr')
    .replace(/[ıİ]/g, 'i')
    .replace(/[ğĞ]/g, 'g')
    .replace(/[üÜ]/g, 'u')
    .replace(/[şŞ]/g, 's')
    .replace(/[öÖ]/g, 'o')
    .replace(/[çÇ]/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `yatirim-takip-${name || 'portfoy'}-islemler-${view.today}.csv`;
}

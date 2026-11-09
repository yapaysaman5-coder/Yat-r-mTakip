import type { ChangeRejection } from '@/data/service/transactions';
import type { HistoryItem } from '@/data/view/portfolioView';
import type { ValidationIssue } from '@/domain';
import { formatDate, formatMoney, formatQuantity } from '@/utils/format';

/** Turkish explanations for refused changes (docs/02-HESAPLAMA-MOTORU.md §2, §4.4). */

const FIELD: Partial<Record<ValidationIssue['field'], string>> = {
  amount: 'Tutar',
  quantity: 'Adet',
  price: 'Fiyat',
  fee: 'Komisyon',
  fxRate: 'Kur',
  tax: 'Stopaj',
  splitRatio: 'Bölünme oranı',
  assetId: 'Varlık',
  ts: 'Tarih',
};

export function issueText(issue: ValidationIssue): string {
  const field = FIELD[issue.field] ?? 'Alan';
  switch (issue.code) {
    case 'REQUIRED':
      return `${field} gerekli.`;
    case 'NOT_A_NUMBER':
      return `${field} bir sayı olmalı.`;
    case 'MUST_BE_POSITIVE':
      return `${field} sıfırdan büyük olmalı.`;
    case 'MUST_NOT_BE_NEGATIVE':
      return `${field} eksi olamaz.`;
    case 'INVALID_DATE':
      return 'Tarih geçerli değil.';
    case 'FUTURE_DATE':
      return 'İleri tarihli kayıt eklenemez.';
    case 'UNKNOWN_ASSET':
      return 'Varlık bulunamadı.';
    case 'TAX_EXCEEDS_AMOUNT':
      return 'Stopaj, brüt temettüden büyük olamaz.';
    case 'SPLIT_RATIO_ONE':
      return 'Bölünme oranı 1 olamaz.';
  }
}

export function rejectionText(r: ChangeRejection, history: readonly HistoryItem[] = []): string {
  const find = (id: string) => history.find((h) => h.id === id);
  switch (r.code) {
    case 'INVALID':
      return issueText(r.issues[0]);
    case 'NOT_FOUND':
      return 'Kayıt bulunamadı; liste yenilendi.';
    case 'AUTO_RECORD':
      return 'Otomatik kayıtlar tek başına değiştirilemez; bağlı olduğu kaydı düzenle.';
    case 'OVERSELL': {
      const i = r.issues[0];
      const sale = find(i.txnId);
      const what = sale
        ? `${formatDate(sale.ts)} tarihli ${sale.symbol ?? ''} satışı`
        : 'Bir satış';
      return `${what} eldekinden fazla olurdu (${formatQuantity(i.requested ?? 0)} satılmış, o an ${formatQuantity(i.available ?? 0)} vardı). Önce o satışı düzenle veya sil.`;
    }
    case 'NEGATIVE_CASH': {
      const i = r.issues[0];
      const t = find(i.txnId);
      const when = t ? `${formatDate(t.ts)} tarihinde` : 'Bir tarihte';
      return `Nakit yetmiyor: ${when} nakit ${formatMoney(i.cash ?? 0)} olurdu.`;
    }
  }
}

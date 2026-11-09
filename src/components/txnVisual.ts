import {
  ArrowDownToLine,
  ArrowUpFromLine,
  HandCoins,
  Receipt,
  ShoppingCart,
  Split,
  TrendingDown,
  type LucideIcon,
} from 'lucide-react-native';

import type { HistoryItem } from '@/data/view/portfolioView';
import type { ThemeColors } from '@/theme/types';

/** Icon and colours for a record type (history list and record detail). */
export function txnVisual(
  type: HistoryItem['type'],
  c: ThemeColors,
): { icon: LucideIcon; color: string; bg: string } {
  switch (type) {
    case 'BUY':
      return { icon: ShoppingCart, color: c.up, bg: c.upSoft };
    case 'SELL':
      return { icon: TrendingDown, color: c.down, bg: c.downSoft };
    case 'DEPOSIT':
      return { icon: ArrowDownToLine, color: c.accent, bg: c.accentSoft };
    case 'WITHDRAW':
      return { icon: ArrowUpFromLine, color: c.warning, bg: c.warningSoft };
    case 'DIVIDEND':
      return { icon: HandCoins, color: c.accent2, bg: c.accent2Soft };
    case 'FEE':
      return { icon: Receipt, color: c.textSecondary, bg: c.neutralSoft };
    case 'SPLIT':
      return { icon: Split, color: c.accent2, bg: c.accent2Soft };
  }
}

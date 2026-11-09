import { Bitcoin } from 'lucide-react-native';
import { View } from 'react-native';

import { alpha } from '@/theme/themes';
import { useColors } from '@/theme/ThemeProvider';
import type { MarketKey } from '@/theme/types';

import { Text } from './Text';

export interface AssetAvatarProps {
  symbol: string;
  market: MarketKey;
  size?: number;
}

/**
 * Soft rounded tile with the symbol's initials, tinted by market colour.
 * (Company logos may replace this later; the monogram stays as the fallback.)
 */
export function AssetAvatar({ symbol, market, size = 44 }: AssetAvatarProps) {
  const colors = useColors();
  const tint = colors.market[market];
  const isBtc = symbol.toUpperCase() === 'BTC';
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.34,
        backgroundColor: alpha(tint, 0.16),
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      {isBtc ? (
        <Bitcoin size={size * 0.5} color={tint} strokeWidth={2.4} />
      ) : (
        <Text
          variant="numS"
          color={tint}
          style={{ fontSize: size * 0.3, lineHeight: size * 0.4, fontFamily: 'Inter_700Bold' }}>
          {symbol.slice(0, 2).toUpperCase()}
        </Text>
      )}
    </View>
  );
}

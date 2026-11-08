import { ChevronRight } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { useColors } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

import { PressableScale } from './PressableScale';
import { Text } from './Text';

export interface ListRowProps {
  title: string;
  subtitle?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  /** Small pill after the title, e.g. "Yakında". */
  badge?: ReactNode;
  showChevron?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function ListRow({
  title,
  subtitle,
  leading,
  trailing,
  badge,
  showChevron,
  onPress,
  style,
}: ListRowProps) {
  const colors = useColors();
  const content = (
    <>
      {leading}
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <Text variant="callout" numberOfLines={1} style={{ flexShrink: 1 }}>
            {title}
          </Text>
          {badge}
        </View>
        {subtitle ? (
          <Text variant="footnote" tone="secondary" numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing}
      {showChevron ? (
        <ChevronRight size={18} color={colors.textTertiary} strokeWidth={2.4} />
      ) : null}
    </>
  );
  const rowStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
    minHeight: 56,
  };
  if (onPress) {
    return (
      <PressableScale
        onPress={onPress}
        haptic="selection"
        scaleTo={0.985}
        accessibilityRole="button"
        style={[rowStyle, style]}>
        {content}
      </PressableScale>
    );
  }
  return <View style={[rowStyle, style]}>{content}</View>;
}

/** Rounded square icon well used as a row's leading element. */
export function IconWell({
  children,
  background,
  size = 36,
}: {
  children: ReactNode;
  background: string;
  size?: number;
}) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.36,
        backgroundColor: background,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      {children}
    </View>
  );
}

import { View, type StyleProp, type ViewStyle } from 'react-native';

import { space } from '@/theme/tokens';

import { PressableScale } from './PressableScale';
import { Text } from './Text';

/** Small upper-case section label with an optional text action on the right. */
export function SectionHeader({
  title,
  actionLabel,
  onAction,
  style,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: 24,
        },
        style,
      ]}>
      <Text variant="overline" tone="tertiary" accessibilityRole="header">
        {title}
      </Text>
      {actionLabel ? (
        <PressableScale
          onPress={onAction}
          haptic="selection"
          hitSlop={8}
          accessibilityRole="button">
          <Text variant="subhead" tone="accent" style={{ paddingVertical: space.xxs }}>
            {actionLabel}
          </Text>
        </PressableScale>
      ) : null}
    </View>
  );
}

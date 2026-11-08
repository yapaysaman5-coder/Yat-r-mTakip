import type { LucideIcon } from 'lucide-react-native';
import { View } from 'react-native';

import { useColors } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

import { Button } from './Button';
import { Text } from './Text';

/** Friendly empty state: icon in a soft double ring, a title, one line and one action. */
export function EmptyState({
  icon: Icon,
  title,
  message,
  actionLabel,
  onAction,
}: {
  icon: LucideIcon;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const colors = useColors();
  return (
    <View
      style={{ alignItems: 'center', paddingVertical: space.xxxl, paddingHorizontal: space.xxl }}>
      <View
        style={{
          width: 96,
          height: 96,
          borderRadius: 48,
          backgroundColor: colors.accentSoft,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: space.xl,
        }}>
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: colors.accentSoft,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Icon size={30} color={colors.accent} strokeWidth={2.2} />
        </View>
      </View>
      <Text variant="title3" align="center">
        {title}
      </Text>
      <Text
        variant="footnote"
        tone="secondary"
        align="center"
        style={{ marginTop: space.sm, maxWidth: 300 }}>
        {message}
      </Text>
      {actionLabel ? (
        <Button
          label={actionLabel}
          onPress={onAction}
          style={{ marginTop: space.xl, alignSelf: 'center' }}
        />
      ) : null}
    </View>
  );
}

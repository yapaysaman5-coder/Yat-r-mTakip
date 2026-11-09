import { Sparkles } from 'lucide-react-native';
import { View } from 'react-native';

import { useColors } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';
import { Text } from '@/ui';

/** Honest label on screens that show the example portfolio or still use illustrative data. */
export function PreviewNote({ text = 'Örnek portföy · kurgusal fiyatlar' }: { text?: string }) {
  const colors = useColors();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.sm,
        alignSelf: 'flex-start',
        paddingHorizontal: space.md,
        paddingVertical: space.xs + 2,
        borderRadius: radius.pill,
        backgroundColor: colors.accent2Soft,
      }}>
      <Sparkles size={14} color={colors.accent2} strokeWidth={2.4} />
      <Text variant="caption" color={colors.accent2}>
        {text}
      </Text>
    </View>
  );
}

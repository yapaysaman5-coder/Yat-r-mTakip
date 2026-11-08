import { Switch } from 'react-native';

import { haptics } from '@/lib/haptics';
import { useTheme } from '@/theme/ThemeProvider';

/** Themed on/off switch. */
export function Toggle({
  value,
  onValueChange,
  accessibilityLabel,
}: {
  value: boolean;
  onValueChange: (value: boolean) => void;
  accessibilityLabel: string;
}) {
  const { colors, dark } = useTheme();
  return (
    <Switch
      value={value}
      onValueChange={(v) => {
        haptics.selection();
        onValueChange(v);
      }}
      accessibilityLabel={accessibilityLabel}
      trackColor={{ false: colors.borderStrong, true: colors.accent }}
      thumbColor={
        value ? (dark ? colors.text : '#FFFFFF') : dark ? colors.textSecondary : '#FFFFFF'
      }
      ios_backgroundColor={colors.borderStrong}
    />
  );
}

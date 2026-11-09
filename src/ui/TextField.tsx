import { useState } from 'react';
import {
  TextInput,
  View,
  type KeyboardTypeOptions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useColors } from '@/theme/ThemeProvider';
import { radius, space, typography } from '@/theme/tokens';

import { Text } from './Text';

export interface TextFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  /** Shown before the value, e.g. "₺". */
  prefix?: string;
  /** Large number field (amounts). */
  large?: boolean;
  error?: string | null;
  hint?: string;
  autoFocus?: boolean;
  maxLength?: number;
  style?: StyleProp<ViewStyle>;
}

/** Labelled input with an error line; the border lights up on focus and on errors. */
export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  prefix,
  large,
  error,
  hint,
  autoFocus,
  maxLength,
  style,
}: TextFieldProps) {
  const colors = useColors();
  const [focused, setFocused] = useState(false);
  const border = error ? colors.down : focused ? colors.accent : colors.border;
  const font = large ? typography.numXL : typography.body;
  return (
    <View style={[{ gap: space.xs }, style]}>
      <Text variant="caption" tone="secondary">
        {label}
      </Text>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.xs,
          borderRadius: radius.md,
          borderWidth: 1.5,
          borderColor: border,
          backgroundColor: colors.surfaceAlt,
          paddingHorizontal: space.md,
          minHeight: large ? 68 : 48,
        }}>
        {prefix ? (
          <Text variant={large ? 'numXL' : 'body'} tone="tertiary">
            {prefix}
          </Text>
        ) : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textTertiary}
          keyboardType={keyboardType}
          autoFocus={autoFocus}
          maxLength={maxLength}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          accessibilityLabel={label}
          selectionColor={colors.accent}
          style={{
            flex: 1,
            minWidth: 0,
            outlineWidth: 0,
            ...font,
            color: colors.text,
            fontVariant: ['tabular-nums'],
            paddingVertical: space.sm,
          }}
        />
      </View>
      {error ? (
        <Text variant="caption" tone="down">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" tone="tertiary">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

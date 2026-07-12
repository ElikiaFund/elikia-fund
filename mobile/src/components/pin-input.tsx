import { StyleSheet, TextInput } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

type PinInputProps = {
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
};

export function PinInput({ value, onChange, autoFocus }: PinInputProps) {
  const theme = useTheme();

  return (
    <TextInput
      value={value}
      onChangeText={(text) => onChange(text.replace(/\D/g, '').slice(0, 4))}
      keyboardType="number-pad"
      secureTextEntry
      maxLength={4}
      autoFocus={autoFocus}
      style={[styles.input, { color: theme.text, borderColor: theme.textSecondary }]}
      placeholder="••••"
      placeholderTextColor={theme.textSecondary}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingVertical: 16,
    fontSize: 32,
    letterSpacing: 16,
    textAlign: 'center',
  },
});

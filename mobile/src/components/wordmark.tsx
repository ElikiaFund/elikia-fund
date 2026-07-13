import { Text, type TextStyle } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

type WordmarkProps = {
  size?: number;
  style?: TextStyle;
};

// Text-only brand mark — "Elikia" carries the accent color, "Fund" stays neutral, so this
// reads as a wordmark rather than a plain title and adapts to light/dark automatically via
// theme.tint/theme.text. Swap for a real logomark component here once one exists.
export function Wordmark({ size = 20, style }: WordmarkProps) {
  const theme = useTheme();

  return (
    <Text style={style}>
      <Text style={{ color: theme.tint, fontSize: size, fontWeight: '800', letterSpacing: -0.3 }}>Elikia</Text>
      <Text style={{ color: theme.text, fontSize: size, fontWeight: '600', letterSpacing: -0.3 }}> Fund</Text>
    </Text>
  );
}

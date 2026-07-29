import { Fragment } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type Stat = {
  label: string;
  value: string;
  /** Overrides the value's color — pass theme.income/theme.danger for signed figures. */
  color?: string;
};

/**
 * 'cards' = individual bordered boxes side by side (group-report.tsx's original look).
 * 'divided' = one bordered-free row with hairline dividers between entries (close-cash-session.tsx's
 * original look). Reconciles what used to be two near-duplicate locally-defined patterns.
 */
export function StatGrid({ stats, variant = 'cards', style }: { stats: Stat[]; variant?: 'cards' | 'divided'; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();

  if (variant === 'divided') {
    return (
      <View style={[styles.row, style]}>
        {stats.map((stat, index) => (
          <Fragment key={stat.label}>
            <View style={styles.dividedStat}>
              <ThemedText type="small" themeColor="textSecondary">
                {stat.label}
              </ThemedText>
              <ThemedText type="smallBold" style={{ color: stat.color ?? theme.text }}>
                {stat.value}
              </ThemedText>
            </View>
            {index < stats.length - 1 && <View style={[styles.divider, { backgroundColor: theme.border }]} />}
          </Fragment>
        ))}
      </View>
    );
  }

  return (
    <View style={[styles.row, styles.cardsRow, style]}>
      {stats.map((stat) => (
        <View key={stat.label} style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <ThemedText type="small" themeColor="textSecondary">
            {stat.label}
          </ThemedText>
          <ThemedText type="smallBold" style={{ color: stat.color ?? theme.text }}>
            {stat.value}
          </ThemedText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardsRow: {
    gap: Spacing.two,
  },
  card: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  dividedStat: {
    flex: 1,
    gap: 2,
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    height: 32,
    marginHorizontal: Spacing.three,
  },
});

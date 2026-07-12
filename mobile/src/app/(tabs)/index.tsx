import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

// TODO (Day 3): wire this screen to src/db/database.ts — add income/expense, list transactions, running balance.
export default function CashflowScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Trésorerie</ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.subtitle}>
        Suivez vos revenus et dépenses, même hors connexion.
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.four,
  },
  subtitle: {
    marginTop: Spacing.two,
  },
});

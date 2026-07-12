import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

// TODO (Day 5): create/join a tontine, invite code + QR, member list, mock contribution.
export default function GroupsScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Tontines</ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.subtitle}>
        Créez ou rejoignez un groupe d'épargne. Nécessite une connexion internet.
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

import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useVault } from '@/context/vault-context';

export default function VaultScreen() {
  const router = useRouter();
  const { isUnlocked, lock } = useVault();

  // Re-lock every time this tab regains focus — the PIN protects each visit, not just the first.
  useFocusEffect(
    useCallback(() => {
      return () => lock();
    }, [lock]),
  );

  if (!isUnlocked) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText type="title">Coffre</ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.subtitle}>
          Entrez votre code PIN à 4 chiffres pour accéder à votre coffre.
        </ThemedText>
        <Pressable style={styles.button} onPress={() => router.push('/vault-unlock')}>
          <ThemedText type="smallBold">Déverrouiller le coffre</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Coffre</ThemedText>
      {/* TODO (Day 2/4): fetch balance + movement history from GET /vault; offline cache with "last updated" banner. */}
      <ThemedText themeColor="textSecondary" style={styles.subtitle}>
        Solde et historique du coffre — à venir.
      </ThemedText>
      <Pressable style={styles.button} onPress={lock}>
        <ThemedText type="smallBold">Verrouiller</ThemedText>
      </Pressable>
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
    marginBottom: Spacing.four,
  },
  button: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#8E8E93',
    borderRadius: 12,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
});

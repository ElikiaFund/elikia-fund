import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import { PinInput } from '@/components/pin-input';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useVault } from '@/context/vault-context';
import { ApiError } from '@/services/apiService';
import { vaultService } from '@/services/vaultService';

export default function VaultUnlockScreen() {
  const router = useRouter();
  const { unlock } = useVault();
  const [pin, setPin] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    setIsSubmitting(true);

    try {
      await vaultService.verifyPin(pin);
      unlock();
      router.back();
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        router.replace('/vault-activate');
        return;
      }

      setError(e instanceof Error ? e.message : 'Une erreur est survenue. Veuillez réessayer.');
      setPin('');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        Code PIN
      </ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.subtitle}>
        Entrez votre code à 4 chiffres pour accéder au coffre.
      </ThemedText>

      <PinInput value={pin} onChange={setPin} autoFocus />

      {error && (
        <ThemedText themeColor="textSecondary" style={styles.error}>
          {error}
        </ThemedText>
      )}

      {isSubmitting ? (
        <ActivityIndicator style={styles.spinner} />
      ) : (
        <Pressable style={[styles.button, pin.length !== 4 && styles.buttonDisabled]} disabled={pin.length !== 4} onPress={handleSubmit}>
          <ThemedText type="smallBold">Déverrouiller</ThemedText>
        </Pressable>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.four,
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    marginTop: Spacing.two,
    marginBottom: Spacing.five,
  },
  error: {
    textAlign: 'center',
    marginTop: Spacing.three,
  },
  button: {
    marginTop: Spacing.five,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#8E8E93',
    borderRadius: 12,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  spinner: {
    marginTop: Spacing.five,
  },
});

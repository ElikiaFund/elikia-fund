import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import { PinInput } from '@/components/pin-input';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useVault } from '@/context/vault-context';
import { vaultService } from '@/services/vaultService';

export default function VaultActivateScreen() {
  const router = useRouter();
  const { unlock } = useVault();
  const [pin, setPin] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = pin.length === 4 && confirmation.length === 4;

  async function handleSubmit() {
    if (pin !== confirmation) {
      setError('Les deux codes ne correspondent pas.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await vaultService.activate(pin);
      unlock();
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Une erreur est survenue. Veuillez réessayer.');
      setPin('');
      setConfirmation('');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        Activer le coffre
      </ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.subtitle}>
        Choisissez un code PIN à 4 chiffres. Il vous sera demandé à chaque accès au coffre.
      </ThemedText>

      <ThemedText type="small" style={styles.label}>
        Code PIN
      </ThemedText>
      <PinInput value={pin} onChange={setPin} autoFocus />

      <ThemedText type="small" style={styles.label}>
        Confirmez le code PIN
      </ThemedText>
      <PinInput value={confirmation} onChange={setConfirmation} />

      {error && (
        <ThemedText themeColor="textSecondary" style={styles.error}>
          {error}
        </ThemedText>
      )}

      {isSubmitting ? (
        <ActivityIndicator style={styles.spinner} />
      ) : (
        <Pressable style={[styles.button, !canSubmit && styles.buttonDisabled]} disabled={!canSubmit} onPress={handleSubmit}>
          <ThemedText type="smallBold">Activer</ThemedText>
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
  label: {
    marginBottom: Spacing.two,
    marginTop: Spacing.three,
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

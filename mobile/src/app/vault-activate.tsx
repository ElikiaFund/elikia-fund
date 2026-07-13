import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { PinCodeInput } from '@/components/pin-code-input';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useVault } from '@/context/vault-context';
import { vaultService } from '@/services/vaultService';
import { useTheme } from '@/hooks/use-theme';

type Step = 'create' | 'confirm';

export default function VaultActivateScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { unlock } = useVault();
  const [step, setStep] = useState<Step>('create');
  const [pin, setPin] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);

  function handlePinChange(text: string) {
    setPin(text);

    if (text.length === 4) {
      setTimeout(() => setStep('confirm'), 200);
    }
  }

  function handleConfirmationChange(text: string) {
    setConfirmation(text);
    setError(null);
    setHasError(false);

    if (text.length === 4) {
      submit(text);
    }
  }

  function handleBack() {
    setStep('create');
    setPin('');
    setConfirmation('');
    setError(null);
    setHasError(false);
  }

  async function submit(confirmed: string) {
    if (pin !== confirmed) {
      setError('Les deux codes ne correspondent pas.');
      setHasError(true);
      setConfirmation('');
      return;
    }

    setIsSubmitting(true);

    try {
      await vaultService.activate(pin);
      unlock();
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Une erreur est survenue. Veuillez réessayer.');
      setHasError(true);
      setConfirmation('');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.content}>
            <View style={[styles.icon, { backgroundColor: theme.tint }]}>
              <Ionicons name="lock-closed" size={24} color={theme.tintForeground} />
            </View>

            <ThemedText type="title" style={styles.title}>
              {step === 'create' ? 'Créez votre code PIN' : 'Confirmez votre code'}
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.subtitle}>
              {step === 'create'
                ? 'Ce code à 4 chiffres protégera votre coffre à chaque visite.'
                : 'Entrez à nouveau le même code pour le confirmer.'}
            </ThemedText>

            <View style={styles.pinArea}>
              {step === 'create' ? (
                <PinCodeInput value={pin} onChange={handlePinChange} autoFocus />
              ) : (
                <PinCodeInput value={confirmation} onChange={handleConfirmationChange} hasError={hasError} autoFocus />
              )}
            </View>

            <View style={styles.feedback}>
              {isSubmitting && <ActivityIndicator color={theme.tint} />}
              {error && (
                <ThemedText type="small" style={{ color: theme.danger }}>
                  {error}
                </ThemedText>
              )}
            </View>

            {step === 'confirm' && !isSubmitting && (
              <Pressable onPress={handleBack} style={styles.backLink}>
                <ThemedText type="small" style={{ color: theme.tint, fontWeight: '700' }}>
                  Recommencer
                </ThemedText>
              </Pressable>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.six,
  },
  content: {
    alignSelf: 'center',
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
  },
  icon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.four,
  },
  title: {
    textAlign: 'center',
    fontSize: 28,
    lineHeight: 34,
  },
  subtitle: {
    textAlign: 'center',
    marginTop: Spacing.two,
    marginBottom: Spacing.six,
    maxWidth: 280,
  },
  pinArea: {
    minHeight: 64,
  },
  feedback: {
    marginTop: Spacing.five,
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 24,
  },
  backLink: {
    marginTop: Spacing.three,
  },
});

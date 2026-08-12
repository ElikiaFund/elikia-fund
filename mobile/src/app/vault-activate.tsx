import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { PinCodeInput } from '@/components/pin-code-input';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useVault } from '@/context/vault-context';
import { vaultService } from '@/services/vaultService';
import { useTheme } from '@/hooks/use-theme';

// The PIN is a per-person property shared across every company vault, not per-vault (see
// vault-context.tsx) — activating a 2nd/3rd company's vault must confirm the *existing* shared
// PIN ('existing' step), while a person's very first vault still walks them through choosing one.
type Step = 'existing' | 'create' | 'confirm';

export default function VaultActivateScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { unlock } = useVault();
  const [step, setStep] = useState<Step>(user?.has_pin_set ? 'existing' : 'create');
  const [pin, setPin] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);

  function handleExistingPinChange(text: string) {
    setPin(text);
    setError(null);
    setHasError(false);

    if (text.length === 4) {
      submit(text);
    }
  }

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

  async function submit(enteredPin: string) {
    if (step === 'confirm' && pin !== enteredPin) {
      setError('Les deux codes ne correspondent pas.');
      setHasError(true);
      setConfirmation('');
      return;
    }

    setIsSubmitting(true);

    try {
      await vaultService.activate(enteredPin);
      unlock();
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Une erreur est survenue. Veuillez réessayer.');
      setHasError(true);

      if (step === 'existing') {
        setPin('');
      } else {
        setConfirmation('');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const titles: Record<Step, string> = {
    existing: 'Confirmez votre code PIN',
    create: 'Créez votre code PIN',
    confirm: 'Confirmez votre code',
  };
  const subtitles: Record<Step, string> = {
    existing: 'Entrez le code PIN que vous utilisez déjà pour activer le coffre de cette entreprise.',
    create: 'Ce code à 4 chiffres protégera votre coffre à chaque visite.',
    confirm: 'Entrez à nouveau le même code pour le confirmer.',
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.content}>
            <View style={[styles.icon, { backgroundColor: theme.tint }]}>
              <Ionicons name="lock-closed" size={24} color={theme.tintForeground} />
            </View>

            <ThemedText type="title" style={styles.title}>
              {titles[step]}
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.subtitle}>
              {subtitles[step]}
            </ThemedText>

            <View style={styles.pinArea}>
              {step === 'existing' ? (
                <PinCodeInput value={pin} onChange={handleExistingPinChange} hasError={hasError} autoFocus />
              ) : step === 'create' ? (
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

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { PinCodeInput } from '@/components/pin-code-input';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ApiError } from '@/services/apiService';
import { vaultService } from '@/services/vaultService';

type Step = 'current' | 'new' | 'confirm' | 'success';

export default function SecurityPinScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [step, setStep] = useState<Step>('current');
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);

  async function handleCurrentPinChange(text: string) {
    setCurrentPin(text);
    setError(null);
    setHasError(false);

    if (text.length === 4) {
      setIsSubmitting(true);

      try {
        await vaultService.verifyPin(text);
        setStep('new');
      } catch (e) {
        const message =
          e instanceof ApiError && e.status === 404
            ? "Activez d'abord votre coffre avec un code PIN depuis l'onglet Coffre."
            : e instanceof Error
              ? e.message
              : 'Une erreur est survenue. Veuillez réessayer.';
        setError(message);
        setHasError(true);
        setCurrentPin('');
      } finally {
        setIsSubmitting(false);
      }
    }
  }

  function handleNewPinChange(text: string) {
    setNewPin(text);
    setError(null);
    setHasError(false);

    if (text.length === 4) {
      if (text === currentPin) {
        setError('Le nouveau code doit être différent de l’actuel.');
        setHasError(true);
        setNewPin('');
        return;
      }

      setTimeout(() => setStep('confirm'), 200);
    }
  }

  async function handleConfirmationChange(text: string) {
    setConfirmation(text);
    setError(null);
    setHasError(false);

    if (text.length === 4) {
      if (text !== newPin) {
        setError('Les deux codes ne correspondent pas.');
        setHasError(true);
        setConfirmation('');
        return;
      }

      setIsSubmitting(true);

      try {
        await vaultService.updatePin(currentPin, text);
        setStep('success');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Une erreur est survenue. Veuillez réessayer.');
        setHasError(true);
        setStep('current');
        setCurrentPin('');
        setNewPin('');
        setConfirmation('');
      } finally {
        setIsSubmitting(false);
      }
    }
  }

  function handleRestart() {
    setStep('new');
    setNewPin('');
    setConfirmation('');
    setError(null);
    setHasError(false);
  }

  const titles: Record<Step, string> = {
    current: 'Code PIN actuel',
    new: 'Nouveau code PIN',
    confirm: 'Confirmez le nouveau code',
    success: 'Code PIN mis à jour',
  };

  const subtitles: Record<Step, string> = {
    current: 'Entrez votre code actuel pour continuer.',
    new: 'Choisissez un nouveau code à 4 chiffres.',
    confirm: 'Entrez à nouveau le nouveau code pour le confirmer.',
    success: 'Votre coffre est désormais protégé par ce nouveau code.',
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.content}>
            <View style={[styles.icon, { backgroundColor: step === 'success' ? theme.tint : theme.backgroundElement }]}>
              <Ionicons
                name={step === 'success' ? 'checkmark' : 'shield-checkmark-outline'}
                size={24}
                color={step === 'success' ? theme.tintForeground : theme.tint}
              />
            </View>

            <ThemedText type="title" style={styles.title}>
              {titles[step]}
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.subtitle}>
              {subtitles[step]}
            </ThemedText>

            {step !== 'success' && (
              <View style={styles.pinArea}>
                {step === 'current' && <PinCodeInput value={currentPin} onChange={handleCurrentPinChange} hasError={hasError} autoFocus />}
                {step === 'new' && <PinCodeInput value={newPin} onChange={handleNewPinChange} hasError={hasError} autoFocus />}
                {step === 'confirm' && (
                  <PinCodeInput value={confirmation} onChange={handleConfirmationChange} hasError={hasError} autoFocus />
                )}
              </View>
            )}

            <View style={styles.feedback}>
              {isSubmitting && <ActivityIndicator color={theme.tint} />}
              {error && (
                <ThemedText type="small" style={{ color: theme.danger }}>
                  {error}
                </ThemedText>
              )}
            </View>

            {step === 'confirm' && !isSubmitting && (
              <Pressable onPress={handleRestart} style={styles.backLink}>
                <ThemedText type="small" style={{ color: theme.tint, fontWeight: '700' }}>
                  Recommencer
                </ThemedText>
              </Pressable>
            )}

            {step === 'success' && (
              <Pressable onPress={() => router.back()} style={[styles.doneButton, { backgroundColor: theme.tint }]}>
                <ThemedText type="smallBold" style={{ color: theme.tintForeground }}>
                  Terminé
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
  doneButton: {
    marginTop: Spacing.five,
    width: '100%',
    borderRadius: 14,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
});

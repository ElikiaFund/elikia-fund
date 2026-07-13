import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { PinCodeInput } from '@/components/pin-code-input';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useVault } from '@/context/vault-context';
import { useTheme } from '@/hooks/use-theme';
import { ApiError } from '@/services/apiService';
import { vaultService } from '@/services/vaultService';

export default function VaultUnlockScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { unlock } = useVault();
  const [pin, setPin] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);

  function handleChange(text: string) {
    setPin(text);
    setError(null);
    setHasError(false);

    if (text.length === 4) {
      submit(text);
    }
  }

  async function submit(code: string) {
    setIsSubmitting(true);

    try {
      await vaultService.verifyPin(code);
      unlock();
      router.back();
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        router.replace('/vault-activate');
        return;
      }

      setError(e instanceof Error ? e.message : 'Une erreur est survenue. Veuillez réessayer.');
      setHasError(true);
      setPin('');
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
              Code PIN
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.subtitle}>
              Entrez votre code à 4 chiffres pour accéder au coffre.
            </ThemedText>

            <View style={styles.pinArea}>
              <PinCodeInput value={pin} onChange={handleChange} hasError={hasError} autoFocus />
            </View>

            <View style={styles.feedback}>
              {isSubmitting && <ActivityIndicator color={theme.tint} />}
              {error && (
                <ThemedText type="small" style={{ color: theme.danger }}>
                  {error}
                </ThemedText>
              )}
            </View>
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
});

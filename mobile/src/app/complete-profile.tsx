import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { FormField } from '@/components/form-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { profileService } from '@/services/profileService';

/**
 * One-time gate shown right after sign-in when `user.needs_name` is true — today this only ever
 * happens on Apple Sign-In, which shares the real name once, on the very first authorization for
 * a given Apple id + app (a repeat sign-in, e.g. after deleting/recreating the account during
 * testing, gets nothing back). Mirrors onboarding.tsx's own "wait for refreshUser() to land, then
 * navigate away" pattern rather than navigating immediately after the request resolves.
 */
export default function CompleteProfileScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user && !user.needs_name) {
      router.replace('/');
    }
  }, [user, router]);

  async function handleSubmit() {
    if (name.trim().length === 0) {
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await profileService.update({ name: name.trim(), email: user?.email ?? '', phone: user?.phone ?? null });
      await refreshUser();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Une erreur est survenue. Veuillez réessayer.');
      setIsSubmitting(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.content}>
            <ThemedText type="title" style={styles.title}>
              Comment vous appelez-vous ?
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.subtitle}>
              Apple ne nous a pas transmis votre nom cette fois-ci. Dites-nous comment vous appeler.
            </ThemedText>

            <FormField
              label="Nom complet"
              placeholder="Votre nom"
              autoCapitalize="words"
              autoFocus
              value={name}
              onChangeText={setName}
            />

            {error && (
              <View style={[styles.errorBox, { backgroundColor: theme.backgroundElement, borderColor: theme.danger }]}>
                <ThemedText type="small" style={{ color: theme.danger }}>
                  {error}
                </ThemedText>
              </View>
            )}

            <Pressable
              onPress={handleSubmit}
              disabled={name.trim().length === 0 || isSubmitting}
              style={[
                styles.button,
                { backgroundColor: theme.tint },
                (name.trim().length === 0 || isSubmitting) && styles.buttonDisabled,
              ]}
            >
              {isSubmitting ? (
                <ActivityIndicator color={theme.tintForeground} />
              ) : (
                <ThemedText type="smallBold" style={{ color: theme.tintForeground }}>
                  Continuer
                </ThemedText>
              )}
            </Pressable>
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
    width: '100%',
    maxWidth: 400,
    gap: Spacing.four,
  },
  title: {
    fontSize: 26,
    lineHeight: 32,
  },
  subtitle: {
    marginTop: -Spacing.two,
  },
  errorBox: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  button: {
    borderRadius: 14,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});

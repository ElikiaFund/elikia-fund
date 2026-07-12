import * as AppleAuthentication from 'expo-apple-authentication';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet } from 'react-native';
import { AccessToken, LoginManager } from 'react-native-fbsdk-next';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';

GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
});

export default function LoginScreen() {
  const { loginWithGoogle, loginWithApple, loginWithFacebook } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handle(action: () => Promise<void>) {
    setError(null);
    setIsSubmitting(true);

    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogle() {
    await handle(async () => {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();

      if (response.type !== 'success' || !response.data.idToken) {
        throw new Error('Connexion Google annulée.');
      }

      await loginWithGoogle(response.data.idToken);
    });
  }

  async function handleApple() {
    await handle(async () => {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
      });

      if (!credential.identityToken) {
        throw new Error('Connexion Apple annulée.');
      }

      const name = [credential.fullName?.givenName, credential.fullName?.familyName].filter(Boolean).join(' ') || undefined;

      await loginWithApple(credential.identityToken, name);
    });
  }

  async function handleFacebook() {
    await handle(async () => {
      const result = await LoginManager.logInWithPermissions(['public_profile', 'email']);

      if (result.isCancelled) {
        throw new Error('Connexion Facebook annulée.');
      }

      const accessToken = await AccessToken.getCurrentAccessToken();

      if (!accessToken) {
        throw new Error("Impossible de récupérer le jeton d'accès Facebook.");
      }

      await loginWithFacebook(accessToken.accessToken);
    });
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        Elikia Fund
      </ThemedText>
      <ThemedText type="subtitle" style={styles.subtitle}>
        Épargnez, suivez vos dépenses et cotisez en tontine — simplement.
      </ThemedText>

      <ThemedView style={styles.buttons}>
        <AuthButton label="Continuer avec Google" onPress={handleGoogle} disabled={isSubmitting} />
        {Platform.OS === 'ios' && <AuthButton label="Continuer avec Apple" onPress={handleApple} disabled={isSubmitting} />}
        <AuthButton label="Continuer avec Facebook" onPress={handleFacebook} disabled={isSubmitting} />
      </ThemedView>

      {isSubmitting && <ActivityIndicator style={styles.spinner} />}
      {error && (
        <ThemedText themeColor="textSecondary" style={styles.error}>
          {error}
        </ThemedText>
      )}
    </ThemedView>
  );
}

function AuthButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled: boolean }) {
  return (
    <Pressable style={[styles.button, disabled && styles.buttonDisabled]} onPress={onPress} disabled={disabled}>
      <ThemedText type="smallBold">{label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    marginTop: Spacing.two,
    marginBottom: Spacing.six,
  },
  buttons: {
    gap: Spacing.three,
  },
  button: {
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
    marginTop: Spacing.four,
  },
  error: {
    marginTop: Spacing.three,
    textAlign: 'center',
  },
});

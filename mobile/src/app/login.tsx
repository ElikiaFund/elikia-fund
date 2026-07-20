import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { useState, type ReactNode } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { AccessToken, LoginManager } from 'react-native-fbsdk-next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppleLogo } from '@/components/brand/apple-logo';
import { FacebookLogo } from '@/components/brand/facebook-logo';
import { GoogleLogo } from '@/components/brand/google-logo';
import { FormField } from '@/components/form-field';
import { SelectSheet } from '@/components/select-sheet';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Wordmark } from '@/components/wordmark';
import { COUNTRIES, DEFAULT_COUNTRY, formatLocalNumber, sanitizeLocalNumber, toE164, type Country } from '@/constants/countries';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';

GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
});

type Mode = 'login' | 'signup';
type LoadingAction = 'phone' | 'google' | 'apple' | 'facebook';

export default function LoginScreen() {
  const theme = useTheme();
  const { register, login, loginWithGoogle, loginWithApple, loginWithFacebook } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [country, setCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [isCountrySheetOpen, setIsCountrySheetOpen] = useState(false);
  const [localNumber, setLocalNumber] = useState('');
  const [password, setPassword] = useState('');
  const [loadingAction, setLoadingAction] = useState<LoadingAction | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isSubmitting = loadingAction !== null;
  const canSubmitPhone =
    sanitizeLocalNumber(localNumber, country).length === country.localLength &&
    password.length > 0 &&
    (mode === 'login' || name.trim().length > 0);

  async function handle(action: LoadingAction, run: () => Promise<void>) {
    setError(null);
    setLoadingAction(action);

    try {
      await run();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setLoadingAction(null);
    }
  }

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
  }

  async function handlePhoneAuth() {
    await handle('phone', async () => {
      const phone = toE164(localNumber, country);

      if (mode === 'signup') {
        await register(name.trim(), phone, password);
      } else {
        await login(phone, password);
      }
    });
  }

  async function handleGoogle() {
    await handle('google', async () => {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();

      if (response.type !== 'success' || !response.data.idToken) {
        throw new Error('Connexion Google annulée.');
      }

      await loginWithGoogle(response.data.idToken);
    });
  }

  async function handleApple() {
    await handle('apple', async () => {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
      });

      if (!credential.identityToken) {
        throw new Error('Connexion Apple annulée.');
      }

      const fullName = [credential.fullName?.givenName, credential.fullName?.familyName].filter(Boolean).join(' ') || undefined;

      await loginWithApple(credential.identityToken, fullName);
    });
  }

  async function handleFacebook() {
    await handle('facebook', async () => {
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
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={styles.flex}>
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            <View style={styles.content}>
              <View style={styles.brand}>
                <Wordmark size={34} style={styles.title} />
                <ThemedText themeColor="textSecondary" style={styles.subtitle}>
                  Épargnez, suivez vos dépenses et cotisez en tontine, simplement.
                </ThemedText>
              </View>

              <View style={[styles.segmented, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                <Pressable
                  onPress={() => switchMode('login')}
                  style={[styles.segment, mode === 'login' && { backgroundColor: theme.backgroundSelected }]}
                >
                  <ThemedText type="smallBold" themeColor={mode === 'login' ? 'text' : 'textSecondary'}>
                    Se connecter
                  </ThemedText>
                </Pressable>
                <Pressable
                  onPress={() => switchMode('signup')}
                  style={[styles.segment, mode === 'signup' && { backgroundColor: theme.backgroundSelected }]}
                >
                  <ThemedText type="smallBold" themeColor={mode === 'signup' ? 'text' : 'textSecondary'}>
                    Créer un compte
                  </ThemedText>
                </Pressable>
              </View>

              <View style={styles.form}>
                {mode === 'signup' && (
                  <FormField label="Nom complet" placeholder="Votre nom" autoCapitalize="words" value={name} onChangeText={setName} />
                )}
                <View style={styles.field}>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.fieldLabel}>
                    Numéro de téléphone
                  </ThemedText>
                  <View
                    style={[styles.phoneRow, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}
                  >
                    <Pressable onPress={() => setIsCountrySheetOpen(true)} style={styles.countryButton} hitSlop={8}>
                      <ThemedText type="smallBold">{country.dialCode}</ThemedText>
                      <Ionicons name="chevron-down" size={14} color={theme.textSecondary} />
                    </Pressable>
                    <View style={[styles.phoneDivider, { backgroundColor: theme.border }]} />
                    <TextInput
                      value={formatLocalNumber(localNumber, country)}
                      onChangeText={(text) => setLocalNumber(sanitizeLocalNumber(text, country))}
                      placeholder={country.placeholder}
                      placeholderTextColor={theme.textSecondary}
                      keyboardType="phone-pad"
                      style={[styles.phoneInput, { color: theme.text }]}
                    />
                  </View>
                </View>
                <FormField
                  label="Mot de passe"
                  placeholder="••••••••"
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />
              </View>

              <Pressable
                onPress={handlePhoneAuth}
                disabled={!canSubmitPhone || isSubmitting}
                style={({ pressed }) => [
                  styles.primaryButton,
                  { backgroundColor: theme.tint },
                  pressed && styles.primaryButtonPressed,
                  (!canSubmitPhone || isSubmitting) && styles.buttonDisabled,
                ]}
              >
                {loadingAction === 'phone' ? (
                  <ActivityIndicator color={theme.tintForeground} />
                ) : (
                  <ThemedText type="smallBold" style={{ color: theme.tintForeground }}>
                    {mode === 'login' ? 'Se connecter' : 'Créer un compte'}
                  </ThemedText>
                )}
              </Pressable>

              <SelectSheet
                visible={isCountrySheetOpen}
                title="Choisissez votre pays"
                options={COUNTRIES.map((c) => ({ label: `${c.name} (${c.dialCode})`, value: c.iso2 }))}
                selectedValue={country.iso2}
                onSelect={(iso2) => {
                  const next = COUNTRIES.find((c) => c.iso2 === iso2);
                  if (next) {
                    setCountry(next);
                    setLocalNumber('');
                  }
                }}
                onClose={() => setIsCountrySheetOpen(false)}
              />

              <View style={styles.divider}>
                <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
                <ThemedText type="small" themeColor="textSecondary">
                  ou continuer avec
                </ThemedText>
                <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
              </View>

              <View style={styles.buttons}>
                <AuthButton
                  label="Continuer avec Google"
                  icon={<GoogleLogo size={20} />}
                  onPress={handleGoogle}
                  disabled={isSubmitting}
                  loading={loadingAction === 'google'}
                />
                {Platform.OS === 'ios' && (
                  <AuthButton
                    label="Continuer avec Apple"
                    icon={<AppleLogo size={19} color={theme.text} />}
                    onPress={handleApple}
                    disabled={isSubmitting}
                    loading={loadingAction === 'apple'}
                  />
                )}
                <AuthButton
                  label="Continuer avec Facebook"
                  icon={<FacebookLogo size={20} />}
                  onPress={handleFacebook}
                  disabled={isSubmitting}
                  loading={loadingAction === 'facebook'}
                />
              </View>

              <View style={styles.feedback}>
                {error && (
                  <View style={[styles.errorBox, { backgroundColor: theme.backgroundElement, borderColor: theme.danger }]}>
                    <ThemedText type="small" style={[styles.errorText, { color: theme.danger }]}>
                      {error}
                    </ThemedText>
                  </View>
                )}
              </View>

              <Pressable onPress={() => switchMode(mode === 'login' ? 'signup' : 'login')} style={styles.toggleRow}>
                <ThemedText type="small" themeColor="textSecondary">
                  {mode === 'login' ? 'Pas de compte ? ' : 'Déjà un compte ? '}
                </ThemedText>
                <ThemedText type="small" style={{ color: theme.tint, fontWeight: '700' }}>
                  {mode === 'login' ? 'Créer un compte' : 'Se connecter'}
                </ThemedText>
              </Pressable>

              <ThemedText themeColor="textSecondary" type="small" style={styles.legal}>
                En continuant, vous acceptez nos conditions d&apos;utilisation et notre politique de confidentialité.
              </ThemedText>
            </View>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

function AuthButton({
  label,
  icon,
  onPress,
  disabled,
  loading,
}: {
  label: string;
  icon: ReactNode;
  onPress: () => void;
  disabled: boolean;
  loading?: boolean;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement, borderColor: theme.border },
        disabled && styles.buttonDisabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={theme.text} />
      ) : (
        <View style={styles.buttonContent}>
          <View style={styles.buttonIcon}>{icon}</View>
          <ThemedText type="smallBold">{label}</ThemedText>
        </View>
      )}
    </Pressable>
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
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.six,
  },
  content: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 400,
  },
  brand: {
    alignItems: 'center',
    marginBottom: Spacing.five,
  },
  title: {
    textAlign: 'center',
    lineHeight: 40,
  },
  subtitle: {
    textAlign: 'center',
    marginTop: Spacing.two,
    maxWidth: 280,
  },
  segmented: {
    flexDirection: 'row',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    padding: Spacing.half,
    marginBottom: Spacing.four,
  },
  segment: {
    flex: 1,
    borderRadius: 11,
    paddingVertical: Spacing.two,
    alignItems: 'center',
  },
  form: {
    gap: Spacing.three,
    marginBottom: Spacing.three,
  },
  field: {
    gap: Spacing.one,
  },
  fieldLabel: {
    marginLeft: Spacing.one,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
  },
  countryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
  },
  phoneDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    marginVertical: Spacing.two,
  },
  phoneInput: {
    flex: 1,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  primaryButton: {
    borderRadius: 14,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  primaryButtonPressed: {
    opacity: 0.9,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    marginVertical: Spacing.four,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  buttons: {
    gap: Spacing.three,
  },
  button: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
  },
  buttonIcon: {
    width: 22,
    alignItems: 'center',
  },
  feedback: {
    marginTop: Spacing.four,
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: 24,
  },
  errorBox: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  errorText: {
    textAlign: 'center',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.four,
  },
  legal: {
    textAlign: 'center',
    maxWidth: 320,
    alignSelf: 'center',
    marginTop: Spacing.five,
  },
});

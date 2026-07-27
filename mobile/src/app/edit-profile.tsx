import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { FormField } from '@/components/form-field';
import { SelectSheet } from '@/components/select-sheet';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { COUNTRIES, formatLocalNumber, parsePhone, sanitizeLocalNumber, toE164, type Country } from '@/constants/countries';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { profileService } from '@/services/profileService';

export default function EditProfileScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const initialPhone = parsePhone(user?.phone);
  const [country, setCountry] = useState<Country>(initialPhone.country);
  const [isCountrySheetOpen, setIsCountrySheetOpen] = useState(false);
  const [localNumber, setLocalNumber] = useState(initialPhone.localNumber);
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    name.trim().length > 0 &&
    email.trim().length > 0 &&
    (localNumber.length === 0 || localNumber.length === country.localLength) &&
    (!showPasswordFields || (currentPassword.length > 0 && password.length >= 8 && password === passwordConfirmation));

  async function handleSubmit() {
    setError(null);
    setIsSubmitting(true);

    try {
      await profileService.update({
        name: name.trim(),
        email: email.trim(),
        phone: localNumber.length > 0 ? toE164(localNumber, country) : null,
        ...(showPasswordFields
          ? { currentPassword, password, passwordConfirmation }
          : {}),
      });
      await refreshUser();
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.form}>
            <FormField label="Nom complet" autoCapitalize="words" value={name} onChangeText={setName} />
            <FormField
              label="Adresse e-mail"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            <View style={styles.field}>
              <ThemedText type="small" themeColor="textSecondary" style={styles.fieldLabel}>
                Numéro de téléphone
              </ThemedText>
              <View style={[styles.phoneRow, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
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
          </View>

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

          <Pressable onPress={() => setShowPasswordFields((v) => !v)} style={styles.passwordToggle}>
            <ThemedText type="small" style={{ color: theme.tint, fontWeight: '700' }}>
              {showPasswordFields ? 'Annuler le changement de mot de passe' : 'Changer le mot de passe'}
            </ThemedText>
          </Pressable>

          {showPasswordFields && (
            <View style={styles.form}>
              <FormField label="Mot de passe actuel" secureTextEntry value={currentPassword} onChangeText={setCurrentPassword} />
              <FormField label="Nouveau mot de passe" secureTextEntry value={password} onChangeText={setPassword} />
              <FormField
                label="Confirmer le nouveau mot de passe"
                secureTextEntry
                value={passwordConfirmation}
                onChangeText={setPasswordConfirmation}
              />
            </View>
          )}

          {error && (
            <View style={[styles.errorBox, { backgroundColor: theme.backgroundElement, borderColor: theme.danger }]}>
              <ThemedText type="small" style={{ color: theme.danger }}>
                {error}
              </ThemedText>
            </View>
          )}

          <Pressable
            onPress={handleSubmit}
            disabled={!canSubmit || isSubmitting}
            style={[styles.button, { backgroundColor: theme.tint }, (!canSubmit || isSubmitting) && styles.buttonDisabled]}
          >
            {isSubmitting ? (
              <ActivityIndicator color={theme.tintForeground} />
            ) : (
              <ThemedText type="smallBold" style={{ color: theme.tintForeground }}>
                Enregistrer
              </ThemedText>
            )}
          </Pressable>
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
    padding: Spacing.four,
  },
  form: {
    gap: Spacing.three,
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
  passwordToggle: {
    marginTop: Spacing.four,
    marginBottom: Spacing.two,
  },
  errorBox: {
    marginTop: Spacing.four,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  button: {
    marginTop: Spacing.five,
    borderRadius: 14,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});

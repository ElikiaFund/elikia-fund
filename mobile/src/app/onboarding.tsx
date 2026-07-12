import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { COMPANY_CATEGORIES, companyService, type CompanyCategory } from '@/services/companyService';

export default function OnboardingScreen() {
  const theme = useTheme();
  const { refreshUser } = useAuth();
  const [name, setName] = useState('');
  const [category, setCategory] = useState<CompanyCategory | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = name.trim().length > 0 && category !== null;

  async function handleSubmit() {
    if (!category) {
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await companyService.create(name.trim(), category);
      await refreshUser();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        Votre entreprise
      </ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.subtitle}>
        Configurons votre première entreprise pour personnaliser Elikia Fund.
      </ThemedText>

      <ThemedText type="small" style={styles.label}>
        Nom de l'entreprise
      </ThemedText>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Ex. Boutique Elikia"
        placeholderTextColor={theme.textSecondary}
        style={[styles.input, { color: theme.text, borderColor: theme.textSecondary }]}
      />

      <ThemedText type="small" style={styles.label}>
        Catégorie
      </ThemedText>
      <ThemedView style={styles.chips}>
        {COMPANY_CATEGORIES.map((option) => {
          const selected = category === option.value;

          return (
            <Pressable
              key={option.value}
              onPress={() => setCategory(option.value)}
              style={[
                styles.chip,
                { borderColor: theme.textSecondary },
                selected && { backgroundColor: theme.backgroundSelected, borderColor: theme.backgroundSelected },
              ]}>
              <ThemedText type="small">{option.label}</ThemedText>
            </Pressable>
          );
        })}
      </ThemedView>

      {error && (
        <ThemedText themeColor="textSecondary" style={styles.error}>
          {error}
        </ThemedText>
      )}

      {isSubmitting ? (
        <ActivityIndicator style={styles.spinner} />
      ) : (
        <Pressable style={[styles.button, !canSubmit && styles.buttonDisabled]} disabled={!canSubmit} onPress={handleSubmit}>
          <ThemedText type="smallBold">Continuer</ThemedText>
        </Pressable>
      )}
    </ThemedView>
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
  label: {
    marginBottom: Spacing.two,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
    marginBottom: Spacing.four,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  error: {
    marginTop: Spacing.four,
    textAlign: 'center',
  },
  button: {
    marginTop: Spacing.six,
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
    marginTop: Spacing.six,
  },
});

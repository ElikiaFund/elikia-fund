import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { FormField } from '@/components/form-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { groupService } from '@/services/groupService';

export default function GroupRenewRoundScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [goalText, setGoalText] = useState('');
  const [goalAmount, setGoalAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isSubmittingRef = useRef(false);

  const goalAmountValue = Number(goalAmount.replace(',', '.'));
  const canSubmit = goalText.trim().length > 0 && goalAmountValue > 0;

  async function handleSubmit() {
    if (!canSubmit || isSubmittingRef.current) {
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setError(null);

    try {
      await groupService.renewRound(Number(id), { text: goalText.trim(), targetAmount: goalAmountValue });
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Une erreur est survenue. Veuillez réessayer.');
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </Pressable>
        <ThemedText type="smallBold" style={styles.headerTitle}>
          Nouveau tour
        </ThemedText>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <ThemedText type="small" themeColor="textSecondary" style={styles.intro}>
          Ce tour est terminé. Définissez l&apos;objectif du prochain tour pour relancer les cotisations.
        </ThemedText>

        <FormField
          label="Objectif de ce tour"
          placeholder="Ex. Construire un projet immobilier"
          value={goalText}
          onChangeText={setGoalText}
        />

        <View>
          <ThemedText type="small" themeColor="textSecondary" style={styles.sectionLabel}>
            Montant cible
          </ThemedText>
          <View style={[styles.amountField, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
            <TextInput
              value={goalAmount}
              onChangeText={setGoalAmount}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={theme.textSecondary}
              style={[styles.amountInput, { color: theme.text }]}
            />
            <ThemedText type="small" themeColor="textSecondary">
              FCFA
            </ThemedText>
          </View>
        </View>

        {error && (
          <ThemedText type="small" style={[styles.error, { color: theme.danger }]}>
            {error}
          </ThemedText>
        )}

        <Pressable
          onPress={handleSubmit}
          disabled={!canSubmit || isSubmitting}
          style={[styles.submitButton, { backgroundColor: theme.tint }, (!canSubmit || isSubmitting) && styles.buttonDisabled]}
        >
          {isSubmitting ? (
            <ActivityIndicator color={theme.tintForeground} />
          ) : (
            <ThemedText type="smallBold" style={{ color: theme.tintForeground }}>
              Relancer le tour
            </ThemedText>
          )}
        </Pressable>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.six,
    paddingBottom: Spacing.three,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 22,
  },
  backButton: {
    width: 22,
  },
  scrollContent: {
    padding: Spacing.four,
    gap: Spacing.four,
  },
  intro: {
    marginBottom: Spacing.one,
    lineHeight: 18,
  },
  sectionLabel: {
    marginBottom: Spacing.two,
  },
  amountField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
  },
  amountInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    padding: 0,
  },
  error: {
    textAlign: 'center',
  },
  submitButton: {
    marginTop: Spacing.two,
    borderRadius: 14,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});

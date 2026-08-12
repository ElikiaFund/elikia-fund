import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';

import { FormField } from '@/components/form-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { groupService, type RecipientMode } from '@/services/groupService';

export default function GroupSettingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [autoPayoutEnabled, setAutoPayoutEnabled] = useState(true);
  const [recipientMode, setRecipientMode] = useState<RecipientMode | null>(null);
  const [goalText, setGoalText] = useState('');
  const [goalAmount, setGoalAmount] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingGoal, setIsSavingGoal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [goalError, setGoalError] = useState<string | null>(null);

  useEffect(() => {
    groupService
      .show(Number(id))
      .then((group) => {
        setAutoPayoutEnabled(group.auto_payout_enabled);
        setRecipientMode(group.recipient_mode);
        setGoalText(group.current_round_goal?.goal_text ?? '');
        setGoalAmount(group.current_round_goal ? String(Number(group.current_round_goal.target_amount)) : '');
      })
      .finally(() => setIsLoading(false));
  }, [id]);

  async function handleToggle(value: boolean) {
    setAutoPayoutEnabled(value);
    setError(null);
    setIsSaving(true);

    try {
      await groupService.updateSettings(Number(id), { auto_payout_enabled: value });
    } catch (e) {
      setAutoPayoutEnabled(!value);
      setError(e instanceof Error ? e.message : 'Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setIsSaving(false);
    }
  }

  const goalAmountValue = Number(goalAmount.replace(',', '.'));

  async function handleSaveGoal() {
    setGoalError(null);
    setIsSavingGoal(true);

    try {
      await groupService.updateSettings(Number(id), {
        goal_text: goalText.trim(),
        target_amount: goalAmountValue,
      });
    } catch (e) {
      setGoalError(e instanceof Error ? e.message : 'Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setIsSavingGoal(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <ThemedText type="title" style={styles.title}>
          Paramètres de la tontine
        </ThemedText>

        {isLoading ? (
          <ActivityIndicator color={theme.tint} style={styles.loader} />
        ) : (
          <View style={[styles.row, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <View style={styles.rowText}>
              <ThemedText type="smallBold">Versement automatique</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Verser la cagnotte dès que tous les membres ont cotisé, sans action manuelle. Vous restez averti par
                notification à chaque versement.
              </ThemedText>
            </View>
            <Switch
              value={autoPayoutEnabled}
              onValueChange={handleToggle}
              disabled={isSaving}
              trackColor={{ true: theme.tint }}
              thumbColor={theme.tintForeground}
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

        {!isLoading && recipientMode === 'creator' && (
          <View style={styles.goalSection}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.dangerZoneLabel}>
              Objectif du tour en cours
            </ThemedText>

            <FormField label="Objectif" placeholder="Ex. Construire un projet immobilier" value={goalText} onChangeText={setGoalText} />

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

            {goalError && (
              <ThemedText type="small" style={{ color: theme.danger }}>
                {goalError}
              </ThemedText>
            )}

            <Pressable
              onPress={handleSaveGoal}
              disabled={isSavingGoal || goalText.trim().length === 0 || goalAmountValue <= 0}
              style={[
                styles.saveGoalButton,
                { backgroundColor: theme.tint },
                (isSavingGoal || goalText.trim().length === 0 || goalAmountValue <= 0) && styles.buttonDisabled,
              ]}
            >
              {isSavingGoal ? (
                <ActivityIndicator color={theme.tintForeground} size="small" />
              ) : (
                <ThemedText type="smallBold" style={{ color: theme.tintForeground }}>
                  Enregistrer l&apos;objectif
                </ThemedText>
              )}
            </Pressable>
          </View>
        )}

        {!isLoading && (
          <View style={styles.dangerZone}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.dangerZoneLabel}>
              Zone dangereuse
            </ThemedText>
            <Pressable
              onPress={() => router.push({ pathname: '/group-delete-request', params: { id } })}
              style={[styles.dangerRow, { backgroundColor: theme.backgroundElement, borderColor: theme.danger }]}
            >
              <View style={styles.rowText}>
                <ThemedText type="smallBold" style={{ color: theme.danger }}>
                  Supprimer la tontine
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Nécessite l&apos;accord des autres membres — ils ont 48h pour approuver ou refuser.
                </ThemedText>
              </View>
              <Ionicons name="trash-outline" size={20} color={theme.danger} />
            </Pressable>
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.four,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
    marginBottom: Spacing.five,
  },
  loader: {
    marginTop: Spacing.six,
  },
  goalSection: {
    marginTop: Spacing.six,
    gap: Spacing.four,
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
  saveGoalButton: {
    borderRadius: 14,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    padding: Spacing.three,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  errorBox: {
    marginTop: Spacing.four,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  dangerZone: {
    marginTop: Spacing.six,
  },
  dangerZoneLabel: {
    marginLeft: Spacing.one,
    marginBottom: Spacing.two,
  },
  dangerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    padding: Spacing.three,
  },
});

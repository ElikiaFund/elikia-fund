import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { groupService } from '@/services/groupService';

export default function GroupSettingsScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [autoPayoutEnabled, setAutoPayoutEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    groupService
      .show(Number(id))
      .then((group) => setAutoPayoutEnabled(group.auto_payout_enabled))
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
});

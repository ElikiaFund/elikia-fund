import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatCycleLabel } from '@/lib/cycle-format';
import { buildTontineReportHtml, printAndShareHtml } from '@/lib/pdf';
import { groupService, type GroupReport } from '@/services/groupService';

const currency = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 });
const dateFormatter = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });

export default function GroupReportScreen() {
  const theme = useTheme();
  const { id, cycle } = useLocalSearchParams<{ id: string; cycle?: string }>();
  const [report, setReport] = useState<GroupReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    setError(null);

    groupService
      .report(Number(id), cycle || undefined)
      .then(setReport)
      .catch((e) => setError(e instanceof Error ? e.message : 'Une erreur est survenue. Veuillez réessayer.'))
      .finally(() => setIsLoading(false));
  }, [id, cycle]);

  async function handleExportPdf() {
    if (!report) {
      return;
    }

    setIsExporting(true);

    try {
      const html = buildTontineReportHtml({
        groupName: report.group_name,
        cyclePeriod: report.cycle_period,
        membersCount: report.members_count,
        paidCount: report.paid_count,
        lateCount: report.late_count,
        totalCollected: report.total_collected,
        totalFees: report.total_fees,
        totalNet: report.total_net,
        contributions: report.contributions,
        lateMembers: report.late_members.map((m) => m.name),
      });

      await printAndShareHtml(html, `Rapport-tontine-${report.cycle_period}.pdf`);
    } catch {
      Alert.alert('Erreur', 'Impossible de générer le rapport. Veuillez réessayer.');
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          headerRight: () =>
            report ? (
              isExporting ? (
                <ActivityIndicator color={theme.tint} style={styles.headerButton} />
              ) : (
                <Pressable onPress={handleExportPdf} hitSlop={8} style={styles.headerButton}>
                  <Ionicons name="download-outline" size={22} color={theme.tint} />
                </Pressable>
              )
            ) : null,
        }}
      />

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.tint} />
        </View>
      ) : error || !report ? (
        <View style={styles.centered}>
          <Ionicons name="cloud-offline-outline" size={28} color={theme.textSecondary} />
          <ThemedText themeColor="textSecondary" style={styles.centeredText}>
            {error ?? 'Rapport indisponible.'}
          </ThemedText>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="title" style={styles.title}>
            {report.group_name}
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.subtitle}>
            {formatCycleLabel(report, report.frequency)}
          </ThemedText>

          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
              <ThemedText type="small" themeColor="textSecondary">
                Cotisé (net)
              </ThemedText>
              <ThemedText type="smallBold" style={{ color: theme.income }}>
                {currency.format(report.total_net)}
              </ThemedText>
            </View>
            <View style={[styles.statCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
              <ThemedText type="small" themeColor="textSecondary">
                Frais de gestion
              </ThemedText>
              <ThemedText type="smallBold">{currency.format(report.total_fees)}</ThemedText>
            </View>
            <View style={[styles.statCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
              <ThemedText type="small" themeColor="textSecondary">
                Membres à jour
              </ThemedText>
              <ThemedText type="smallBold">
                {report.paid_count} / {report.members_count}
              </ThemedText>
            </View>
          </View>

          {report.late_members.length > 0 && (
            <View style={[styles.lateBanner, { backgroundColor: theme.backgroundElement, borderColor: theme.danger }]}>
              <Ionicons name="alert-circle-outline" size={16} color={theme.danger} />
              <ThemedText type="small" style={{ color: theme.danger, flex: 1 }}>
                En retard : {report.late_members.map((m) => m.name).join(', ')}
              </ThemedText>
            </View>
          )}

          <ThemedText type="smallBold" style={styles.sectionTitle}>
            Cotisations ({report.contributions.length})
          </ThemedText>

          {report.contributions.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
              Aucune cotisation pour ce cycle.
            </ThemedText>
          ) : (
            <View style={[styles.list, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
              {report.contributions.map((contribution, index) => (
                <View
                  key={`${contribution.user_id}-${contribution.paid_at}`}
                  style={[
                    styles.row,
                    index < report.contributions.length - 1 && {
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: theme.border,
                    },
                  ]}
                >
                  <View style={styles.rowContent}>
                    <ThemedText type="small">{contribution.user_name}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {dateFormatter.format(new Date(contribution.paid_at))} · net {currency.format(contribution.net_amount)}
                    </ThemedText>
                  </View>
                  <ThemedText type="smallBold" style={{ color: theme.income }}>
                    {currency.format(contribution.amount)}
                  </ThemedText>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerButton: {
    marginRight: Spacing.four,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    padding: Spacing.four,
  },
  centeredText: {
    textAlign: 'center',
  },
  content: {
    padding: Spacing.four,
  },
  title: {
    fontSize: 26,
    lineHeight: 32,
  },
  subtitle: {
    marginTop: Spacing.one,
    marginBottom: Spacing.four,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginBottom: Spacing.four,
  },
  statCard: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  lateBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    marginBottom: Spacing.four,
  },
  sectionTitle: {
    marginBottom: Spacing.two,
  },
  empty: {
    paddingVertical: Spacing.three,
  },
  list: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    padding: Spacing.three,
  },
  rowContent: {
    flex: 1,
    gap: 2,
  },
});

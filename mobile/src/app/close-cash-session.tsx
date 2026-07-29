import NetInfo from '@react-native-community/netinfo';
import { Ionicons } from '@expo/vector-icons';
import * as Crypto from 'expo-crypto';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { FormField } from '@/components/form-field';
import { StatGrid } from '@/components/stat-grid';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useCashSession } from '@/context/cash-session-context';
import { cacheSyncedCashSession, insertCashSession, type LocalCashSession } from '@/db/database';
import { useTheme } from '@/hooks/use-theme';
import { computeJournalStats } from '@/lib/journal-stats';
import { loadTransactions } from '@/lib/transactions';
import { cashSessionService } from '@/services/cashSessionService';

const currency = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 });
const dateTimeFormatter = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });

export default function CloseCashSessionScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string }>();
  // "Starting" a session and manually "closing" one are the same underlying checkpoint operation
  // (see CashSessionService::expectedBalance() — the next period's baseline is always just the
  // last checkpoint's counted_balance) — this screen only changes copy/emphasis between the two.
  const isStart = params.mode === 'start';
  const { user } = useAuth();
  const { lastClosedSession, recordClosedSession, markSessionStarted, markSessionClosed } = useCashSession();
  const [isLoading, setIsLoading] = useState(true);
  const [expectedBalance, setExpectedBalance] = useState(0);
  const [entryStats, setEntryStats] = useState({ totalIncome: 0, totalExpense: 0, count: 0 });
  const [countedBalance, setCountedBalance] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const periodStart = lastClosedSession?.closed_at ?? null;

  useEffect(() => {
    if (!user) {
      return;
    }

    const currentUser = user;
    let cancelled = false;

    async function load() {
      const [transactions, netState] = await Promise.all([loadTransactions(currentUser.id), NetInfo.fetch()]);

      if (cancelled) {
        return;
      }

      const periodEntries = transactions.filter((t) => !periodStart || t.occurred_at > periodStart);
      const openingBalance = lastClosedSession?.counted_balance ?? 0;
      const localStats = computeJournalStats(periodEntries, openingBalance);
      setEntryStats({ totalIncome: localStats.totalIncome, totalExpense: localStats.totalExpense, count: localStats.count });

      if (netState.isConnected) {
        try {
          const current = await cashSessionService.current();
          if (!cancelled) {
            setExpectedBalance(current.expected_balance);
          }
        } catch {
          if (!cancelled) {
            setExpectedBalance(localStats.closingBalance);
          }
        }
      } else {
        setExpectedBalance(localStats.closingBalance);
      }

      if (!cancelled) {
        setIsLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [user, lastClosedSession, periodStart]);

  const countedValue = Number(countedBalance.replace(',', '.'));
  const hasCountedValue = countedBalance.trim().length > 0 && !Number.isNaN(countedValue);
  const variance = hasCountedValue ? countedValue - expectedBalance : null;

  const { varianceColor, varianceLabel } = useMemo(() => {
    if (variance === null) {
      return { varianceColor: theme.textSecondary, varianceLabel: null };
    }
    if (variance === 0) {
      return { varianceColor: theme.textSecondary, varianceLabel: 'Aucun écart' };
    }
    return variance > 0
      ? { varianceColor: theme.income, varianceLabel: 'Excédent' }
      : { varianceColor: theme.danger, varianceLabel: 'Manquant' };
  }, [variance, theme]);

  // "Starting" and manually "closing" both persist a checkpoint the same way (see the isStart
  // comment above) — this only differs in which local "is a session active" marker they leave
  // behind, which is purely local/offline state, never synced to the backend.
  function applySessionState(local: LocalCashSession) {
    recordClosedSession(local);

    if (isStart) {
      markSessionStarted(local.closed_at);
    } else {
      markSessionClosed();
    }
  }

  async function handleConfirm() {
    if (!user || !hasCountedValue) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const now = new Date().toISOString();
    const payload = {
      uuid: Crypto.randomUUID(),
      period_start: periodStart,
      closed_at: now,
      expected_balance: expectedBalance,
      counted_balance: countedValue,
      notes: notes.trim() || null,
    };

    try {
      const netState = await NetInfo.fetch();

      if (netState.isConnected) {
        try {
          const remote = await cashSessionService.close(payload);
          const local: LocalCashSession = {
            uuid: remote.uuid,
            user_id: user.id,
            period_start: remote.period_start,
            closed_at: remote.closed_at,
            expected_balance: Number(remote.expected_balance),
            counted_balance: Number(remote.counted_balance),
            variance: Number(remote.variance),
            notes: remote.notes,
            synced: 1,
          };
          await cacheSyncedCashSession(local);
          applySessionState(local);
          router.back();
          return;
        } catch {
          // fall through to the offline path
        }
      }

      const local: LocalCashSession = { ...payload, user_id: user.id, variance: countedValue - expectedBalance, synced: 0 };
      await insertCashSession(local);
      applySessionState(local);
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.closeButton}>
          <Ionicons name="close" size={22} color={theme.text} />
        </Pressable>
      </View>

      {isLoading ? (
        <View style={[styles.container, styles.centered]}>
          <ActivityIndicator color={theme.tint} />
        </View>
      ) : (
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            <ThemedText type="title" style={styles.title}>
              {isStart ? 'Démarrer une session' : 'Clôturer la caisse'}
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.subtitle}>
              {isStart
                ? 'Indiquez le montant en caisse avant de commencer vos transactions.'
                : periodStart
                  ? `Depuis la dernière clôture, le ${dateTimeFormatter.format(new Date(periodStart))}`
                  : 'Depuis le début de votre activité'}
            </ThemedText>

            <View style={[styles.summaryCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
              <ThemedText type="small" themeColor="textSecondary">
                Solde attendu
              </ThemedText>
              <ThemedText type="title" style={styles.expectedBalance}>
                {currency.format(expectedBalance)}
              </ThemedText>

              <StatGrid
                variant="divided"
                stats={[
                  { label: 'Ventes', value: currency.format(entryStats.totalIncome), color: theme.income },
                  { label: 'Dépenses', value: currency.format(entryStats.totalExpense), color: theme.danger },
                  { label: 'Écritures', value: String(entryStats.count) },
                ]}
              />
            </View>

            <View style={styles.form}>
              <View>
                <ThemedText type="small" themeColor="textSecondary" style={styles.fieldLabel}>
                  {isStart ? 'Solde de départ' : 'Solde compté'}
                </ThemedText>
                <View style={[styles.amountRow, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
                  <TextInput
                    value={countedBalance}
                    onChangeText={setCountedBalance}
                    placeholder="0"
                    placeholderTextColor={theme.textSecondary}
                    keyboardType="decimal-pad"
                    autoFocus
                    style={[styles.amountInput, { color: theme.text }]}
                  />
                  <ThemedText themeColor="textSecondary">FCFA</ThemedText>
                </View>
              </View>

              {!isStart && varianceLabel && (
                <View style={[styles.varianceRow, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                  <ThemedText type="small" themeColor="textSecondary">
                    Écart · {varianceLabel}
                  </ThemedText>
                  <ThemedText type="smallBold" style={{ color: varianceColor }}>
                    {variance! > 0 ? '+' : ''}
                    {currency.format(variance ?? 0)}
                  </ThemedText>
                </View>
              )}

              <FormField
                label="Note (facultatif)"
                value={notes}
                onChangeText={setNotes}
                placeholder={isStart ? 'Ex. Fonds de caisse du matin' : 'Ex. Écart dû à la monnaie rendue'}
                multiline
              />
            </View>

            {error && (
              <View style={[styles.errorBox, { backgroundColor: theme.backgroundElement, borderColor: theme.danger }]}>
                <ThemedText type="small" style={{ color: theme.danger }}>
                  {error}
                </ThemedText>
              </View>
            )}

            <Pressable
              onPress={handleConfirm}
              disabled={!hasCountedValue || isSubmitting}
              style={[
                styles.button,
                { backgroundColor: theme.tint },
                (!hasCountedValue || isSubmitting) && styles.buttonDisabled,
              ]}
            >
              {isSubmitting ? (
                <ActivityIndicator color={theme.tintForeground} />
              ) : (
                <ThemedText type="smallBold" style={{ color: theme.tintForeground }}>
                  {isStart ? 'Démarrer la session' : 'Clôturer la caisse'}
                </ThemedText>
              )}
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  flex: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
  },
  closeButton: {
    padding: Spacing.one,
  },
  scrollContent: {
    padding: Spacing.four,
    paddingTop: Spacing.one,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
  },
  subtitle: {
    marginTop: Spacing.two,
    marginBottom: Spacing.four,
  },
  summaryCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: Spacing.four,
    marginBottom: Spacing.five,
  },
  expectedBalance: {
    fontSize: 34,
    lineHeight: 40,
    marginTop: Spacing.one,
    marginBottom: Spacing.four,
  },
  form: {
    gap: Spacing.four,
  },
  fieldLabel: {
    marginLeft: Spacing.one,
    marginBottom: Spacing.one,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingHorizontal: Spacing.three,
  },
  amountInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    paddingVertical: Spacing.three,
  },
  varianceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
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

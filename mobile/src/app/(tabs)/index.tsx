import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { CompanySelectSheet } from '@/components/company-select-sheet';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { categoryIcon, categoryLabel } from '@/constants/cashflow-categories';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useCashSession } from '@/context/cash-session-context';
import { useCompany } from '@/context/company-context';
import { useSync } from '@/context/sync-context';
import { type LocalTransaction } from '@/db/database';
import { useTheme } from '@/hooks/use-theme';
import { isSessionOverdue } from '@/lib/cash-session-schedule';
import { loadTransactions } from '@/lib/transactions';
import { creditScoreService, type CreditScore } from '@/services/creditScoreService';

const currency = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 });
const dateFormatter = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });
const timeFormatter = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });

const VERDICT_LABELS: Record<CreditScore['verdict'], string> = {
  eligible: 'Éligible au crédit',
  review: 'À examiner',
  not_eligible: 'Non éligible',
};

export default function CashflowScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { activeCompany, companies, isLoading: isCompanyLoading } = useCompany();
  const { pendingCount, isSyncing, syncNow, refreshPendingCount } = useSync();
  const { lastClosedSession, activeSession } = useCashSession();
  const [transactions, setTransactions] = useState<LocalTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [creditScore, setCreditScore] = useState<CreditScore | null>(null);
  const [isCompanySheetOpen, setIsCompanySheetOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!user || !activeCompany) {
        setIsLoading(false);
        return;
      }

      let cancelled = false;
      setIsLoading(true);
      refreshPendingCount();

      loadTransactions(activeCompany.id, user.id)
        .then((result) => {
          if (!cancelled) {
            setTransactions(result);
          }
        })
        .finally(() => {
          if (!cancelled) {
            setIsLoading(false);
          }
        });

      return () => {
        cancelled = true;
      };
    }, [user, activeCompany, refreshPendingCount]),
  );

  useEffect(() => {
    if (!activeCompany) {
      return;
    }

    creditScoreService.get(activeCompany.id).then(setCreditScore).catch(() => {});
  }, [activeCompany]);

  const { incomeTotal, expenseTotal, periodTransactionCount } = useMemo(() => {
    const periodTransactions = transactions.filter((t) => !lastClosedSession || t.occurred_at > lastClosedSession.closed_at);

    const totals = periodTransactions.reduce(
      (totals, transaction) => {
        if (transaction.type === 'income') {
          totals.incomeTotal += transaction.amount;
        } else {
          totals.expenseTotal += transaction.amount;
        }
        return totals;
      },
      { incomeTotal: 0, expenseTotal: 0 },
    );

    return { ...totals, periodTransactionCount: periodTransactions.length };
  }, [transactions, lastClosedSession]);

  const balance = (lastClosedSession?.counted_balance ?? 0) + incomeTotal - expenseTotal;
  const recentTransactions = transactions.slice(0, 5);
  // Nothing accumulated since the last close (or ever, if there's never been one) means there's
  // nothing to reconcile yet — don't nag to "close" a session that has no activity in it, even if
  // the reminder cadence has technically elapsed since account creation (isSessionOverdue's
  // fallback baseline when lastClosedSession is null). Also nothing to close if no session is open.
  const isOverdue =
    user && activeSession && periodTransactionCount > 0 ? isSessionOverdue(user, lastClosedSession, new Date()) : false;

  if (isCompanyLoading) {
    return (
      <ThemedView style={[styles.container, styles.centered]}>
        <ActivityIndicator color={theme.tint} />
      </ThemedView>
    );
  }

  if (!activeCompany) {
    const hasCompanies = companies.length > 0;

    return (
      <ThemedView style={[styles.container, styles.centered]}>
        <View style={[styles.badge, { backgroundColor: theme.backgroundElement }]}>
          <Ionicons name="business-outline" size={28} color={theme.tint} />
        </View>
        <ThemedText type="title" style={styles.title}>
          Aucune entreprise sélectionnée
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.subtitle}>
          {hasCompanies
            ? 'Choisissez une entreprise pour retrouver son tableau de bord.'
            : 'Créez votre première entreprise pour commencer à suivre vos finances.'}
        </ThemedText>
        <Pressable
          style={[styles.primaryButton, { backgroundColor: theme.tint }]}
          onPress={() => (hasCompanies ? setIsCompanySheetOpen(true) : router.push('/onboarding?mode=create'))}
        >
          <ThemedText type="smallBold" style={{ color: theme.tintForeground }}>
            {hasCompanies ? 'Choisir une entreprise' : 'Créer une entreprise'}
          </ThemedText>
        </Pressable>

        <CompanySelectSheet visible={isCompanySheetOpen} onClose={() => setIsCompanySheetOpen(false)} />
      </ThemedView>
    );
  }

  if (isLoading) {
    return (
      <ThemedView style={[styles.container, styles.centered]}>
        <ActivityIndicator color={theme.tint} />
      </ThemedView>
    );
  }

  const verdictColor =
    creditScore?.verdict === 'eligible' ? theme.income : creditScore?.verdict === 'not_eligible' ? theme.danger : theme.tint;

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {pendingCount > 0 && (
          <Pressable
            onPress={syncNow}
            disabled={isSyncing}
            style={[styles.syncBanner, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
          >
            {isSyncing ? (
              <ActivityIndicator size="small" color={theme.textSecondary} />
            ) : (
              <Ionicons name="cloud-upload-outline" size={16} color={theme.textSecondary} />
            )}
            <ThemedText type="small" themeColor="textSecondary" style={styles.syncBannerText}>
              {isSyncing
                ? 'Synchronisation en cours…'
                : `${pendingCount} transaction${pendingCount > 1 ? 's' : ''} en attente de synchronisation`}
            </ThemedText>
            {!isSyncing && (
              <ThemedText type="small" style={{ color: theme.tint, fontWeight: '700' }}>
                Réessayer
              </ThemedText>
            )}
          </Pressable>
        )}

        {isOverdue && (
          <Pressable
            onPress={() => router.push('/close-cash-session')}
            style={[styles.overdueBanner, { backgroundColor: theme.backgroundElement, borderColor: theme.tint }]}
          >
            <Ionicons name="alarm-outline" size={16} color={theme.tint} />
            <ThemedText type="small" style={styles.overdueBannerText}>
              Il est temps de clôturer votre caisse
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.tint, fontWeight: '700' }}>
              Clôturer
            </ThemedText>
          </Pressable>
        )}

        <View style={styles.balanceCard}>
          <ThemedText type="small" themeColor="textSecondary">
            Solde net
          </ThemedText>
          <ThemedText type="title" style={styles.balance}>
            {currency.format(balance)}
          </ThemedText>
          <View style={styles.balanceHintRow}>
            <ThemedText type="small" themeColor="textSecondary">
              {activeSession
                ? `Session active depuis ${timeFormatter.format(new Date(activeSession.started_at))}`
                : lastClosedSession
                  ? 'Depuis la dernière clôture'
                  : 'Depuis le début'}
            </ThemedText>
            {/* Starting a new session while one is already active is allowed — it doesn't require
                closing first, it just supersedes the active marker (see cash-session-context.tsx). */}
            <Pressable onPress={() => router.push(activeSession ? '/close-cash-session?mode=close' : '/close-cash-session?mode=start')}>
              <ThemedText type="small" style={{ color: theme.tint, fontWeight: '700' }}>
                {activeSession ? 'Clôturer' : 'Démarrer une session'}
              </ThemedText>
            </Pressable>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <View style={styles.statLabelRow}>
                <Ionicons name="arrow-up-circle-outline" size={16} color={theme.income} />
                <ThemedText type="small" themeColor="textSecondary">
                  Revenus
                </ThemedText>
              </View>
              <ThemedText type="smallBold" style={{ color: theme.income }}>
                {currency.format(incomeTotal)}
              </ThemedText>
            </View>
            <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
            <View style={styles.stat}>
              <View style={styles.statLabelRow}>
                <Ionicons name="arrow-down-circle-outline" size={16} color={theme.danger} />
                <ThemedText type="small" themeColor="textSecondary">
                  Dépenses
                </ThemedText>
              </View>
              <ThemedText type="smallBold" style={{ color: theme.danger }}>
                {currency.format(expenseTotal)}
              </ThemedText>
            </View>
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable
            style={[styles.actionButton, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
            onPress={() => router.push('/add-transaction?type=income')}
          >
            <Ionicons name="add-circle-outline" size={20} color={theme.income} />
            <ThemedText type="smallBold">Revenu</ThemedText>
          </Pressable>
          <Pressable
            style={[styles.actionButton, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
            onPress={() => router.push('/add-transaction?type=expense')}
          >
            <Ionicons name="remove-circle-outline" size={20} color={theme.danger} />
            <ThemedText type="smallBold">Dépense</ThemedText>
          </Pressable>
        </View>

        {creditScore && (
          <View style={[styles.creditCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <View style={styles.creditCardHeader}>
              <View>
                <ThemedText type="small" themeColor="textSecondary">
                  Score de crédit
                </ThemedText>
                <View style={styles.creditScoreRow}>
                  <ThemedText type="title" style={styles.creditScoreNumber}>
                    {creditScore.score}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {' '}
                    / 100
                  </ThemedText>
                </View>
              </View>
              <View style={[styles.verdictBadge, { borderColor: verdictColor }]}>
                <ThemedText type="small" style={{ color: verdictColor }}>
                  {VERDICT_LABELS[creditScore.verdict]}
                </ThemedText>
              </View>
            </View>
            <ThemedText type="small" themeColor="textSecondary" style={styles.creditCardHint}>
              Basé sur votre ancienneté, votre épargne et votre participation aux tontines.
            </ThemedText>
          </View>
        )}

        <View style={styles.sectionHeader}>
          <ThemedText type="smallBold">Transactions récentes</ThemedText>
          {transactions.length > 0 && (
            <Pressable onPress={() => router.push('/transactions')}>
              <ThemedText type="small" style={{ color: theme.tint, fontWeight: '700' }}>
                Voir tout
              </ThemedText>
            </Pressable>
          )}
        </View>

        {recentTransactions.length === 0 ? (
          <View style={styles.empty}>
            <View style={[styles.emptyBadge, { backgroundColor: theme.backgroundElement }]}>
              <Ionicons name="wallet-outline" size={26} color={theme.tint} />
            </View>
            <ThemedText themeColor="textSecondary" style={styles.emptyText}>
              Aucune transaction pour l&apos;instant. Ajoutez votre premier revenu ou dépense.
            </ThemedText>
          </View>
        ) : (
          <View style={styles.list}>
            {recentTransactions.map((transaction) => (
              <View key={transaction.uuid} style={[styles.row, { borderBottomColor: theme.border }]}>
                <View style={[styles.rowIcon, { backgroundColor: theme.backgroundElement }]}>
                  <Ionicons name={categoryIcon(transaction.category)} size={18} color={theme.textSecondary} />
                </View>
                <View style={styles.rowContent}>
                  <ThemedText type="smallBold">{categoryLabel(transaction.category)}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {transaction.note ? `${transaction.note} · ` : ''}
                    {dateFormatter.format(new Date(transaction.occurred_at))}
                  </ThemedText>
                </View>
                <ThemedText type="smallBold" style={{ color: transaction.type === 'income' ? theme.income : theme.danger }}>
                  {transaction.type === 'income' ? '+' : '−'} {currency.format(transaction.amount)}
                </ThemedText>
              </View>
            ))}
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
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  badge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.four,
  },
  title: {
    textAlign: 'center',
    fontSize: 26,
    lineHeight: 32,
  },
  subtitle: {
    textAlign: 'center',
    marginTop: Spacing.two,
    marginBottom: Spacing.five,
    maxWidth: 300,
  },
  primaryButton: {
    borderRadius: 14,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.five,
  },
  scrollContent: {
    padding: Spacing.four,
  },
  syncBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    marginBottom: Spacing.four,
  },
  syncBannerText: {
    flex: 1,
  },
  overdueBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    marginBottom: Spacing.four,
  },
  overdueBannerText: {
    flex: 1,
  },
  balanceCard: {
    marginBottom: Spacing.four,
  },
  balance: {
    fontSize: 40,
    lineHeight: 46,
    marginTop: Spacing.one,
  },
  balanceHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.four,
  },
  stat: {
    flex: 1,
    gap: Spacing.one,
  },
  statLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    height: 32,
    marginHorizontal: Spacing.three,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.three,
    marginBottom: Spacing.four,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingVertical: Spacing.three,
  },
  creditCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: Spacing.three,
    marginBottom: Spacing.five,
  },
  creditCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  creditScoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  creditScoreNumber: {
    fontSize: 30,
    lineHeight: 36,
  },
  verdictBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
  },
  creditCardHint: {
    marginTop: Spacing.two,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.two,
  },
  list: {
    gap: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowContent: {
    flex: 1,
    gap: 2,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: Spacing.six,
  },
  emptyBadge: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.three,
  },
  emptyText: {
    textAlign: 'center',
    maxWidth: 260,
  },
});

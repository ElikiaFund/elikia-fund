import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useCompany } from '@/context/company-context';
import { type LocalCashSession } from '@/db/database';
import { useTheme } from '@/hooks/use-theme';
import { loadCashSessions } from '@/lib/cash-sessions';

const currency = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 });
const dateTimeFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export default function CashSessionHistoryScreen() {
  const theme = useTheme();
  const { user } = useAuth();
  const { activeCompany } = useCompany();
  const [sessions, setSessions] = useState<LocalCashSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (!user || !activeCompany) {
        return;
      }

      let cancelled = false;
      setIsLoading(true);

      loadCashSessions(activeCompany.id, user.id)
        .then((result) => {
          if (!cancelled) {
            setSessions(result);
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
    }, [user, activeCompany]),
  );

  if (isLoading) {
    return (
      <ThemedView style={[styles.container, styles.centered]}>
        <ActivityIndicator color={theme.tint} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {sessions.length === 0 ? (
          <View style={styles.empty}>
            <View style={[styles.emptyBadge, { backgroundColor: theme.backgroundElement }]}>
              <Ionicons name="receipt-outline" size={26} color={theme.tint} />
            </View>
            <ThemedText themeColor="textSecondary" style={styles.emptyText}>
              Aucune clôture pour l&apos;instant. Elles apparaîtront ici une fois votre caisse clôturée.
            </ThemedText>
          </View>
        ) : (
          <View style={styles.list}>
            {sessions.map((session) => {
              const varianceColor = session.variance === 0 ? theme.textSecondary : session.variance > 0 ? theme.income : theme.danger;

              return (
                <View key={session.uuid} style={[styles.row, { borderBottomColor: theme.border }]}>
                  <View style={[styles.rowIcon, { backgroundColor: theme.backgroundElement }]}>
                    <Ionicons name="cash-outline" size={18} color={theme.textSecondary} />
                  </View>
                  <View style={styles.rowContent}>
                    <ThemedText type="smallBold">{dateTimeFormatter.format(new Date(session.closed_at))}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      Compté : {currency.format(session.counted_balance)}
                      {session.synced === 0 ? ' · En attente de synchronisation' : ''}
                    </ThemedText>
                  </View>
                  <ThemedText type="smallBold" style={{ color: varianceColor }}>
                    {session.variance > 0 ? '+' : ''}
                    {currency.format(session.variance)}
                  </ThemedText>
                </View>
              );
            })}
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
  },
  scrollContent: {
    padding: Spacing.four,
    flexGrow: 1,
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

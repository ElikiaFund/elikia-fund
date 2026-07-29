import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Calendar, type DateData } from 'react-native-calendars';

import { Pill } from '@/components/pill';
import { sheetStyles } from '@/components/select-sheet';
import { Skeleton } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { categoryIcon, categoryLabel, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/constants/cashflow-categories';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { type LocalTransaction } from '@/db/database';
import { useTheme } from '@/hooks/use-theme';
import { buildJournalCaisseHtml, printAndShareHtml } from '@/lib/pdf';
import { loadTransactions } from '@/lib/transactions';

const currency = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 });
const dateFormatter = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
const shortDateFormatter = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });
const longDateFormatter = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

function shortDate(iso: string) {
  return shortDateFormatter.format(new Date(iso));
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

/** Monday of the ISO week containing `date`, at 00:00. */
function startOfIsoWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfIsoWeek(date: Date): Date {
  const start = startOfIsoWeek(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

type TypeFilterValue = 'all' | 'income' | 'expense';
type PeriodPreset = 'all' | 'this_week' | 'last_week' | 'custom';

const TYPE_PILLS: { label: string; value: TypeFilterValue }[] = [
  { label: 'Tous', value: 'all' },
  { label: 'Revenus', value: 'income' },
  { label: 'Dépenses', value: 'expense' },
];

const PERIOD_PILLS: { label: string; value: Exclude<PeriodPreset, 'custom'> }[] = [
  { label: 'Tout', value: 'all' },
  { label: 'Cette semaine', value: 'this_week' },
  { label: 'Semaine dernière', value: 'last_week' },
];

const ALL_CATEGORIES = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES];
const PAGE_SIZE = 10;

export default function TransactionsScreen() {
  const theme = useTheme();
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<LocalTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const [typeFilter, setTypeFilter] = useState<TypeFilterValue>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('all');
  const [customRange, setCustomRange] = useState<{ start: string; end: string } | null>(null);
  const [page, setPage] = useState(0);

  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [draftStart, setDraftStart] = useState<string | null>(null);
  const [draftEnd, setDraftEnd] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!user) {
        return;
      }

      let cancelled = false;
      setIsLoading(true);

      loadTransactions(user.id)
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
    }, [user]),
  );

  const availableCategories = useMemo(() => {
    const present = new Set(transactions.map((t) => t.category));
    return ALL_CATEGORIES.filter((c) => present.has(c.value));
  }, [transactions]);

  // The concrete [start, end] boundary for the active period — null for 'all' (no date filter),
  // used both to filter the list and to describe the exported journal's exact date range.
  const periodBounds = useMemo(() => {
    const now = new Date();

    if (periodPreset === 'this_week') {
      return { start: startOfIsoWeek(now), end: endOfIsoWeek(now) };
    }
    if (periodPreset === 'last_week') {
      const lastWeek = new Date(now);
      lastWeek.setDate(now.getDate() - 7);
      return { start: startOfIsoWeek(lastWeek), end: endOfIsoWeek(lastWeek) };
    }
    if (periodPreset === 'custom' && customRange) {
      const start = new Date(customRange.start);
      start.setHours(0, 0, 0, 0);
      const end = new Date(customRange.end);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    return null;
  }, [periodPreset, customRange]);

  const filtered = useMemo(() => {
    return transactions.filter((transaction) => {
      if (typeFilter !== 'all' && transaction.type !== typeFilter) {
        return false;
      }
      if (categoryFilter !== 'all' && transaction.category !== categoryFilter) {
        return false;
      }

      if (periodBounds) {
        const occurred = new Date(transaction.occurred_at);
        if (occurred < periodBounds.start || occurred > periodBounds.end) {
          return false;
        }
      }

      return true;
    });
  }, [transactions, typeFilter, categoryFilter, periodBounds]);

  useEffect(() => {
    setPage(0);
  }, [typeFilter, categoryFilter, periodPreset, customRange]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Precise date-range label used both under the pills and as the exported document's subtitle
  // — always the real dates, regardless of which pill is active.
  const periodLabel = useMemo(() => {
    if (periodPreset === 'custom' && customRange) {
      return `${shortDate(customRange.start)} – ${shortDate(customRange.end)}`;
    }
    if (periodBounds) {
      return `${longDateFormatter.format(periodBounds.start)} au ${longDateFormatter.format(periodBounds.end)}`;
    }
    return 'Toutes les dates';
  }, [periodPreset, customRange, periodBounds]);

  async function handleExportPdf() {
    if (!user) {
      return;
    }

    setIsExporting(true);

    try {
      const rangeEnd = periodBounds?.end ?? new Date();
      const rangeStart = periodBounds?.start ?? (filtered.length ? new Date(Math.min(...filtered.map((t) => new Date(t.occurred_at).getTime()))) : rangeEnd);

      const openingBalance = transactions
        .filter((t) => new Date(t.occurred_at) < rangeStart)
        .reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0);

      const html = buildJournalCaisseHtml({
        userName: user.name,
        phone: user.phone,
        periodLabel,
        rangeStart: rangeStart.toISOString(),
        rangeEnd: rangeEnd.toISOString(),
        isWeekly: periodPreset === 'this_week' || periodPreset === 'last_week',
        openingBalance,
        entries: filtered.map((t) => ({
          occurred_at: t.occurred_at,
          category_label: categoryLabel(t.category),
          note: t.note,
          product_name: t.product_name,
          quantity: t.quantity,
          type: t.type,
          amount: t.amount,
        })),
      });

      await printAndShareHtml(html, `Journal-caisse-Elikia-Fund-${toDateKey(rangeEnd)}.pdf`);
    } catch {
      Alert.alert('Erreur', 'Impossible de générer le journal. Veuillez réessayer.');
    } finally {
      setIsExporting(false);
    }
  }

  function openCalendar() {
    setDraftStart(customRange?.start ?? null);
    setDraftEnd(customRange?.end ?? null);
    setIsCalendarOpen(true);
  }

  function handleDayPress(day: DateData) {
    if (!draftStart || (draftStart && draftEnd)) {
      setDraftStart(day.dateString);
      setDraftEnd(null);
    } else if (day.dateString < draftStart) {
      setDraftStart(day.dateString);
    } else {
      setDraftEnd(day.dateString);
    }
  }

  function applyCustomRange() {
    if (draftStart && draftEnd) {
      setCustomRange({ start: draftStart, end: draftEnd });
      setPeriodPreset('custom');
      setIsCalendarOpen(false);
    }
  }

  const markedDates = useMemo(() => {
    if (!draftStart) {
      return {};
    }
    if (!draftEnd) {
      return { [draftStart]: { startingDay: true, endingDay: true, color: theme.tint, textColor: theme.tintForeground } };
    }

    const marks: Record<string, { color: string; textColor: string; startingDay: boolean; endingDay: boolean }> = {};
    const cursor = new Date(draftStart);
    const endDate = new Date(draftEnd);

    while (cursor <= endDate) {
      const key = cursor.toISOString().slice(0, 10);
      marks[key] = { color: theme.tint, textColor: theme.tintForeground, startingDay: key === draftStart, endingDay: key === draftEnd };
      cursor.setDate(cursor.getDate() + 1);
    }

    return marks;
  }, [draftStart, draftEnd, theme.tint, theme.tintForeground]);

  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.list}>
          {Array.from({ length: 6 }).map((_, index) => (
            <TransactionRowSkeleton key={index} />
          ))}
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.filtersSection}>
        <View style={styles.pillRow}>
          {PERIOD_PILLS.map((preset) => (
            <Pill
              key={preset.value}
              label={preset.label}
              active={periodPreset === preset.value}
              onPress={() => {
                setPeriodPreset(preset.value);
                setCustomRange(null);
              }}
            />
          ))}
          <Pill
            label={periodPreset === 'custom' && customRange ? `${shortDate(customRange.start)} – ${shortDate(customRange.end)}` : 'Personnalisé'}
            active={periodPreset === 'custom'}
            icon="calendar-outline"
            onPress={openCalendar}
          />
        </View>

        <View style={styles.pillRow}>
          {TYPE_PILLS.map((option) => (
            <Pill key={option.value} label={option.label} active={typeFilter === option.value} onPress={() => setTypeFilter(option.value)} />
          ))}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRowScroll}>
          <Pill label="Toutes catégories" active={categoryFilter === 'all'} onPress={() => setCategoryFilter('all')} />
          {availableCategories.map((category) => (
            <Pill
              key={category.value}
              label={category.label}
              active={categoryFilter === category.value}
              onPress={() => setCategoryFilter(category.value)}
            />
          ))}
        </ScrollView>

        <Pressable
          onPress={handleExportPdf}
          disabled={isExporting || filtered.length === 0}
          style={[
            styles.exportButton,
            { backgroundColor: theme.tint },
            (isExporting || filtered.length === 0) && styles.buttonDisabled,
          ]}
        >
          {isExporting ? (
            <ActivityIndicator color={theme.tintForeground} />
          ) : (
            <>
              <Ionicons name="download-outline" size={18} color={theme.tintForeground} />
              <ThemedText type="smallBold" style={{ color: theme.tintForeground }}>
                Télécharger le Journal PDF
              </ThemedText>
            </>
          )}
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {paged.length === 0 ? (
          <View style={styles.empty}>
            <ThemedText themeColor="textSecondary">Aucune transaction pour ces filtres.</ThemedText>
          </View>
        ) : (
          paged.map((transaction) => (
            <View key={transaction.uuid} style={[styles.row, { borderBottomColor: theme.border }]}>
              <View style={[styles.rowIcon, { backgroundColor: theme.backgroundElement }]}>
                <Ionicons name={categoryIcon(transaction.category)} size={18} color={theme.textSecondary} />
              </View>
              <View style={styles.rowContent}>
                <ThemedText type="smallBold">{categoryLabel(transaction.category)}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {[
                    transaction.product_name
                      ? `${transaction.product_name}${transaction.quantity ? ` × ${transaction.quantity}` : ''}`
                      : null,
                    transaction.note,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                  {transaction.product_name || transaction.note ? ' · ' : ''}
                  {dateFormatter.format(new Date(transaction.occurred_at))}
                </ThemedText>
              </View>
              <ThemedText type="smallBold" style={{ color: transaction.type === 'income' ? theme.income : theme.danger }}>
                {transaction.type === 'income' ? '+' : '−'} {currency.format(transaction.amount)}
              </ThemedText>
            </View>
          ))
        )}

        {filtered.length > PAGE_SIZE && (
          <View style={[styles.pagination, { borderTopColor: theme.border }]}>
            <Pressable
              disabled={page === 0}
              onPress={() => setPage((p) => p - 1)}
              style={[styles.pageButton, { borderColor: theme.border }, page === 0 && styles.pageButtonDisabled]}
            >
              <Ionicons name="chevron-back" size={18} color={page === 0 ? theme.textSecondary : theme.tint} />
            </Pressable>
            <ThemedText type="small" themeColor="textSecondary">
              Page {page + 1} sur {totalPages}
            </ThemedText>
            <Pressable
              disabled={page >= totalPages - 1}
              onPress={() => setPage((p) => p + 1)}
              style={[styles.pageButton, { borderColor: theme.border }, page >= totalPages - 1 && styles.pageButtonDisabled]}
            >
              <Ionicons name="chevron-forward" size={18} color={page >= totalPages - 1 ? theme.textSecondary : theme.tint} />
            </Pressable>
          </View>
        )}
      </ScrollView>

      <Modal visible={isCalendarOpen} transparent animationType="slide" onRequestClose={() => setIsCalendarOpen(false)}>
        <View style={sheetStyles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setIsCalendarOpen(false)} />
          <View style={[sheetStyles.sheet, { backgroundColor: theme.background }]}>
            <View style={[sheetStyles.handle, { backgroundColor: theme.border }]} />
            <View style={styles.calendarHeader}>
              <ThemedText type="smallBold">Choisir une période</ThemedText>
            </View>
            <Calendar
              markingType="period"
              markedDates={markedDates}
              onDayPress={handleDayPress}
              maxDate={new Date().toISOString().slice(0, 10)}
              theme={{
                calendarBackground: theme.background,
                dayTextColor: theme.text,
                monthTextColor: theme.text,
                textDisabledColor: theme.border,
                arrowColor: theme.tint,
                todayTextColor: theme.tint,
              }}
            />
            <Pressable
              disabled={!draftStart || !draftEnd}
              onPress={applyCustomRange}
              style={[styles.applyButton, { backgroundColor: theme.tint }, (!draftStart || !draftEnd) && styles.buttonDisabled]}
            >
              <ThemedText type="smallBold" style={{ color: theme.tintForeground }}>
                Appliquer
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

function TransactionRowSkeleton() {
  const theme = useTheme();

  return (
    <View style={[styles.row, { borderBottomColor: theme.border }]}>
      <Skeleton width={38} height={38} borderRadius={12} />
      <View style={styles.rowContent}>
        <Skeleton width="60%" height={14} />
        <Skeleton width="40%" height={12} style={styles.skeletonGap} />
      </View>
      <Skeleton width={64} height={14} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    padding: Spacing.four,
    paddingTop: Spacing.three,
  },
  filtersSection: {
    gap: Spacing.two,
    padding: Spacing.four,
    paddingBottom: Spacing.three,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  pillRowScroll: {
    gap: Spacing.two,
    paddingRight: Spacing.four,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderRadius: 14,
    paddingVertical: Spacing.three,
    marginTop: Spacing.two,
  },
  buttonDisabled: {
    opacity: 0.5,
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
  skeletonGap: {
    marginTop: 2,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: Spacing.six,
  },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.four,
    paddingVertical: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  pageButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageButtonDisabled: {
    opacity: 0.4,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  applyButton: {
    borderRadius: 14,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    marginTop: Spacing.three,
  },
});

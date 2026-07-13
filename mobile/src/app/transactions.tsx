import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Calendar, type DateData } from 'react-native-calendars';

import { SelectSheet, sheetStyles, type SelectOption } from '@/components/select-sheet';
import { Skeleton } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { categoryIcon, categoryLabel, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/constants/cashflow-categories';
import { Spacing } from '@/constants/theme';
import { listTransactions, type LocalTransaction } from '@/db/database';
import { useTheme } from '@/hooks/use-theme';

const currency = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 });
const dateFormatter = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
const shortDateFormatter = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });

function shortDate(iso: string) {
  return shortDateFormatter.format(new Date(iso));
}

type TypeFilterValue = 'all' | 'income' | 'expense';
type PeriodPreset = 'all' | 'today' | 'week' | 'month' | 'custom';

const TYPE_OPTIONS: SelectOption[] = [
  { label: 'Tous les types', value: 'all' },
  { label: 'Revenus', value: 'income' },
  { label: 'Dépenses', value: 'expense' },
];

const PERIOD_PRESETS: { label: string; value: PeriodPreset }[] = [
  { label: 'Toutes les dates', value: 'all' },
  { label: "Aujourd'hui", value: 'today' },
  { label: '7 derniers jours', value: 'week' },
  { label: '30 derniers jours', value: 'month' },
];

const ALL_CATEGORIES = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES];
const PAGE_SIZE = 10;

export default function TransactionsScreen() {
  const theme = useTheme();
  const [transactions, setTransactions] = useState<LocalTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [typeFilter, setTypeFilter] = useState<TypeFilterValue>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('all');
  const [customRange, setCustomRange] = useState<{ start: string; end: string } | null>(null);
  const [page, setPage] = useState(0);

  const [activeSheet, setActiveSheet] = useState<'type' | 'category' | 'period' | null>(null);
  const [calendarMode, setCalendarMode] = useState(false);
  const [draftStart, setDraftStart] = useState<string | null>(null);
  const [draftEnd, setDraftEnd] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setIsLoading(true);

      listTransactions()
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
    }, []),
  );

  const availableCategories = useMemo(() => {
    const present = new Set(transactions.map((t) => t.category));
    return ALL_CATEGORIES.filter((c) => present.has(c.value));
  }, [transactions]);

  const categoryOptions: SelectOption[] = useMemo(
    () => [{ label: 'Toutes les catégories', value: 'all' }, ...availableCategories.map((c) => ({ label: c.label, value: c.value }))],
    [availableCategories],
  );

  const filtered = useMemo(() => {
    const now = new Date();
    let start: Date | null = null;

    if (periodPreset === 'today') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (periodPreset === 'week') {
      start = new Date(now);
      start.setDate(now.getDate() - 7);
    } else if (periodPreset === 'month') {
      start = new Date(now);
      start.setDate(now.getDate() - 30);
    }

    return transactions.filter((transaction) => {
      if (typeFilter !== 'all' && transaction.type !== typeFilter) {
        return false;
      }
      if (categoryFilter !== 'all' && transaction.category !== categoryFilter) {
        return false;
      }

      const occurred = new Date(transaction.occurred_at);

      if (periodPreset === 'custom' && customRange) {
        const rangeStart = new Date(customRange.start);
        const rangeEnd = new Date(customRange.end);
        rangeEnd.setHours(23, 59, 59, 999);
        if (occurred < rangeStart || occurred > rangeEnd) {
          return false;
        }
      } else if (start && occurred < start) {
        return false;
      }

      return true;
    });
  }, [transactions, typeFilter, categoryFilter, periodPreset, customRange]);

  useEffect(() => {
    setPage(0);
  }, [typeFilter, categoryFilter, periodPreset, customRange]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const periodLabel =
    periodPreset === 'custom' && customRange
      ? `${shortDate(customRange.start)} – ${shortDate(customRange.end)}`
      : (PERIOD_PRESETS.find((p) => p.value === periodPreset)?.label ?? 'Toutes les dates');
  const typeLabel = TYPE_OPTIONS.find((o) => o.value === typeFilter)?.label ?? 'Tous les types';
  const categoryLabelText = categoryOptions.find((o) => o.value === categoryFilter)?.label ?? 'Toutes les catégories';

  function openPeriodSheet() {
    setCalendarMode(false);
    setDraftStart(customRange?.start ?? null);
    setDraftEnd(customRange?.end ?? null);
    setActiveSheet('period');
  }

  function handlePeriodPreset(preset: PeriodPreset) {
    setPeriodPreset(preset);
    setCustomRange(null);
    setActiveSheet(null);
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
      setActiveSheet(null);
      setCalendarMode(false);
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
      <View style={styles.filterBar}>
        <FilterTrigger label={periodLabel} active={periodPreset !== 'all'} onPress={openPeriodSheet} />
        <FilterTrigger label={typeLabel} active={typeFilter !== 'all'} onPress={() => setActiveSheet('type')} />
        <FilterTrigger label={categoryLabelText} active={categoryFilter !== 'all'} onPress={() => setActiveSheet('category')} />
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
                  {transaction.note ? `${transaction.note} · ` : ''}
                  {dateFormatter.format(new Date(transaction.occurred_at))}
                </ThemedText>
              </View>
              <ThemedText type="smallBold" style={{ color: transaction.type === 'income' ? theme.income : theme.danger }}>
                {transaction.type === 'income' ? '+' : '−'} {currency.format(transaction.amount)}
              </ThemedText>
            </View>
          ))
        )}
      </ScrollView>

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

      <SelectSheet
        visible={activeSheet === 'type'}
        title="Type de transaction"
        options={TYPE_OPTIONS}
        selectedValue={typeFilter}
        onSelect={(value) => setTypeFilter(value as TypeFilterValue)}
        onClose={() => setActiveSheet(null)}
      />
      <SelectSheet
        visible={activeSheet === 'category'}
        title="Catégorie"
        options={categoryOptions}
        selectedValue={categoryFilter}
        onSelect={setCategoryFilter}
        onClose={() => setActiveSheet(null)}
      />

      <Modal visible={activeSheet === 'period'} transparent animationType="slide" onRequestClose={() => setActiveSheet(null)}>
        <View style={sheetStyles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setActiveSheet(null)} />
          <View style={[sheetStyles.sheet, { backgroundColor: theme.background }]}>
            <View style={[sheetStyles.handle, { backgroundColor: theme.border }]} />
            {!calendarMode ? (
              <>
                <ThemedText type="smallBold" style={styles.sheetTitle}>
                  Période
                </ThemedText>
                {PERIOD_PRESETS.map((preset) => (
                  <Pressable
                    key={preset.value}
                    onPress={() => handlePeriodPreset(preset.value)}
                    style={({ pressed }) => [styles.option, pressed && { backgroundColor: theme.backgroundElement }]}
                  >
                    <ThemedText style={periodPreset === preset.value ? { color: theme.tint, fontWeight: '700' } : undefined}>
                      {preset.label}
                    </ThemedText>
                    {periodPreset === preset.value && <Ionicons name="checkmark" size={20} color={theme.tint} />}
                  </Pressable>
                ))}
                <Pressable
                  onPress={() => setCalendarMode(true)}
                  style={({ pressed }) => [styles.option, pressed && { backgroundColor: theme.backgroundElement }]}
                >
                  <ThemedText style={periodPreset === 'custom' ? { color: theme.tint, fontWeight: '700' } : undefined}>
                    Personnalisé
                    {periodPreset === 'custom' && customRange ? ` (${shortDate(customRange.start)} – ${shortDate(customRange.end)})` : ''}
                  </ThemedText>
                  <Ionicons name="calendar-outline" size={18} color={theme.textSecondary} />
                </Pressable>
              </>
            ) : (
              <>
                <View style={styles.calendarHeader}>
                  <Pressable onPress={() => setCalendarMode(false)} hitSlop={8}>
                    <Ionicons name="arrow-back" size={20} color={theme.text} />
                  </Pressable>
                  <ThemedText type="smallBold">Choisir une période</ThemedText>
                  <View style={styles.calendarHeaderSpacer} />
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
              </>
            )}
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

function FilterTrigger({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={[styles.filterTrigger, { backgroundColor: theme.backgroundElement, borderColor: active ? theme.tint : theme.border }]}
    >
      <ThemedText type="small" numberOfLines={1} style={styles.filterTriggerLabel}>
        {label}
      </ThemedText>
      <Ionicons name="chevron-down" size={14} color={theme.textSecondary} />
    </Pressable>
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
  filterBar: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  filterTrigger: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.one,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
  },
  filterTriggerLabel: {
    flex: 1,
  },
  list: {
    padding: Spacing.four,
    paddingTop: 0,
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
  sheetTitle: {
    marginBottom: Spacing.two,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.three,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.two,
  },
  calendarHeaderSpacer: {
    width: 20,
  },
  applyButton: {
    borderRadius: 14,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    marginTop: Spacing.three,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});

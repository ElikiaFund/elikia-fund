import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { SelectSheet, type SelectOption } from '@/components/select-sheet';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useCashSession } from '@/context/cash-session-context';
import { useTheme } from '@/hooks/use-theme';
import { profileService } from '@/services/profileService';

const timeFormatter = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });

const WEEKDAYS: SelectOption[] = [
  { label: 'Lundi', value: '1' },
  { label: 'Mardi', value: '2' },
  { label: 'Mercredi', value: '3' },
  { label: 'Jeudi', value: '4' },
  { label: 'Vendredi', value: '5' },
  { label: 'Samedi', value: '6' },
  { label: 'Dimanche', value: '7' },
];

const TIME_OPTIONS: SelectOption[] = Array.from({ length: 33 }, (_, i) => {
  const totalMinutes = 6 * 60 + i * 30;
  const hh = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
  const mm = String(totalMinutes % 60).padStart(2, '0');
  return { label: `${hh}h${mm}`, value: `${hh}:${mm}` };
});

export default function CashSessionSettingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const { activeSession } = useCashSession();
  const [frequency, setFrequency] = useState<'daily' | 'weekly'>(user?.cash_session_frequency ?? 'daily');
  const [day, setDay] = useState<string | null>(user?.cash_session_day ? String(user.cash_session_day) : null);
  const [time, setTime] = useState(user?.cash_session_reminder_time?.slice(0, 5) ?? '20:00');
  const [remindersEnabled, setRemindersEnabled] = useState(user?.cash_session_reminders_enabled ?? true);
  const [isDayPickerOpen, setIsDayPickerOpen] = useState(false);
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dayLabel = useMemo(() => WEEKDAYS.find((option) => option.value === day)?.label ?? null, [day]);

  function handleFrequencyChange(next: 'daily' | 'weekly') {
    setFrequency(next);
    if (next === 'daily') {
      setDay(null);
    }
  }

  async function handleSubmit() {
    setError(null);
    setIsSubmitting(true);

    try {
      await profileService.updateCashSessionSettings({
        cash_session_frequency: frequency,
        cash_session_day: frequency === 'weekly' && day ? Number(day) : null,
        cash_session_reminder_time: time,
        cash_session_reminders_enabled: remindersEnabled,
      });
      await refreshUser();
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <ThemedText themeColor="textSecondary" style={styles.subtitle}>
          Définissez le rythme auquel vous souhaitez clôturer votre caisse et recevoir un rappel.
        </ThemedText>

        <View style={[styles.activeBanner, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <View style={[styles.activeDot, { backgroundColor: activeSession ? theme.income : theme.textSecondary }]} />
          <ThemedText type="small" themeColor="textSecondary">
            {activeSession
              ? `Session active depuis ${timeFormatter.format(new Date(activeSession.started_at))}`
              : 'Aucune session active'}
          </ThemedText>
        </View>

        <View style={styles.quickActions}>
          <Pressable
            onPress={() => router.push('/close-cash-session?mode=start')}
            style={[styles.quickActionButton, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
          >
            <Ionicons name="play-outline" size={18} color={theme.tint} />
            <ThemedText type="smallBold">Démarrer une session</ThemedText>
          </Pressable>
          <Pressable
            onPress={() => router.push('/close-cash-session?mode=close')}
            style={[styles.quickActionButton, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
          >
            <Ionicons name="checkmark-done-outline" size={18} color={theme.tint} />
            <ThemedText type="smallBold">Clôturer maintenant</ThemedText>
          </Pressable>
        </View>

        <View style={styles.form}>
          <View style={[styles.row, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <View style={styles.rowText}>
              <ThemedText type="smallBold">Rappels de clôture</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Recevoir une notification pour clôturer la caisse
              </ThemedText>
            </View>
            <Switch value={remindersEnabled} onValueChange={setRemindersEnabled} trackColor={{ true: theme.tint }} thumbColor={theme.tintForeground} />
          </View>

          <View>
            <ThemedText type="small" themeColor="textSecondary" style={styles.fieldLabel}>
              Fréquence
            </ThemedText>
            <View style={[styles.segmented, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
              <Pressable
                onPress={() => handleFrequencyChange('daily')}
                style={[styles.segment, frequency === 'daily' && { backgroundColor: theme.backgroundSelected }]}
              >
                <ThemedText type="smallBold" themeColor={frequency === 'daily' ? 'text' : 'textSecondary'}>
                  Quotidienne
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={() => handleFrequencyChange('weekly')}
                style={[styles.segment, frequency === 'weekly' && { backgroundColor: theme.backgroundSelected }]}
              >
                <ThemedText type="smallBold" themeColor={frequency === 'weekly' ? 'text' : 'textSecondary'}>
                  Hebdomadaire
                </ThemedText>
              </Pressable>
            </View>
          </View>

          <View>
            <ThemedText type="small" themeColor="textSecondary" style={styles.fieldLabel}>
              {frequency === 'weekly' ? 'Jour et heure du rappel' : 'Heure du rappel'}
            </ThemedText>
            <View style={styles.scheduleRow}>
              {frequency === 'weekly' && (
                <Pressable
                  onPress={() => setIsDayPickerOpen(true)}
                  style={[styles.scheduleField, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}
                >
                  <ThemedText themeColor={dayLabel ? 'text' : 'textSecondary'}>{dayLabel ?? 'Jour de la semaine'}</ThemedText>
                  <Ionicons name="chevron-down" size={16} color={theme.textSecondary} />
                </Pressable>
              )}
              <Pressable
                onPress={() => setIsTimePickerOpen(true)}
                style={[styles.scheduleField, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}
              >
                <ThemedText>{time.replace(':', 'h')}</ThemedText>
                <Ionicons name="chevron-down" size={16} color={theme.textSecondary} />
              </Pressable>
            </View>
            <ThemedText type="small" themeColor="textSecondary" style={styles.scheduleHint}>
              {frequency === 'weekly'
                ? dayLabel
                  ? `Tous les ${dayLabel.toLowerCase()}s à ${time.replace(':', 'h')}`
                  : `Chaque fin de semaine à ${time.replace(':', 'h')}`
                : `Tous les jours à ${time.replace(':', 'h')}`}
            </ThemedText>
          </View>

          <Pressable onPress={() => router.push('/cash-session-history')} style={styles.historyLink}>
            <ThemedText type="small" style={{ color: theme.tint, fontWeight: '700' }}>
              Voir l&apos;historique des clôtures
            </ThemedText>
            <Ionicons name="chevron-forward" size={16} color={theme.tint} />
          </Pressable>
        </View>

        {error && (
          <View style={[styles.errorBox, { backgroundColor: theme.backgroundElement, borderColor: theme.danger }]}>
            <ThemedText type="small" style={{ color: theme.danger }}>
              {error}
            </ThemedText>
          </View>
        )}

        <Pressable
          onPress={handleSubmit}
          disabled={isSubmitting}
          style={[styles.button, { backgroundColor: theme.tint }, isSubmitting && styles.buttonDisabled]}
        >
          {isSubmitting ? (
            <ActivityIndicator color={theme.tintForeground} />
          ) : (
            <ThemedText type="smallBold" style={{ color: theme.tintForeground }}>
              Enregistrer
            </ThemedText>
          )}
        </Pressable>
      </ScrollView>

      <SelectSheet
        visible={isDayPickerOpen}
        title="Jour de la semaine"
        options={WEEKDAYS}
        selectedValue={day ?? ''}
        onSelect={setDay}
        onClose={() => setIsDayPickerOpen(false)}
      />
      <SelectSheet
        visible={isTimePickerOpen}
        title="Heure"
        options={TIME_OPTIONS}
        selectedValue={time}
        onSelect={setTime}
        onClose={() => setIsTimePickerOpen(false)}
      />
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
  subtitle: {
    marginBottom: Spacing.five,
  },
  activeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    marginBottom: Spacing.four,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  quickActions: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginBottom: Spacing.five,
  },
  quickActionButton: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.one,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.two,
  },
  form: {
    gap: Spacing.four,
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
  fieldLabel: {
    marginLeft: Spacing.one,
    marginBottom: Spacing.one,
  },
  segmented: {
    flexDirection: 'row',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    padding: Spacing.half,
  },
  segment: {
    flex: 1,
    borderRadius: 11,
    paddingVertical: Spacing.two,
    alignItems: 'center',
  },
  scheduleRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  scheduleField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
  },
  scheduleHint: {
    marginTop: Spacing.two,
    marginLeft: Spacing.one,
  },
  historyLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    marginTop: Spacing.one,
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

import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { sheetStyles } from '@/components/select-sheet';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { groupService } from '@/services/groupService';

const currency = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 });
const dateFormatter = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
const timeFormatter = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });

export default function GroupRecordCashScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id, memberId, memberName, amount, cyclePeriod } = useLocalSearchParams<{
    id: string;
    memberId: string;
    memberName: string;
    amount: string;
    cyclePeriod: string;
  }>();

  const [amountText, setAmountText] = useState(amount ?? '');
  const [paidAt, setPaidAt] = useState(() => new Date());
  const [activePicker, setActivePicker] = useState<'date' | 'time' | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isSubmittingRef = useRef(false);

  const amountValue = Number(amountText.replace(',', '.'));
  const canSubmit = amountValue > 0 && confirmed;

  async function handleSubmit() {
    if (!canSubmit || isSubmittingRef.current) {
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setError(null);

    try {
      await groupService.recordContribution(Number(id), Number(memberId), {
        cyclePeriod: cyclePeriod || undefined,
        amount: amountValue,
        paidAt: paidAt.toISOString(),
      });
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
          Paiement en espèces
        </ThemedText>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <ThemedText type="small" themeColor="textSecondary">
            Membre
          </ThemedText>
          <ThemedText type="smallBold" style={styles.memberName}>
            {memberName}
          </ThemedText>
        </View>

        <ThemedText type="small" themeColor="textSecondary" style={styles.sectionLabel}>
          Montant reçu
        </ThemedText>
        <View style={[styles.amountField, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
          <ThemedText type="small" themeColor="textSecondary">
            FCFA
          </ThemedText>
          <TextInput
            value={amountText}
            onChangeText={setAmountText}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={theme.textSecondary}
            style={[styles.amountInput, { color: theme.text }]}
          />
        </View>

        <ThemedText type="small" themeColor="textSecondary" style={styles.sectionLabel}>
          Date et heure du paiement
        </ThemedText>
        <View style={styles.dateTimeRow}>
          <Pressable
            onPress={() => setActivePicker('date')}
            style={[styles.dateTimeField, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}
          >
            <Ionicons name="calendar-outline" size={16} color={theme.textSecondary} />
            <ThemedText type="small">{dateFormatter.format(paidAt)}</ThemedText>
          </Pressable>
          <Pressable
            onPress={() => setActivePicker('time')}
            style={[styles.dateTimeField, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}
          >
            <Ionicons name="time-outline" size={16} color={theme.textSecondary} />
            <ThemedText type="small">{timeFormatter.format(paidAt)}</ThemedText>
          </Pressable>
        </View>

        <Pressable onPress={() => setConfirmed((current) => !current)} style={styles.confirmRow}>
          <Ionicons
            name={confirmed ? 'checkbox' : 'square-outline'}
            size={22}
            color={confirmed ? theme.tint : theme.textSecondary}
          />
          <ThemedText type="small" themeColor="textSecondary" style={styles.confirmText}>
            Je confirme avoir reçu {currency.format(amountValue || 0)} en espèces de la part de {memberName}, versés à
            cette tontine.
          </ThemedText>
        </Pressable>

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
              Confirmer le paiement
            </ThemedText>
          )}
        </Pressable>
      </ScrollView>

      <DateTimeSheet
        mode={activePicker}
        value={paidAt}
        onChange={setPaidAt}
        onClose={() => setActivePicker(null)}
      />
    </ThemedView>
  );
}

function DateTimeSheet({
  mode,
  value,
  onChange,
  onClose,
}: {
  mode: 'date' | 'time' | null;
  value: Date;
  onChange: (next: Date) => void;
  onClose: () => void;
}) {
  const theme = useTheme();

  if (!mode) {
    return null;
  }

  // Android's native picker is a self-dismissing dialog — apply the change and close
  // immediately. iOS's spinner stays open inline until the user taps "Terminé" below.
  function handleChange(_event: unknown, selected?: Date) {
    if (!selected) {
      if (Platform.OS === 'android') {
        onClose();
      }
      return;
    }

    const next = new Date(value);
    if (mode === 'date') {
      next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
    } else {
      next.setHours(selected.getHours(), selected.getMinutes());
    }
    onChange(next);

    if (Platform.OS === 'android') {
      onClose();
    }
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={sheetStyles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[sheetStyles.sheet, { backgroundColor: theme.background }]}>
          <View style={[sheetStyles.handle, { backgroundColor: theme.border }]} />

          <DateTimePicker
            value={value}
            mode={mode}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            maximumDate={new Date()}
            onChange={handleChange}
          />

          {Platform.OS === 'ios' && (
            <Pressable onPress={onClose} style={[styles.doneButton, { backgroundColor: theme.tint }]}>
              <ThemedText type="smallBold" style={{ color: theme.tintForeground }}>
                Terminé
              </ThemedText>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
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
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: Spacing.four,
    marginBottom: Spacing.five,
  },
  memberName: {
    marginTop: 2,
    fontSize: 17,
  },
  sectionLabel: {
    marginBottom: Spacing.two,
  },
  amountField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    marginBottom: Spacing.five,
  },
  amountInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    padding: 0,
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginBottom: Spacing.five,
  },
  dateTimeField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
  },
  confirmRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
    marginBottom: Spacing.five,
  },
  confirmText: {
    flex: 1,
    lineHeight: 18,
  },
  error: {
    textAlign: 'center',
    marginBottom: Spacing.three,
  },
  submitButton: {
    borderRadius: 14,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  doneButton: {
    marginTop: Spacing.three,
    marginBottom: Spacing.four,
    borderRadius: 14,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
});

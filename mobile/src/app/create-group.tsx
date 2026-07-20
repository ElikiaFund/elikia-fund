import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { FormField } from '@/components/form-field';
import { SelectSheet, type SelectOption } from '@/components/select-sheet';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { groupService, TONTINE_MANAGEMENT_FEE_RATE, type GroupFrequency, type RecipientMode } from '@/services/groupService';

const WEEKDAYS: SelectOption[] = [
  { label: 'Lundi', value: '1' },
  { label: 'Mardi', value: '2' },
  { label: 'Mercredi', value: '3' },
  { label: 'Jeudi', value: '4' },
  { label: 'Vendredi', value: '5' },
  { label: 'Samedi', value: '6' },
  { label: 'Dimanche', value: '7' },
];

const MONTH_DAYS: SelectOption[] = Array.from({ length: 31 }, (_, i) => ({ label: `Le ${i + 1}`, value: String(i + 1) }));

const TIME_OPTIONS: SelectOption[] = Array.from({ length: 33 }, (_, i) => {
  const totalMinutes = 6 * 60 + i * 30;
  const hh = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
  const mm = String(totalMinutes % 60).padStart(2, '0');
  return { label: `${hh}h${mm}`, value: `${hh}:${mm}` };
});

const RECIPIENT_MODES: { value: RecipientMode; title: string; description: string }[] = [
  { value: 'join_order', title: 'Rotation par arrivée', description: "Le bénéficiaire de chaque cycle est déterminé selon l'ordre d'adhésion à la tontine." },
  { value: 'predefined', title: 'Rotation prédéfinie', description: "L'ordre des bénéficiaires est fixé dès le départ et chaque membre reçoit à son tour." },
  { value: 'random', title: 'Tirage au sort', description: 'Un membre est choisi aléatoirement pour recevoir la cagnotte, puis exclu du tirage jusqu’au prochain tour complet.' },
  { value: 'admin', title: "Désignation par l'administrateur", description: "Vous choisissez vous-même qui reçoit la cagnotte à chaque cycle." },
];

export default function CreateGroupScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState<GroupFrequency>('monthly');
  const [maxMembers, setMaxMembers] = useState('');
  const [contributionDay, setContributionDay] = useState<string | null>(null);
  const [contributionTime, setContributionTime] = useState<string | null>(null);
  const [recipientMode, setRecipientMode] = useState<RecipientMode>('join_order');
  const [isDayPickerOpen, setIsDayPickerOpen] = useState(false);
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amountValue = Number(amount.replace(',', '.'));
  const maxMembersValue = maxMembers.trim().length > 0 ? Number(maxMembers) : 1000;
  const canSubmit = name.trim().length > 0 && amountValue > 0 && maxMembersValue >= 2 && maxMembersValue <= 1000;
  const dayOptions = frequency === 'weekly' ? WEEKDAYS : MONTH_DAYS;
  const dayLabel = useMemo(
    () => dayOptions.find((option) => option.value === contributionDay)?.label ?? null,
    [dayOptions, contributionDay],
  );

  function handleFrequencyChange(next: GroupFrequency) {
    setFrequency(next);
    setContributionDay(null);
  }

  async function handleSubmit() {
    setError(null);
    setIsSubmitting(true);

    try {
      const group = await groupService.create(
        name.trim(),
        amountValue,
        frequency,
        maxMembersValue,
        { day: contributionDay ? Number(contributionDay) : null, time: contributionTime },
        recipientMode,
      );
      router.replace({ pathname: '/group/[id]', params: { id: String(group.id) } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <ThemedText type="title" style={styles.title}>
            Créer une tontine
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.subtitle}>
            Définissez le montant et le rythme des cotisations. Vous pourrez inviter des membres ensuite.
          </ThemedText>

          <View style={styles.form}>
            <FormField label="Nom de la tontine" placeholder="Ex. Tontine des Commerçantes" value={name} onChangeText={setName} />

            <View>
              <ThemedText type="small" themeColor="textSecondary" style={styles.fieldLabel}>
                Montant par cotisation
              </ThemedText>
              <View style={[styles.amountRow, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
                <TextInput
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="0"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="decimal-pad"
                  style={[styles.amountInput, { color: theme.text }]}
                />
                <ThemedText themeColor="textSecondary">FCFA</ThemedText>
              </View>
            </View>

            <View>
              <ThemedText type="small" themeColor="textSecondary" style={styles.fieldLabel}>
                Fréquence
              </ThemedText>
              <View style={[styles.segmented, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                <Pressable
                  onPress={() => handleFrequencyChange('weekly')}
                  style={[styles.segment, frequency === 'weekly' && { backgroundColor: theme.backgroundSelected }]}
                >
                  <ThemedText type="smallBold" themeColor={frequency === 'weekly' ? 'text' : 'textSecondary'}>
                    Hebdomadaire
                  </ThemedText>
                </Pressable>
                <Pressable
                  onPress={() => handleFrequencyChange('monthly')}
                  style={[styles.segment, frequency === 'monthly' && { backgroundColor: theme.backgroundSelected }]}
                >
                  <ThemedText type="smallBold" themeColor={frequency === 'monthly' ? 'text' : 'textSecondary'}>
                    Mensuelle
                  </ThemedText>
                </Pressable>
              </View>
            </View>

            <View>
              <ThemedText type="small" themeColor="textSecondary" style={styles.fieldLabel}>
                Jour et heure de cotisation (optionnel)
              </ThemedText>
              <View style={styles.scheduleRow}>
                <Pressable
                  onPress={() => setIsDayPickerOpen(true)}
                  style={[styles.scheduleField, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}
                >
                  <ThemedText themeColor={dayLabel ? 'text' : 'textSecondary'}>
                    {dayLabel ?? (frequency === 'weekly' ? 'Jour de la semaine' : 'Jour du mois')}
                  </ThemedText>
                  <Ionicons name="chevron-down" size={16} color={theme.textSecondary} />
                </Pressable>
                <Pressable
                  onPress={() => setIsTimePickerOpen(true)}
                  style={[styles.scheduleField, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}
                >
                  <ThemedText themeColor={contributionTime ? 'text' : 'textSecondary'}>
                    {contributionTime ? contributionTime.replace(':', 'h') : 'Heure'}
                  </ThemedText>
                  <Ionicons name="chevron-down" size={16} color={theme.textSecondary} />
                </Pressable>
              </View>
              {dayLabel && contributionTime && (
                <ThemedText type="small" themeColor="textSecondary" style={styles.scheduleHint}>
                  {frequency === 'weekly'
                    ? `Tous les ${dayLabel.toLowerCase()}s à ${contributionTime.replace(':', 'h')}`
                    : `${dayLabel} du mois à ${contributionTime.replace(':', 'h')}`}
                </ThemedText>
              )}
            </View>

            <View>
              <ThemedText type="small" themeColor="textSecondary" style={styles.fieldLabel}>
                Nombre de participants (optionnel, max 1000)
              </ThemedText>
              <View style={[styles.amountRow, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
                <TextInput
                  value={maxMembers}
                  onChangeText={(text) => setMaxMembers(text.replace(/[^0-9]/g, ''))}
                  placeholder="1000"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="number-pad"
                  style={[styles.amountInput, { color: theme.text }]}
                />
                <ThemedText themeColor="textSecondary">participants</ThemedText>
              </View>
            </View>

            <View>
              <ThemedText type="small" themeColor="textSecondary" style={styles.fieldLabel}>
                Comment désigner le bénéficiaire de chaque cycle ?
              </ThemedText>
              <View style={styles.recipientModes}>
                {RECIPIENT_MODES.map((mode) => {
                  const selected = recipientMode === mode.value;

                  return (
                    <Pressable
                      key={mode.value}
                      onPress={() => setRecipientMode(mode.value)}
                      style={[
                        styles.recipientCard,
                        { backgroundColor: theme.backgroundElement, borderColor: selected ? theme.tint : theme.border },
                      ]}
                    >
                      <View style={styles.recipientCardText}>
                        <ThemedText type="smallBold">{mode.title}</ThemedText>
                        <ThemedText type="small" themeColor="textSecondary" style={styles.recipientCardDescription}>
                          {mode.description}
                        </ThemedText>
                      </View>
                      <Ionicons
                        name={selected ? 'radio-button-on' : 'radio-button-off'}
                        size={20}
                        color={selected ? theme.tint : theme.textSecondary}
                      />
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>

          <View style={[styles.feeNotice, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <ThemedText type="small" themeColor="textSecondary">
              Des frais de gestion de {TONTINE_MANAGEMENT_FEE_RATE * 100}% seront automatiquement retirés de chaque
              cotisation versée dans cette tontine.
            </ThemedText>
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
            disabled={!canSubmit || isSubmitting}
            style={[styles.button, { backgroundColor: theme.tint }, (!canSubmit || isSubmitting) && styles.buttonDisabled]}
          >
            {isSubmitting ? (
              <ActivityIndicator color={theme.tintForeground} />
            ) : (
              <ThemedText type="smallBold" style={{ color: theme.tintForeground }}>
                Créer la tontine
              </ThemedText>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      <SelectSheet
        visible={isDayPickerOpen}
        title={frequency === 'weekly' ? 'Jour de la semaine' : 'Jour du mois'}
        options={dayOptions}
        selectedValue={contributionDay ?? ''}
        onSelect={setContributionDay}
        onClose={() => setIsDayPickerOpen(false)}
      />
      <SelectSheet
        visible={isTimePickerOpen}
        title="Heure"
        options={TIME_OPTIONS}
        selectedValue={contributionTime ?? ''}
        onSelect={setContributionTime}
        onClose={() => setIsTimePickerOpen(false)}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.four,
    paddingTop: Spacing.six,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
  },
  subtitle: {
    marginTop: Spacing.two,
    marginBottom: Spacing.five,
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
  recipientModes: {
    gap: Spacing.two,
  },
  recipientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderWidth: 1.5,
    borderRadius: 14,
    padding: Spacing.three,
  },
  recipientCardText: {
    flex: 1,
    gap: 2,
  },
  recipientCardDescription: {
    lineHeight: 18,
  },
  amountInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    paddingVertical: Spacing.three,
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
  feeNotice: {
    marginTop: Spacing.four,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
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

import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { FormField } from '@/components/form-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { groupService, type GroupFrequency } from '@/services/groupService';

export default function CreateGroupScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState<GroupFrequency>('monthly');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amountValue = Number(amount.replace(',', '.'));
  const canSubmit = name.trim().length > 0 && amountValue > 0;

  async function handleSubmit() {
    setError(null);
    setIsSubmitting(true);

    try {
      const group = await groupService.create(name.trim(), amountValue, frequency);
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
                  onPress={() => setFrequency('weekly')}
                  style={[styles.segment, frequency === 'weekly' && { backgroundColor: theme.backgroundSelected }]}
                >
                  <ThemedText type="smallBold" themeColor={frequency === 'weekly' ? 'text' : 'textSecondary'}>
                    Hebdomadaire
                  </ThemedText>
                </Pressable>
                <Pressable
                  onPress={() => setFrequency('monthly')}
                  style={[styles.segment, frequency === 'monthly' && { backgroundColor: theme.backgroundSelected }]}
                >
                  <ThemedText type="smallBold" themeColor={frequency === 'monthly' ? 'text' : 'textSecondary'}>
                    Mensuelle
                  </ThemedText>
                </Pressable>
              </View>
            </View>
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

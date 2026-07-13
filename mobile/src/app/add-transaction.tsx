import { Ionicons } from '@expo/vector-icons';
import * as Crypto from 'expo-crypto';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { FormField } from '@/components/form-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/constants/cashflow-categories';
import { Spacing } from '@/constants/theme';
import { insertTransaction } from '@/db/database';
import { useTheme } from '@/hooks/use-theme';

type TransactionType = 'income' | 'expense';

export default function AddTransactionScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ type?: string }>();
  const [type, setType] = useState<TransactionType>(params.type === 'income' ? 'income' : 'expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const amountValue = Number(amount.replace(',', '.'));
  const canSubmit = amountValue > 0 && category !== null;

  function switchType(next: TransactionType) {
    setType(next);
    setCategory(null);
  }

  async function handleSubmit() {
    if (!category) {
      return;
    }

    setIsSubmitting(true);

    const now = new Date().toISOString();

    try {
      await insertTransaction({
        uuid: Crypto.randomUUID(),
        type,
        amount: amountValue,
        category,
        note: note.trim() || null,
        occurred_at: now,
        created_at: now,
        synced: 0,
      });
      router.back();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={[styles.segmented, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <Pressable
              onPress={() => switchType('expense')}
              style={[styles.segment, type === 'expense' && { backgroundColor: theme.backgroundSelected }]}
            >
              <ThemedText type="smallBold" themeColor={type === 'expense' ? 'danger' : 'textSecondary'}>
                Dépense
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={() => switchType('income')}
              style={[styles.segment, type === 'income' && { backgroundColor: theme.backgroundSelected }]}
            >
              <ThemedText type="smallBold" themeColor={type === 'income' ? 'income' : 'textSecondary'}>
                Revenu
              </ThemedText>
            </Pressable>
          </View>

          <View style={styles.amountRow}>
            <ThemedText type="title" style={[styles.currencySign, { color: theme.textSecondary }]}>
              FCFA
            </ThemedText>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              placeholder="0"
              placeholderTextColor={theme.textSecondary}
              keyboardType="decimal-pad"
              autoFocus
              style={[styles.amountInput, { color: theme.text }]}
            />
          </View>

          <ThemedText type="small" themeColor="textSecondary" style={styles.sectionLabel}>
            Catégorie
          </ThemedText>
          <View style={styles.grid}>
            {categories.map((option) => {
              const selected = category === option.value;

              return (
                <Pressable
                  key={option.value}
                  onPress={() => setCategory(option.value)}
                  style={[
                    styles.card,
                    { backgroundColor: theme.backgroundElement, borderColor: selected ? theme.tint : theme.border },
                    selected && { backgroundColor: theme.backgroundSelected },
                  ]}
                >
                  <Ionicons name={option.icon} size={20} color={selected ? theme.tint : theme.textSecondary} />
                  <ThemedText type="small" themeColor={selected ? 'text' : 'textSecondary'}>
                    {option.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.noteField}>
            <FormField label="Note (facultatif)" value={note} onChangeText={setNote} placeholder="Ex. Marché du lundi" />
          </View>

          <Pressable
            onPress={handleSubmit}
            disabled={!canSubmit || isSubmitting}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: theme.tint },
              pressed && styles.buttonPressed,
              (!canSubmit || isSubmitting) && styles.buttonDisabled,
            ]}
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
    flexGrow: 1,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.five,
  },
  segmented: {
    flexDirection: 'row',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    padding: Spacing.half,
    marginBottom: Spacing.five,
  },
  segment: {
    flex: 1,
    borderRadius: 11,
    paddingVertical: Spacing.two,
    alignItems: 'center',
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.five,
  },
  currencySign: {
    fontSize: 20,
  },
  amountInput: {
    borderWidth: 0,
    backgroundColor: 'transparent',
    fontSize: 44,
    fontWeight: '700',
    paddingHorizontal: 0,
    paddingVertical: 0,
    minWidth: 80,
    textAlign: 'center',
  },
  sectionLabel: {
    marginLeft: Spacing.one,
    marginBottom: Spacing.two,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  card: {
    flexBasis: '30%',
    flexGrow: 1,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.two,
    alignItems: 'center',
    gap: Spacing.one,
  },
  noteField: {
    marginTop: Spacing.four,
  },
  button: {
    marginTop: Spacing.five,
    borderRadius: 14,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  buttonPressed: {
    opacity: 0.9,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});

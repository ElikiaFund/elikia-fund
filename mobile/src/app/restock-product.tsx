import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';

import { FormField } from '@/components/form-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { productService } from '@/services/productService';

export default function RestockProductScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const productId = Number(id);

  const [quantity, setQuantity] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [note, setNote] = useState('');
  const [createExpense, setCreateExpense] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = Number(quantity) > 0 && unitCost.trim().length > 0;

  async function handleSubmit() {
    if (!canSubmit) {
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await productService.restock(productId, {
        quantity: Number(quantity),
        unit_cost: Number(unitCost.replace(',', '.')),
        note: note.trim() || undefined,
        create_expense: createExpense,
      });
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

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <ThemedText type="title" style={styles.title}>
            Réapprovisionner
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.subtitle}>
            Ajoutez du stock et son coût d&apos;achat.
          </ThemedText>

          <View style={styles.form}>
            <View style={styles.priceRow}>
              <View style={styles.priceField}>
                <ThemedText type="small" themeColor="textSecondary" style={styles.fieldLabel}>
                  Quantité
                </ThemedText>
                <View style={[styles.amountRow, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
                  <TextInput
                    value={quantity}
                    onChangeText={(text) => setQuantity(text.replace(/[^0-9]/g, ''))}
                    placeholder="0"
                    placeholderTextColor={theme.textSecondary}
                    keyboardType="number-pad"
                    autoFocus
                    style={[styles.amountInput, { color: theme.text }]}
                  />
                </View>
              </View>
              <View style={styles.priceField}>
                <ThemedText type="small" themeColor="textSecondary" style={styles.fieldLabel}>
                  Coût unitaire
                </ThemedText>
                <View style={[styles.amountRow, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
                  <TextInput
                    value={unitCost}
                    onChangeText={setUnitCost}
                    placeholder="0"
                    placeholderTextColor={theme.textSecondary}
                    keyboardType="decimal-pad"
                    style={[styles.amountInput, { color: theme.text }]}
                  />
                  <ThemedText themeColor="textSecondary">FCFA</ThemedText>
                </View>
              </View>
            </View>

            <FormField label="Note (facultatif)" value={note} onChangeText={setNote} placeholder="Ex. Fournisseur, lot" />

            <View style={[styles.row, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
              <View style={styles.rowText}>
                <ThemedText type="smallBold">Créer une dépense correspondante</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Enregistre l&apos;achat dans vos transactions
                </ThemedText>
              </View>
              <Switch value={createExpense} onValueChange={setCreateExpense} trackColor={{ true: theme.tint }} thumbColor={theme.tintForeground} />
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
                Réapprovisionner
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
    marginBottom: Spacing.five,
  },
  form: {
    gap: Spacing.four,
  },
  fieldLabel: {
    marginLeft: Spacing.one,
    marginBottom: Spacing.one,
  },
  priceRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  priceField: {
    flex: 1,
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
    fontSize: 16,
    fontWeight: '700',
    paddingVertical: Spacing.three,
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

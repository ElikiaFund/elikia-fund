import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { productService, type Product } from '@/services/productService';

const currency = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 });

export default function ProductsScreen() {
  const theme = useTheme();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draftName, setDraftName] = useState('');
  const [draftCategory, setDraftCategory] = useState('');
  const [draftPrice, setDraftPrice] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(() => {
    setIsLoading(true);
    productService
      .list()
      .then(setProducts)
      .finally(() => setIsLoading(false));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  function resetDraft() {
    setEditingId(null);
    setDraftName('');
    setDraftCategory('');
    setDraftPrice('');
  }

  function handleEdit(product: Product) {
    setEditingId(product.id);
    setDraftName(product.name);
    setDraftCategory(product.category ?? '');
    setDraftPrice(product.unit_price ?? '');
  }

  async function handleSave() {
    if (draftName.trim().length === 0) {
      return;
    }

    setIsSaving(true);

    try {
      const unitPrice = draftPrice ? Number(draftPrice.replace(',', '.')) : undefined;

      if (editingId) {
        await productService.update(editingId, draftName.trim(), draftCategory.trim(), unitPrice);
      } else {
        await productService.create(draftName.trim(), draftCategory.trim(), unitPrice);
      }

      resetDraft();
      load();
    } catch (e) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setIsSaving(false);
    }
  }

  function handleDelete(product: Product) {
    Alert.alert('Supprimer ce produit ?', `"${product.name}" sera retiré de votre catalogue.`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            await productService.remove(product.id);
            if (editingId === product.id) {
              resetDraft();
            }
            load();
          } catch (e) {
            Alert.alert('Erreur', e instanceof Error ? e.message : 'Une erreur est survenue. Veuillez réessayer.');
          }
        },
      },
    ]);
  }

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <ThemedText themeColor="textSecondary" style={styles.subtitle}>
            Gérez ce que vous vendez pour le retrouver rapidement lors de la saisie de vos transactions.
          </ThemedText>

          <View style={[styles.draftCard, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="smallBold" style={styles.draftTitle}>
              {editingId ? 'Modifier le produit' : 'Ajouter un produit ou service'}
            </ThemedText>
            <TextInput
              value={draftName}
              onChangeText={setDraftName}
              placeholder="Nom (ex. Boisson, Coupe de cheveux)"
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { color: theme.text, borderColor: theme.border }]}
            />
            <View style={styles.draftRow}>
              <TextInput
                value={draftCategory}
                onChangeText={setDraftCategory}
                placeholder="Catégorie (ex. Boissons)"
                placeholderTextColor={theme.textSecondary}
                style={[styles.input, styles.inputHalf, { color: theme.text, borderColor: theme.border }]}
              />
              <TextInput
                value={draftPrice}
                onChangeText={setDraftPrice}
                placeholder="Prix unitaire"
                placeholderTextColor={theme.textSecondary}
                keyboardType="decimal-pad"
                style={[styles.input, styles.inputHalf, { color: theme.text, borderColor: theme.border }]}
              />
            </View>
            <View style={styles.draftActions}>
              {editingId && (
                <Pressable onPress={resetDraft} style={[styles.secondaryButton, { borderColor: theme.border }]}>
                  <ThemedText type="smallBold" themeColor="textSecondary">
                    Annuler
                  </ThemedText>
                </Pressable>
              )}
              <Pressable
                onPress={handleSave}
                disabled={draftName.trim().length === 0 || isSaving}
                style={[
                  styles.primaryButton,
                  { backgroundColor: theme.tint },
                  (draftName.trim().length === 0 || isSaving) && styles.buttonDisabled,
                ]}
              >
                {isSaving ? (
                  <ActivityIndicator color={theme.tintForeground} />
                ) : (
                  <ThemedText type="smallBold" style={{ color: theme.tintForeground }}>
                    {editingId ? 'Enregistrer' : 'Ajouter'}
                  </ThemedText>
                )}
              </Pressable>
            </View>
          </View>

          {isLoading ? (
            <ActivityIndicator color={theme.tint} style={styles.loading} />
          ) : products.length === 0 ? (
            <ThemedText themeColor="textSecondary" style={styles.empty}>
              Aucun produit pour le moment.
            </ThemedText>
          ) : (
            <View style={[styles.productList, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
              {products.map((product, index) => (
                <View
                  key={product.id}
                  style={[
                    styles.productRow,
                    index < products.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border },
                  ]}
                >
                  <View style={styles.productInfo}>
                    <ThemedText numberOfLines={1}>{product.name}</ThemedText>
                    {(product.category || product.unit_price) && (
                      <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                        {[product.category, product.unit_price ? currency.format(Number(product.unit_price)) : null]
                          .filter(Boolean)
                          .join(' · ')}
                      </ThemedText>
                    )}
                  </View>
                  <Pressable onPress={() => handleEdit(product)} hitSlop={8} style={styles.rowAction}>
                    <Ionicons name="pencil-outline" size={18} color={theme.textSecondary} />
                  </Pressable>
                  <Pressable onPress={() => handleDelete(product)} hitSlop={8} style={styles.rowAction}>
                    <Ionicons name="trash-outline" size={18} color={theme.danger} />
                  </Pressable>
                </View>
              ))}
            </View>
          )}
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
  },
  subtitle: {
    marginBottom: Spacing.four,
  },
  draftCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: Spacing.three,
    marginBottom: Spacing.five,
    gap: Spacing.two,
  },
  draftTitle: {
    marginBottom: Spacing.one,
  },
  draftRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    fontSize: 15,
  },
  inputHalf: {
    flex: 1,
  },
  draftActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  primaryButton: {
    borderRadius: 12,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButton: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  loading: {
    marginTop: Spacing.six,
  },
  empty: {
    textAlign: 'center',
    marginTop: Spacing.six,
  },
  productList: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    overflow: 'hidden',
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
  },
  productInfo: {
    flex: 1,
  },
  rowAction: {
    padding: Spacing.one,
  },
});

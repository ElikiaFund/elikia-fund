import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';

import { CategorySelectSheet } from '@/components/category-select-sheet';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useCompany } from '@/context/company-context';
import { useTheme } from '@/hooks/use-theme';
import { productCategoryService, type ProductCategory } from '@/services/productCategoryService';
import { productService } from '@/services/productService';

export default function CreateProductScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { activeCompany } = useCompany();
  const [name, setName] = useState('');
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [isCategorySheetOpen, setIsCategorySheetOpen] = useState(false);
  const [sellPrice, setSellPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  // Pre-checked by company sector as a UX default only — always overridable.
  const [tracksStock, setTracksStock] = useState(activeCompany?.category !== 'services');
  const [stockQuantity, setStockQuantity] = useState('');
  const [lowStockThreshold, setLowStockThreshold] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    productCategoryService
      .list()
      .then(setCategories)
      .catch(() => {});
  }, []);

  const categoryLabel = categories.find((c) => c.id === categoryId)?.name ?? null;
  const canSubmit = name.trim().length > 0;

  async function handleSubmit() {
    setError(null);
    setIsSubmitting(true);

    try {
      const product = await productService.create({
        name: name.trim(),
        category_id: categoryId,
        sell_price: sellPrice ? Number(sellPrice.replace(',', '.')) : null,
        cost_price: costPrice ? Number(costPrice.replace(',', '.')) : null,
        tracks_stock: tracksStock,
        stock_quantity: tracksStock && stockQuantity ? Number(stockQuantity) : undefined,
        low_stock_threshold: tracksStock && lowStockThreshold ? Number(lowStockThreshold) : null,
      });
      router.replace({ pathname: '/product/[id]', params: { id: String(product.id) } });
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
          <View style={styles.headerRow}>
            <Pressable onPress={() => router.back()} hitSlop={8} style={styles.closeButton}>
              <Ionicons name="close" size={22} color={theme.text} />
            </Pressable>
          </View>

          <ThemedText type="title" style={styles.title}>
            Nouveau produit
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.subtitle}>
            Ajoutez un produit ou un service à votre catalogue.
          </ThemedText>

          <View style={styles.form}>
            <View>
              <ThemedText type="small" themeColor="textSecondary" style={styles.fieldLabel}>
                Nom
              </ThemedText>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Ex. Boisson, Coupe de cheveux"
                placeholderTextColor={theme.textSecondary}
                style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement }]}
              />
            </View>

            <View>
              <ThemedText type="small" themeColor="textSecondary" style={styles.fieldLabel}>
                Catégorie
              </ThemedText>
              <Pressable
                onPress={() => setIsCategorySheetOpen(true)}
                style={[styles.selectField, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}
              >
                <ThemedText themeColor={categoryLabel ? 'text' : 'textSecondary'}>{categoryLabel ?? 'Aucune catégorie'}</ThemedText>
                <Ionicons name="chevron-down" size={16} color={theme.textSecondary} />
              </Pressable>
            </View>

            <View style={styles.priceRow}>
              <View style={styles.priceField}>
                <ThemedText type="small" themeColor="textSecondary" style={styles.fieldLabel}>
                  Prix de vente
                </ThemedText>
                <View style={[styles.amountRow, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
                  <TextInput
                    value={sellPrice}
                    onChangeText={setSellPrice}
                    placeholder="0"
                    placeholderTextColor={theme.textSecondary}
                    keyboardType="decimal-pad"
                    style={[styles.amountInput, { color: theme.text }]}
                  />
                </View>
              </View>
              <View style={styles.priceField}>
                <ThemedText type="small" themeColor="textSecondary" style={styles.fieldLabel}>
                  Prix de revient
                </ThemedText>
                <View style={[styles.amountRow, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
                  <TextInput
                    value={costPrice}
                    onChangeText={setCostPrice}
                    placeholder="0"
                    placeholderTextColor={theme.textSecondary}
                    keyboardType="decimal-pad"
                    style={[styles.amountInput, { color: theme.text }]}
                  />
                </View>
              </View>
            </View>

            <View style={[styles.row, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
              <View style={styles.rowText}>
                <ThemedText type="smallBold">Suivi de stock</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Activez pour un bien physique, désactivez pour une prestation
                </ThemedText>
              </View>
              <Switch value={tracksStock} onValueChange={setTracksStock} trackColor={{ true: theme.tint }} thumbColor={theme.tintForeground} />
            </View>

            {tracksStock && (
              <View style={styles.priceRow}>
                <View style={styles.priceField}>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.fieldLabel}>
                    Stock initial
                  </ThemedText>
                  <View style={[styles.amountRow, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
                    <TextInput
                      value={stockQuantity}
                      onChangeText={(text) => setStockQuantity(text.replace(/[^0-9]/g, ''))}
                      placeholder="0"
                      placeholderTextColor={theme.textSecondary}
                      keyboardType="number-pad"
                      style={[styles.amountInput, { color: theme.text }]}
                    />
                  </View>
                </View>
                <View style={styles.priceField}>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.fieldLabel}>
                    Seuil de stock faible
                  </ThemedText>
                  <View style={[styles.amountRow, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
                    <TextInput
                      value={lowStockThreshold}
                      onChangeText={(text) => setLowStockThreshold(text.replace(/[^0-9]/g, ''))}
                      placeholder="Ex. 5"
                      placeholderTextColor={theme.textSecondary}
                      keyboardType="number-pad"
                      style={[styles.amountInput, { color: theme.text }]}
                    />
                  </View>
                </View>
              </View>
            )}
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
                Ajouter
              </ThemedText>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      <CategorySelectSheet
        visible={isCategorySheetOpen}
        categories={categories}
        selectedId={categoryId}
        onSelect={setCategoryId}
        onCategoriesChange={setCategories}
        onClose={() => setIsCategorySheetOpen(false)}
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
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 15,
  },
  selectField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
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

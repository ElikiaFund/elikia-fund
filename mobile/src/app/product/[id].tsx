import { Ionicons } from '@expo/vector-icons';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';

import { CategorySelectSheet } from '@/components/category-select-sheet';
import { sheetStyles } from '@/components/select-sheet';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { productCategoryService, type ProductCategory } from '@/services/productCategoryService';
import { productService, type Product, type StockMovement } from '@/services/productService';

const dateFormatter = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

const MOVEMENT_LABELS: Record<StockMovement['type'], string> = {
  restock: 'Réapprovisionnement',
  sale: 'Vente',
  adjustment: 'Ajustement',
};

export default function ProductDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const productId = Number(id);

  const [product, setProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [isCategorySheetOpen, setIsCategorySheetOpen] = useState(false);
  const [sellPrice, setSellPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [tracksStock, setTracksStock] = useState(false);
  const [lowStockThreshold, setLowStockThreshold] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [adjustMode, setAdjustMode] = useState<'loss' | 'gain'>('loss');
  const [adjustQuantity, setAdjustQuantity] = useState('');
  const [adjustNote, setAdjustNote] = useState('');
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [adjustError, setAdjustError] = useState<string | null>(null);

  const load = useCallback(() => {
    setIsLoading(true);

    Promise.all([productService.get(productId), productCategoryService.list(), productService.movements(productId)])
      .then(([fetchedProduct, fetchedCategories, fetchedMovements]) => {
        setProduct(fetchedProduct);
        setCategories(fetchedCategories);
        setMovements(fetchedMovements);
        setName(fetchedProduct.name);
        setCategoryId(fetchedProduct.category_id);
        setSellPrice(fetchedProduct.sell_price ?? '');
        setCostPrice(fetchedProduct.cost_price ?? '');
        setTracksStock(fetchedProduct.tracks_stock);
        setLowStockThreshold(fetchedProduct.low_stock_threshold !== null ? String(fetchedProduct.low_stock_threshold) : '');
      })
      .finally(() => setIsLoading(false));
  }, [productId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const categoryLabel = categories.find((c) => c.id === categoryId)?.name ?? null;

  function handleDelete() {
    if (!product) {
      return;
    }

    Alert.alert('Supprimer ce produit ?', `"${product.name}" sera retiré de votre catalogue.`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            await productService.remove(product.id);
            router.back();
          } catch (e) {
            Alert.alert('Erreur', e instanceof Error ? e.message : 'Une erreur est survenue. Veuillez réessayer.');
          }
        },
      },
    ]);
  }

  async function handleSave() {
    setError(null);
    setIsSaving(true);

    try {
      const updated = await productService.update(productId, {
        name: name.trim(),
        category_id: categoryId,
        sell_price: sellPrice ? Number(sellPrice.replace(',', '.')) : null,
        cost_price: costPrice ? Number(costPrice.replace(',', '.')) : null,
        tracks_stock: tracksStock,
        low_stock_threshold: tracksStock && lowStockThreshold ? Number(lowStockThreshold) : null,
      });
      setProduct(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAdjust() {
    const quantity = Number(adjustQuantity);

    if (!quantity) {
      return;
    }

    setIsAdjusting(true);
    setAdjustError(null);

    try {
      const result = await productService.adjustStock(productId, {
        quantity_change: adjustMode === 'loss' ? -quantity : quantity,
        note: adjustNote.trim() || undefined,
      });
      setProduct(result.product);
      setMovements((current) => [result.movement, ...current]);
      setIsAdjustOpen(false);
      setAdjustQuantity('');
      setAdjustNote('');
    } catch (e) {
      setAdjustError(e instanceof Error ? e.message : 'Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setIsAdjusting(false);
    }
  }

  if (isLoading || !product) {
    return (
      <ThemedView style={[styles.container, styles.centered]}>
        <ActivityIndicator color={theme.tint} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Produit',
          headerRight: () => (
            <Pressable onPress={handleDelete} hitSlop={8} style={styles.headerButton}>
              <Ionicons name="trash-outline" size={20} color={theme.danger} />
            </Pressable>
          ),
        }}
      />

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.form}>
            <View>
              <ThemedText type="small" themeColor="textSecondary" style={styles.fieldLabel}>
                Nom
              </ThemedText>
              <TextInput
                value={name}
                onChangeText={setName}
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
                    keyboardType="decimal-pad"
                    style={[styles.amountInput, { color: theme.text }]}
                  />
                </View>
                <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
                  Se met à jour automatiquement lors d&apos;un réapprovisionnement
                </ThemedText>
              </View>
            </View>

            <View style={[styles.row, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
              <View style={styles.rowText}>
                <ThemedText type="smallBold">Suivi de stock</ThemedText>
              </View>
              <Switch value={tracksStock} onValueChange={setTracksStock} trackColor={{ true: theme.tint }} thumbColor={theme.tintForeground} />
            </View>

            {tracksStock && (
              <View style={styles.priceRow}>
                <View style={styles.priceField}>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.fieldLabel}>
                    Quantité en stock
                  </ThemedText>
                  <View style={[styles.amountRow, styles.readOnlyRow, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
                    <ThemedText style={styles.amountInput}>{product.stock_quantity}</ThemedText>
                  </View>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
                    Modifiable via réapprovisionnement ou ajustement
                  </ThemedText>
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
            onPress={handleSave}
            disabled={name.trim().length === 0 || isSaving}
            style={[styles.button, { backgroundColor: theme.tint }, (name.trim().length === 0 || isSaving) && styles.buttonDisabled]}
          >
            {isSaving ? (
              <ActivityIndicator color={theme.tintForeground} />
            ) : (
              <ThemedText type="smallBold" style={{ color: theme.tintForeground }}>
                Enregistrer
              </ThemedText>
            )}
          </Pressable>

          {tracksStock && (
            <>
              <ThemedText type="smallBold" style={styles.sectionTitle}>
                Mouvements de stock
              </ThemedText>

              <View style={styles.stockActions}>
                <Pressable
                  onPress={() => router.push({ pathname: '/restock-product', params: { id: String(productId) } })}
                  style={[styles.stockActionButton, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
                >
                  <Ionicons name="arrow-up-circle-outline" size={18} color={theme.income} />
                  <ThemedText type="smallBold">Réapprovisionner</ThemedText>
                </Pressable>
                <Pressable
                  onPress={() => setIsAdjustOpen(true)}
                  style={[styles.stockActionButton, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
                >
                  <Ionicons name="options-outline" size={18} color={theme.tint} />
                  <ThemedText type="smallBold">Ajuster</ThemedText>
                </Pressable>
              </View>

              {movements.length === 0 ? (
                <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
                  Aucun mouvement pour ce produit.
                </ThemedText>
              ) : (
                <View style={[styles.movementList, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
                  {movements.map((movement, index) => (
                    <View
                      key={movement.id}
                      style={[
                        styles.movementRow,
                        index < movements.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border },
                      ]}
                    >
                      <View style={styles.movementInfo}>
                        <ThemedText type="small">{MOVEMENT_LABELS[movement.type]}</ThemedText>
                        <ThemedText type="small" themeColor="textSecondary">
                          {dateFormatter.format(new Date(movement.created_at))}
                          {movement.note ? ` · ${movement.note}` : ''}
                        </ThemedText>
                      </View>
                      <ThemedText type="smallBold" style={{ color: movement.quantity_change >= 0 ? theme.income : theme.danger }}>
                        {movement.quantity_change >= 0 ? '+' : ''}
                        {movement.quantity_change}
                      </ThemedText>
                    </View>
                  ))}
                </View>
              )}
            </>
          )}
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

      <Modal visible={isAdjustOpen} transparent animationType="slide" onRequestClose={() => setIsAdjustOpen(false)}>
        <View style={sheetStyles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setIsAdjustOpen(false)} />
          <View style={[sheetStyles.sheet, { backgroundColor: theme.background }]}>
            <View style={[sheetStyles.handle, { backgroundColor: theme.border }]} />
            <ThemedText type="smallBold" style={styles.title}>
              Ajuster le stock
            </ThemedText>

            <View style={[styles.segmented, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
              <Pressable
                onPress={() => setAdjustMode('loss')}
                style={[styles.segment, adjustMode === 'loss' && { backgroundColor: theme.backgroundSelected }]}
              >
                <ThemedText type="smallBold" themeColor={adjustMode === 'loss' ? 'danger' : 'textSecondary'}>
                  Perte
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={() => setAdjustMode('gain')}
                style={[styles.segment, adjustMode === 'gain' && { backgroundColor: theme.backgroundSelected }]}
              >
                <ThemedText type="smallBold" themeColor={adjustMode === 'gain' ? 'income' : 'textSecondary'}>
                  Ajout
                </ThemedText>
              </Pressable>
            </View>

            <View style={[styles.amountRow, styles.adjustAmountRow, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
              <TextInput
                value={adjustQuantity}
                onChangeText={(text) => setAdjustQuantity(text.replace(/[^0-9]/g, ''))}
                placeholder="Quantité"
                placeholderTextColor={theme.textSecondary}
                keyboardType="number-pad"
                autoFocus
                style={[styles.amountInput, { color: theme.text }]}
              />
            </View>

            <TextInput
              value={adjustNote}
              onChangeText={setAdjustNote}
              placeholder="Motif (ex. casse, péremption, recomptage)"
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, styles.adjustNote, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement }]}
            />

            {adjustError && (
              <ThemedText type="small" style={{ color: theme.danger }}>
                {adjustError}
              </ThemedText>
            )}

            <Pressable
              onPress={handleAdjust}
              disabled={!adjustQuantity || isAdjusting}
              style={[styles.applyButton, { backgroundColor: theme.tint }, (!adjustQuantity || isAdjusting) && styles.buttonDisabled]}
            >
              {isAdjusting ? (
                <ActivityIndicator color={theme.tintForeground} />
              ) : (
                <ThemedText type="smallBold" style={{ color: theme.tintForeground }}>
                  Confirmer
                </ThemedText>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
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
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerButton: {
    marginRight: Spacing.four,
  },
  scrollContent: {
    padding: Spacing.four,
  },
  title: {
    marginBottom: Spacing.two,
  },
  form: {
    gap: Spacing.four,
  },
  fieldLabel: {
    marginLeft: Spacing.one,
    marginBottom: Spacing.one,
  },
  hint: {
    marginTop: Spacing.one,
    marginLeft: Spacing.one,
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
  readOnlyRow: {
    opacity: 0.6,
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
  sectionTitle: {
    marginTop: Spacing.six,
    marginBottom: Spacing.three,
  },
  stockActions: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },
  stockActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingVertical: Spacing.three,
  },
  empty: {
    paddingVertical: Spacing.three,
  },
  movementList: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    overflow: 'hidden',
  },
  movementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
  },
  movementInfo: {
    flex: 1,
    gap: 2,
  },
  segmented: {
    flexDirection: 'row',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    padding: Spacing.half,
    marginBottom: Spacing.three,
  },
  segment: {
    flex: 1,
    borderRadius: 11,
    paddingVertical: Spacing.two,
    alignItems: 'center',
  },
  adjustAmountRow: {
    marginBottom: Spacing.three,
  },
  adjustNote: {
    marginBottom: Spacing.three,
  },
  applyButton: {
    borderRadius: 14,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
});

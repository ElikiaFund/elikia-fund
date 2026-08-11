import NetInfo from '@react-native-community/netinfo';
import { Ionicons } from '@expo/vector-icons';
import * as Crypto from 'expo-crypto';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { AirtelLogo } from '@/components/brand/airtel-logo';
import { MtnLogo } from '@/components/brand/mtn-logo';
import { FormField } from '@/components/form-field';
import { Pill } from '@/components/pill';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TransactionCategorySelectSheet } from '@/components/transaction-category-select-sheet';
import { Spacing } from '@/constants/theme';
import { TRANSACTION_PAYMENT_METHODS, type TransactionPaymentMethod } from '@/constants/payment-methods';
import { useAuth } from '@/context/auth-context';
import { useCompany } from '@/context/company-context';
import { useSync } from '@/context/sync-context';
import { cacheSyncedTransaction, insertTransaction } from '@/db/database';
import { useTheme } from '@/hooks/use-theme';
import { isLowStock } from '@/lib/product-stats';
import { productCategoryService, type ProductCategory } from '@/services/productCategoryService';
import { productService, type Product } from '@/services/productService';
import { transactionCategoryService, type TransactionCategory } from '@/services/transactionCategoryService';
import { transactionService, type CreateTransactionPayload } from '@/services/transactionService';

type TransactionType = 'income' | 'expense';
type CartItem = { product: Product; quantity: number };

const currency = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 });

// Guarantees a large total never overflows/gets clipped by its container — shrinks in steps as
// the digit count grows instead of relying on the input to just get wider than its row allows.
function amountFontSize(text: string): number {
  const length = text.length;
  if (length > 12) return 26;
  if (length > 9) return 32;
  if (length > 6) return 38;
  return 44;
}

export default function AddTransactionScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { activeCompany } = useCompany();
  const { syncNow } = useSync();
  const params = useLocalSearchParams<{ type?: string }>();
  const [type, setType] = useState<TransactionType>(params.type === 'income' ? 'income' : 'expense');
  const [amount, setAmount] = useState('');
  // Expense only — income no longer has a category picker at all, since the product/service
  // selected below already tells the same story (and drives the category recorded per line).
  const [category, setCategory] = useState<string | null>(null);
  const [categories, setCategories] = useState<TransactionCategory[]>([]);
  const [isCategorySheetOpen, setIsCategorySheetOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<TransactionPaymentMethod>('cash');
  const [note, setNote] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [productCategories, setProductCategories] = useState<ProductCategory[]>([]);
  const [productCategoryFilter, setProductCategoryFilter] = useState<number | 'all'>('all');
  // Income only — several products/services at once, like a cart. Checkout creates one
  // transaction per line (see handleSubmit) so stock and margin stay accurate per product.
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Synchronous guard against a double-tap landing before React re-renders the button's
  // disabled prop — isSubmitting state alone doesn't catch two taps within the same tick.
  const isSubmittingRef = useRef(false);

  const amountValue = Number(amount.replace(',', '.'));
  const selectedCategory = categories.find((c) => c.name === category) ?? null;
  const filteredProducts =
    productCategoryFilter === 'all' ? products : products.filter((p) => p.category_id === productCategoryFilter);
  const cartTotal = cart.reduce((sum, item) => sum + Number(item.product.sell_price ?? 0) * item.quantity, 0);
  const cartExceedsStock = cart.some((item) => item.product.tracks_stock && item.quantity > item.product.stock_quantity);
  // The amount field only accepts manual entry for expenses, or for income with an empty cart
  // (e.g. a loan received, or any income not tied to a specific product) — once the cart has
  // items, the total is derived from it so the two can never drift apart.
  const amountEditable = type === 'expense' || cart.length === 0;
  const canSubmit = amountValue > 0 && !cartExceedsStock && (type === 'expense' ? category !== null : true);

  useEffect(() => {
    productService
      .list()
      .then(setProducts)
      .catch(() => {
        // The catalog is optional — a fetch failure just hides the picker.
      });
    productCategoryService
      .list()
      .then(setProductCategories)
      .catch(() => {
        // Category filter is a nice-to-have — a fetch failure just hides the filter row.
      });
  }, []);

  // Expense-only categories — income has none to fetch anymore.
  useEffect(() => {
    if (type !== 'expense') {
      return;
    }

    transactionCategoryService
      .list(type)
      .then(setCategories)
      .catch(() => {
        // The picker just shows "Aucune catégorie" + the create action on failure.
      });
  }, [type]);

  // Keeps the displayed amount in lockstep with the cart — see amountEditable above.
  useEffect(() => {
    if (type !== 'income' || cart.length === 0) {
      return;
    }

    setAmount(String(cartTotal));
  }, [cart, type, cartTotal]);

  function switchType(next: TransactionType) {
    setType(next);
    setCategory(null);
  }

  function handleAddToCart(product: Product) {
    setCart((current) => (current.some((item) => item.product.id === product.id) ? current : [...current, { product, quantity: 1 }]));
  }

  function handleAdjustCartQuantity(productId: number, delta: number) {
    setCart((current) =>
      current.map((item) => (item.product.id === productId ? { ...item, quantity: item.quantity + delta } : item)).filter((item) => item.quantity > 0),
    );
  }

  function buildPayloads(now: string): CreateTransactionPayload[] {
    if (type === 'income' && cart.length > 0) {
      return cart.map((item) => ({
        uuid: Crypto.randomUUID(),
        type: 'income',
        amount: Number(item.product.sell_price ?? 0) * item.quantity,
        category: item.product.category?.name ?? item.product.name,
        payment_method: paymentMethod,
        note: note.trim() || null,
        product_name: item.product.name,
        quantity: item.quantity,
        product_id: item.product.id,
        occurred_at: now,
      }));
    }

    return [
      {
        uuid: Crypto.randomUUID(),
        type,
        amount: amountValue,
        category: type === 'income' ? 'Vente' : (category as string),
        payment_method: paymentMethod,
        note: note.trim() || null,
        product_name: null,
        quantity: null,
        product_id: null,
        occurred_at: now,
      },
    ];
  }

  async function handleSubmit() {
    if (!user || !activeCompany || !canSubmit || isSubmittingRef.current) {
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);

    const now = new Date().toISOString();
    const payloads = buildPayloads(now);

    try {
      const netState = await NetInfo.fetch();
      let succeededCount = 0;

      // Online: write each line straight to the server (still per-line, so an oversell on any
      // single product is caught in real time), mirroring each into SQLite as it lands. Falls
      // through to the offline path below for whatever's left if a request fails partway.
      if (netState.isConnected) {
        try {
          for (const payload of payloads) {
            await transactionService.create(payload);
            await cacheSyncedTransaction({ ...payload, user_id: user.id, company_id: activeCompany.id, created_at: now });
            succeededCount++;
          }
          router.back();
          return;
        } catch {
          // fall through with whatever wasn't submitted yet
        }
      }

      for (const payload of payloads.slice(succeededCount)) {
        await insertTransaction({ ...payload, user_id: user.id, company_id: activeCompany.id, created_at: now, synced: 0 });
      }
      router.back();
      syncNow();
    } finally {
      isSubmittingRef.current = false;
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
              editable={amountEditable}
              placeholder="0"
              placeholderTextColor={theme.textSecondary}
              keyboardType="decimal-pad"
              autoFocus={amountEditable}
              style={[
                styles.amountInput,
                { color: amountEditable ? theme.text : theme.textSecondary, fontSize: amountFontSize(amount || '0') },
              ]}
            />
          </View>

          {type === 'income' && cart.length > 0 && (
            <ThemedText type="small" themeColor="textSecondary" style={styles.cartCaption}>
              {cart.length} produit{cart.length > 1 ? 's' : ''} sélectionné{cart.length > 1 ? 's' : ''}
            </ThemedText>
          )}

          {type === 'expense' && (
            <>
              <ThemedText type="small" themeColor="textSecondary" style={styles.sectionLabel}>
                Catégorie
              </ThemedText>
              <Pressable
                onPress={() => setIsCategorySheetOpen(true)}
                style={[styles.selectField, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}
              >
                <View style={styles.optionLabel}>
                  {selectedCategory && (
                    <Ionicons
                      name={(selectedCategory.icon as keyof typeof Ionicons.glyphMap) ?? 'pricetag-outline'}
                      size={18}
                      color={theme.tint}
                    />
                  )}
                  <ThemedText themeColor={category ? 'text' : 'textSecondary'}>{category ?? 'Choisir une catégorie'}</ThemedText>
                </View>
                <Ionicons name="chevron-down" size={16} color={theme.textSecondary} />
              </Pressable>
            </>
          )}

          <ThemedText type="small" themeColor="textSecondary" style={[styles.sectionLabel, styles.paymentSectionLabel]}>
            Moyen de paiement
          </ThemedText>
          <View style={styles.grid}>
            {TRANSACTION_PAYMENT_METHODS.map((option) => {
              const selected = paymentMethod === option.value;

              return (
                <Pressable
                  key={option.value}
                  onPress={() => setPaymentMethod(option.value)}
                  style={[
                    styles.card,
                    { backgroundColor: theme.backgroundElement, borderColor: selected ? theme.tint : theme.border },
                    selected && { backgroundColor: theme.backgroundSelected },
                  ]}
                >
                  {option.value === 'cash' ? (
                    <Ionicons name="cash-outline" size={20} color={selected ? theme.tint : theme.textSecondary} />
                  ) : option.value === 'mtn_momo' ? (
                    <MtnLogo size={20} />
                  ) : (
                    <AirtelLogo size={20} />
                  )}
                  <ThemedText type="small" themeColor={selected ? 'text' : 'textSecondary'}>
                    {option.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>

          {type === 'income' && (
            <View style={styles.productSection}>
              <ThemedText type="small" themeColor="textSecondary" style={styles.sectionLabel}>
                Produits ou services (facultatif)
              </ThemedText>

              {products.length === 0 ? (
                <View style={[styles.emptyBox, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
                  <View style={[styles.emptyBadge, { backgroundColor: theme.backgroundSelected }]}>
                    <Ionicons name="pricetags-outline" size={24} color={theme.tint} />
                  </View>
                  <ThemedText themeColor="textSecondary" style={styles.emptyText}>
                    Vous n&apos;avez pas encore de produits ou services. Ajoutez-en pour accélérer la saisie de vos ventes.
                  </ThemedText>
                  <Pressable
                    onPress={() => router.push('/create-product')}
                    style={[styles.emptyButton, { backgroundColor: theme.tint }]}
                  >
                    <ThemedText type="smallBold" style={{ color: theme.tintForeground }}>
                      Ajouter un produit
                    </ThemedText>
                  </Pressable>
                </View>
              ) : (
                <>
                  {productCategories.length > 0 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryPills}>
                      <Pill label="Tous" active={productCategoryFilter === 'all'} onPress={() => setProductCategoryFilter('all')} />
                      {productCategories.map((productCategory) => (
                        <Pill
                          key={productCategory.id}
                          label={productCategory.name}
                          active={productCategoryFilter === productCategory.id}
                          onPress={() => setProductCategoryFilter(productCategory.id)}
                        />
                      ))}
                    </ScrollView>
                  )}

                  {filteredProducts.length === 0 ? (
                    <View style={styles.categoryEmptyBox}>
                      <Ionicons name="file-tray-outline" size={20} color={theme.textSecondary} />
                      <ThemedText type="small" themeColor="textSecondary">
                        Aucun produit dans cette catégorie.
                      </ThemedText>
                    </View>
                  ) : (
                    <View style={[styles.productList, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
                      {filteredProducts.map((product, index) => {
                        const cartItem = cart.find((item) => item.product.id === product.id) ?? null;
                        const lowStock = isLowStock(product);
                        const lineExceedsStock = !!cartItem && product.tracks_stock && cartItem.quantity > product.stock_quantity;

                        return (
                          <View
                            key={product.id}
                            style={[
                              styles.productRow,
                              cartItem && { backgroundColor: theme.backgroundSelected },
                              index < filteredProducts.length - 1 && {
                                borderBottomWidth: StyleSheet.hairlineWidth,
                                borderBottomColor: theme.border,
                              },
                            ]}
                          >
                            <View
                              style={[
                                styles.productIcon,
                                { backgroundColor: product.category?.color ? `${product.category.color}22` : theme.backgroundElement },
                              ]}
                            >
                              <Ionicons
                                name={(product.category?.icon as keyof typeof Ionicons.glyphMap) ?? 'pricetag-outline'}
                                size={18}
                                color={product.category?.color ?? theme.textSecondary}
                              />
                            </View>
                            <View style={styles.productInfo}>
                              <ThemedText numberOfLines={1}>{product.name}</ThemedText>
                              <View style={styles.productMetaRow}>
                                {product.sell_price && (
                                  <ThemedText type="small" themeColor="textSecondary">
                                    {currency.format(Number(product.sell_price))}
                                  </ThemedText>
                                )}
                                {product.tracks_stock && (
                                  <ThemedText type="small" style={{ color: lowStock ? theme.danger : theme.textSecondary }}>
                                    {product.stock_quantity} en stock
                                  </ThemedText>
                                )}
                              </View>
                              {lineExceedsStock && (
                                <ThemedText type="small" style={{ color: theme.danger }}>
                                  Stock insuffisant ({product.stock_quantity} disponible{product.stock_quantity > 1 ? 's' : ''})
                                </ThemedText>
                              )}
                            </View>

                            {cartItem ? (
                              <View style={styles.cartStepper}>
                                <Pressable onPress={() => handleAdjustCartQuantity(product.id, -1)} hitSlop={8}>
                                  <Ionicons name="remove-circle" size={22} color={theme.tint} />
                                </Pressable>
                                <ThemedText type="smallBold" style={styles.cartQty}>
                                  {cartItem.quantity}
                                </ThemedText>
                                <Pressable onPress={() => handleAdjustCartQuantity(product.id, 1)} hitSlop={8}>
                                  <Ionicons name="add-circle" size={22} color={theme.tint} />
                                </Pressable>
                              </View>
                            ) : (
                              <Pressable
                                onPress={() => handleAddToCart(product)}
                                hitSlop={8}
                                style={[styles.addButton, { borderColor: theme.tint }]}
                              >
                                <Ionicons name="add" size={18} color={theme.tint} />
                              </Pressable>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  )}
                </>
              )}
            </View>
          )}

          <View style={styles.noteField}>
            <FormField
              label="Note (facultatif)"
              value={note}
              onChangeText={setNote}
              placeholder={type === 'expense' ? 'Ajoutez un détail sur cette dépense' : 'Ajoutez un détail sur ce revenu'}
              multiline
              numberOfLines={3}
              style={styles.noteInput}
            />
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

      {type === 'expense' && (
        <TransactionCategorySelectSheet
          visible={isCategorySheetOpen}
          type={type}
          categories={categories}
          selectedName={category}
          onSelect={setCategory}
          onCategoriesChange={setCategories}
          onClose={() => setIsCategorySheetOpen(false)}
        />
      )}
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
  },
  currencySign: {
    fontSize: 20,
    flexShrink: 0,
  },
  amountInput: {
    borderWidth: 0,
    backgroundColor: 'transparent',
    fontWeight: '700',
    paddingHorizontal: 0,
    paddingVertical: 0,
    minWidth: 60,
    maxWidth: '75%',
    flexShrink: 1,
    textAlign: 'center',
  },
  cartCaption: {
    textAlign: 'center',
    marginTop: Spacing.one,
  },
  sectionLabel: {
    marginLeft: Spacing.one,
    marginBottom: Spacing.two,
    marginTop: Spacing.five,
  },
  paymentSectionLabel: {
    marginTop: Spacing.five,
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
  optionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
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
  productSection: {
    marginTop: Spacing.one,
  },
  categoryPills: {
    gap: Spacing.two,
    paddingBottom: Spacing.two,
    paddingRight: Spacing.four,
  },
  categoryEmptyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.four,
    justifyContent: 'center',
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
  productIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productInfo: {
    flex: 1,
    gap: 2,
  },
  productMetaRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  addButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  cartQty: {
    minWidth: 18,
    textAlign: 'center',
  },
  emptyBox: {
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  emptyBadge: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    textAlign: 'center',
    maxWidth: 280,
  },
  emptyButton: {
    marginTop: Spacing.two,
    borderRadius: 12,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  noteField: {
    marginTop: Spacing.five,
  },
  noteInput: {
    minHeight: 90,
    textAlignVertical: 'top',
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

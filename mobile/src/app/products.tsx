import { Ionicons } from '@expo/vector-icons';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Pill } from '@/components/pill';
import { StatGrid } from '@/components/stat-grid';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { computeProductStats, isLowStock, productMarginPercent } from '@/lib/product-stats';
import { productCategoryService, type ProductCategory } from '@/services/productCategoryService';
import { productService, type Product } from '@/services/productService';

const currency = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 });
const plainCurrency = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });

export default function ProductsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<number | 'all'>('all');

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setIsLoading(true);

      Promise.all([productService.list(), productCategoryService.list()])
        .then(([productsResult, categoriesResult]) => {
          if (!cancelled) {
            setProducts(productsResult);
            setCategories(categoriesResult);
          }
        })
        .finally(() => {
          if (!cancelled) {
            setIsLoading(false);
          }
        });

      return () => {
        cancelled = true;
      };
    }, []),
  );

  const stats = useMemo(() => computeProductStats(products), [products]);
  const filtered = useMemo(
    () => (categoryFilter === 'all' ? products : products.filter((p) => p.category_id === categoryFilter)),
    [products, categoryFilter],
  );

  function handleDelete(product: Product) {
    Alert.alert('Supprimer ce produit ?', `"${product.name}" sera retiré de votre catalogue.`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            await productService.remove(product.id);
            setProducts((current) => current.filter((p) => p.id !== product.id));
          } catch (e) {
            Alert.alert('Erreur', e instanceof Error ? e.message : 'Une erreur est survenue. Veuillez réessayer.');
          }
        },
      },
    ]);
  }

  if (isLoading) {
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
          headerRight: () => (
            <Pressable onPress={() => router.push('/create-product')} hitSlop={8} style={styles.headerButton}>
              <Ionicons name="add" size={24} color={theme.tint} />
            </Pressable>
          ),
        }}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <ThemedText themeColor="textSecondary" style={styles.subtitle}>
          Gérez ce que vous vendez, son coût, son prix et son stock.
        </ThemedText>

        <StatGrid
          style={styles.statGrid}
          stats={[
            { label: 'Valeur du stock', value: `${plainCurrency.format(stats.totalInventoryValue)} FCFA` },
            {
              label: 'Stock faible',
              value: String(stats.lowStockCount),
              color: stats.lowStockCount > 0 ? theme.danger : undefined,
            },
            {
              label: 'Marge moyenne',
              value: stats.averageMarginPercent === null ? '—' : `${Math.round(stats.averageMarginPercent)}%`,
            },
          ]}
        />

        <Pressable onPress={() => router.push('/product-categories')} style={styles.categoriesLink}>
          <ThemedText type="small" style={{ color: theme.tint, fontWeight: '700' }}>
            Gérer les catégories
          </ThemedText>
          <Ionicons name="chevron-forward" size={16} color={theme.tint} />
        </Pressable>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
          <Pill label="Tous" active={categoryFilter === 'all'} onPress={() => setCategoryFilter('all')} />
          {categories.map((category) => (
            <Pill
              key={category.id}
              label={category.name}
              active={categoryFilter === category.id}
              onPress={() => setCategoryFilter(category.id)}
            />
          ))}
        </ScrollView>

        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <View style={[styles.emptyBadge, { backgroundColor: theme.backgroundElement }]}>
              <Ionicons name="pricetags-outline" size={26} color={theme.tint} />
            </View>
            <ThemedText themeColor="textSecondary" style={styles.emptyText}>
              Aucun produit pour le moment. Ajoutez ce que vous vendez pour suivre vos ventes et vos marges.
            </ThemedText>
          </View>
        ) : (
          <View style={[styles.productList, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
            {filtered.map((product, index) => {
              const margin = productMarginPercent(product);
              const lowStock = isLowStock(product);

              return (
                <Pressable
                  key={product.id}
                  onPress={() => router.push({ pathname: '/product/[id]', params: { id: String(product.id) } })}
                  onLongPress={() => handleDelete(product)}
                  style={[
                    styles.productRow,
                    index < filtered.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border },
                  ]}
                >
                  <View
                    style={[
                      styles.productIcon,
                      { backgroundColor: product.category?.color ? `${product.category.color}22` : theme.backgroundSelected },
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
                      {margin !== null && (
                        <ThemedText type="small" style={{ color: margin >= 0 ? theme.income : theme.danger }}>
                          {margin >= 0 ? '+' : ''}
                          {Math.round(margin)}%
                        </ThemedText>
                      )}
                    </View>
                  </View>
                  <View
                    style={[
                      styles.stockBadge,
                      { backgroundColor: lowStock ? `${theme.danger}1A` : theme.backgroundSelected },
                    ]}
                  >
                    <ThemedText type="small" style={{ color: !product.tracks_stock ? theme.textSecondary : lowStock ? theme.danger : theme.text }}>
                      {product.tracks_stock ? `${product.stock_quantity} en stock` : 'Service'}
                    </ThemedText>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
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
  subtitle: {
    marginBottom: Spacing.four,
  },
  statGrid: {
    marginBottom: Spacing.three,
  },
  categoriesLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    marginBottom: Spacing.three,
  },
  pillRow: {
    gap: Spacing.two,
    paddingRight: Spacing.four,
    marginBottom: Spacing.three,
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
  stockBadge: {
    borderRadius: 999,
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: Spacing.six,
  },
  emptyBadge: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.three,
  },
  emptyText: {
    textAlign: 'center',
    maxWidth: 280,
  },
});

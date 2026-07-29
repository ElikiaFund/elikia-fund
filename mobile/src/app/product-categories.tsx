import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { DEFAULT_PRODUCT_CATEGORY_COLOR, DEFAULT_PRODUCT_CATEGORY_ICON, PRODUCT_CATEGORY_COLORS, PRODUCT_CATEGORY_ICONS } from '@/constants/product-categories';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { productCategoryService, type ProductCategory } from '@/services/productCategoryService';

export default function ProductCategoriesScreen() {
  const theme = useTheme();
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draftName, setDraftName] = useState('');
  const [draftIcon, setDraftIcon] = useState(DEFAULT_PRODUCT_CATEGORY_ICON);
  const [draftColor, setDraftColor] = useState(DEFAULT_PRODUCT_CATEGORY_COLOR);
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(() => {
    setIsLoading(true);
    productCategoryService
      .list()
      .then(setCategories)
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
    setDraftIcon(DEFAULT_PRODUCT_CATEGORY_ICON);
    setDraftColor(DEFAULT_PRODUCT_CATEGORY_COLOR);
  }

  function handleEdit(category: ProductCategory) {
    setEditingId(category.id);
    setDraftName(category.name);
    setDraftIcon((category.icon as typeof DEFAULT_PRODUCT_CATEGORY_ICON) ?? DEFAULT_PRODUCT_CATEGORY_ICON);
    setDraftColor(category.color ?? DEFAULT_PRODUCT_CATEGORY_COLOR);
  }

  async function handleSave() {
    if (draftName.trim().length === 0) {
      return;
    }

    setIsSaving(true);

    try {
      const payload = { name: draftName.trim(), icon: draftIcon, color: draftColor };

      if (editingId) {
        await productCategoryService.update(editingId, payload);
      } else {
        await productCategoryService.create(payload);
      }

      resetDraft();
      load();
    } catch (e) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setIsSaving(false);
    }
  }

  function handleDelete(category: ProductCategory) {
    Alert.alert('Supprimer cette catégorie ?', `Les produits dans "${category.name}" ne seront plus catégorisés.`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            await productCategoryService.remove(category.id);
            if (editingId === category.id) {
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
            Organisez votre catalogue par catégorie pour mieux suivre vos ventes.
          </ThemedText>

          <View style={[styles.draftCard, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="smallBold" style={styles.draftTitle}>
              {editingId ? 'Modifier la catégorie' : 'Ajouter une catégorie'}
            </ThemedText>
            <TextInput
              value={draftName}
              onChangeText={setDraftName}
              placeholder="Nom (ex. Boissons)"
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { color: theme.text, borderColor: theme.border }]}
            />

            <View style={styles.presetRow}>
              {PRODUCT_CATEGORY_ICONS.map((icon) => (
                <Pressable
                  key={icon}
                  onPress={() => setDraftIcon(icon)}
                  style={[styles.iconSwatch, { borderColor: draftIcon === icon ? theme.tint : theme.border }]}
                >
                  <Ionicons name={icon} size={18} color={draftIcon === icon ? theme.tint : theme.textSecondary} />
                </Pressable>
              ))}
            </View>

            <View style={styles.presetRow}>
              {PRODUCT_CATEGORY_COLORS.map((color) => (
                <Pressable
                  key={color}
                  onPress={() => setDraftColor(color)}
                  style={[styles.colorSwatch, { backgroundColor: color }, draftColor === color && { borderWidth: 2, borderColor: theme.text }]}
                />
              ))}
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
          ) : categories.length === 0 ? (
            <ThemedText themeColor="textSecondary" style={styles.empty}>
              Aucune catégorie pour le moment.
            </ThemedText>
          ) : (
            <View style={[styles.list, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
              {categories.map((category, index) => (
                <View
                  key={category.id}
                  style={[
                    styles.row,
                    index < categories.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border },
                  ]}
                >
                  <View style={[styles.rowIcon, { backgroundColor: category.color ? `${category.color}22` : theme.backgroundSelected }]}>
                    <Ionicons
                      name={(category.icon as keyof typeof Ionicons.glyphMap) ?? 'pricetag-outline'}
                      size={16}
                      color={category.color ?? theme.textSecondary}
                    />
                  </View>
                  <ThemedText style={styles.rowLabel} numberOfLines={1}>
                    {category.name}
                  </ThemedText>
                  <Pressable onPress={() => handleEdit(category)} hitSlop={8} style={styles.rowAction}>
                    <Ionicons name="pencil-outline" size={18} color={theme.textSecondary} />
                  </Pressable>
                  <Pressable onPress={() => handleDelete(category)} hitSlop={8} style={styles.rowAction}>
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
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    fontSize: 15,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  iconSwatch: {
    width: 38,
    height: 38,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorSwatch: {
    width: 30,
    height: 30,
    borderRadius: 15,
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
  list: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    flex: 1,
  },
  rowAction: {
    padding: Spacing.one,
  },
});

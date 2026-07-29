import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { sheetStyles } from '@/components/select-sheet';
import { ThemedText } from '@/components/themed-text';
import { DEFAULT_PRODUCT_CATEGORY_COLOR, DEFAULT_PRODUCT_CATEGORY_ICON, PRODUCT_CATEGORY_COLORS, PRODUCT_CATEGORY_ICONS } from '@/constants/product-categories';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { productCategoryService, type ProductCategory } from '@/services/productCategoryService';

type CategorySelectSheetProps = {
  visible: boolean;
  categories: ProductCategory[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
  onCategoriesChange: (categories: ProductCategory[]) => void;
  onClose: () => void;
};

export function CategorySelectSheet({ visible, categories, selectedId, onSelect, onCategoriesChange, onClose }: CategorySelectSheetProps) {
  const theme = useTheme();
  const [isCreating, setIsCreating] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftIcon, setDraftIcon] = useState(DEFAULT_PRODUCT_CATEGORY_ICON);
  const [draftColor, setDraftColor] = useState(DEFAULT_PRODUCT_CATEGORY_COLOR);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setIsCreating(false);
    setDraftName('');
    setDraftIcon(DEFAULT_PRODUCT_CATEGORY_ICON);
    setDraftColor(DEFAULT_PRODUCT_CATEGORY_COLOR);
    setError(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleCreate() {
    if (draftName.trim().length === 0) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const category = await productCategoryService.create({ name: draftName.trim(), icon: draftIcon, color: draftColor });
      onCategoriesChange([...categories, category]);
      onSelect(category.id);
      handleClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={sheetStyles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        <View style={[sheetStyles.sheet, { backgroundColor: theme.background }]}>
          <View style={[sheetStyles.handle, { backgroundColor: theme.border }]} />
          <ThemedText type="smallBold" style={styles.title}>
            Catégorie
          </ThemedText>

          {isCreating ? (
            <View style={styles.form}>
              <TextInput
                value={draftName}
                onChangeText={setDraftName}
                placeholder="Nom de la catégorie"
                placeholderTextColor={theme.textSecondary}
                autoFocus
                style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement }]}
              />

              <View style={styles.presetRow}>
                {PRODUCT_CATEGORY_ICONS.map((icon) => (
                  <Pressable
                    key={icon}
                    onPress={() => setDraftIcon(icon)}
                    style={[
                      styles.iconSwatch,
                      { borderColor: draftIcon === icon ? theme.tint : theme.border, backgroundColor: theme.backgroundElement },
                    ]}
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
                    style={[
                      styles.colorSwatch,
                      { backgroundColor: color },
                      draftColor === color && { borderWidth: 2, borderColor: theme.text },
                    ]}
                  />
                ))}
              </View>

              {error && (
                <ThemedText type="small" style={{ color: theme.danger }}>
                  {error}
                </ThemedText>
              )}

              <View style={styles.formActions}>
                <Pressable onPress={reset} style={[styles.secondaryButton, { borderColor: theme.border }]}>
                  <ThemedText type="smallBold" themeColor="textSecondary">
                    Annuler
                  </ThemedText>
                </Pressable>
                <Pressable
                  onPress={handleCreate}
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
                      Créer
                    </ThemedText>
                  )}
                </Pressable>
              </View>
            </View>
          ) : (
            <>
              <ScrollView style={styles.optionsList} keyboardShouldPersistTaps="handled">
                <Pressable
                  onPress={() => {
                    onSelect(null);
                    handleClose();
                  }}
                  style={({ pressed }) => [styles.option, pressed && { backgroundColor: theme.backgroundElement }]}
                >
                  <View style={styles.optionLabel}>
                    <Ionicons name="pricetag-outline" size={18} color={theme.textSecondary} />
                    <ThemedText themeColor={selectedId === null ? 'text' : 'textSecondary'}>Aucune catégorie</ThemedText>
                  </View>
                  {selectedId === null && <Ionicons name="checkmark" size={20} color={theme.tint} />}
                </Pressable>

                {categories.map((category) => {
                  const selected = category.id === selectedId;

                  return (
                    <Pressable
                      key={category.id}
                      onPress={() => {
                        onSelect(category.id);
                        handleClose();
                      }}
                      style={({ pressed }) => [styles.option, pressed && { backgroundColor: theme.backgroundElement }]}
                    >
                      <View style={styles.optionLabel}>
                        {category.color && <View style={[styles.colorDot, { backgroundColor: category.color }]} />}
                        <Ionicons
                          name={(category.icon as keyof typeof Ionicons.glyphMap) ?? 'pricetag-outline'}
                          size={18}
                          color={selected ? theme.tint : theme.textSecondary}
                        />
                        <ThemedText style={selected ? { color: theme.tint, fontWeight: '700' } : undefined}>{category.name}</ThemedText>
                      </View>
                      {selected && <Ionicons name="checkmark" size={20} color={theme.tint} />}
                    </Pressable>
                  );
                })}
              </ScrollView>

              <Pressable onPress={() => setIsCreating(true)} style={styles.createRow}>
                <Ionicons name="add-circle-outline" size={18} color={theme.tint} />
                <ThemedText type="smallBold" style={{ color: theme.tint }}>
                  Nouvelle catégorie
                </ThemedText>
              </Pressable>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  title: {
    marginBottom: Spacing.two,
  },
  optionsList: {
    marginTop: Spacing.one,
    maxHeight: 320,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.three,
  },
  optionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  createRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'transparent',
  },
  form: {
    gap: Spacing.three,
    paddingBottom: Spacing.two,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 15,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  iconSwatch: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorSwatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.two,
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
});

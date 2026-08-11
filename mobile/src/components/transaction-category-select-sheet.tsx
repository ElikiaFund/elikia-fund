import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { sheetStyles } from '@/components/select-sheet';
import { ThemedText } from '@/components/themed-text';
import { DEFAULT_TRANSACTION_CATEGORY_ICON, TRANSACTION_CATEGORY_ICONS } from '@/constants/transaction-categories';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { transactionCategoryService, type TransactionCategory, type TransactionCategoryType } from '@/services/transactionCategoryService';

type TransactionCategorySelectSheetProps = {
  visible: boolean;
  type: TransactionCategoryType;
  categories: TransactionCategory[];
  selectedName: string | null;
  onSelect: (name: string) => void;
  onCategoriesChange: (categories: TransactionCategory[]) => void;
  onClose: () => void;
};

export function TransactionCategorySelectSheet({
  visible,
  type,
  categories,
  selectedName,
  onSelect,
  onCategoriesChange,
  onClose,
}: TransactionCategorySelectSheetProps) {
  const theme = useTheme();
  const [isCreating, setIsCreating] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftIcon, setDraftIcon] = useState(DEFAULT_TRANSACTION_CATEGORY_ICON);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setIsCreating(false);
    setDraftName('');
    setDraftIcon(DEFAULT_TRANSACTION_CATEGORY_ICON);
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
      const category = await transactionCategoryService.create(type, { name: draftName.trim(), icon: draftIcon });
      onCategoriesChange([...categories, category]);
      onSelect(category.name);
      handleClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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
                  {TRANSACTION_CATEGORY_ICONS.map((icon) => (
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
                  {categories.length === 0 && (
                    <ThemedText type="small" themeColor="textSecondary" style={styles.emptyHint}>
                      Aucune catégorie pour le moment — créez-en une ci-dessous.
                    </ThemedText>
                  )}

                  {categories.map((category) => {
                    const selected = category.name === selectedName;

                    return (
                      <Pressable
                        key={category.id}
                        onPress={() => {
                          onSelect(category.name);
                          handleClose();
                        }}
                        style={({ pressed }) => [styles.option, pressed && { backgroundColor: theme.backgroundElement }]}
                      >
                        <View style={styles.optionLabel}>
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
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  title: {
    marginBottom: Spacing.two,
  },
  optionsList: {
    marginTop: Spacing.one,
    maxHeight: 320,
  },
  emptyHint: {
    paddingVertical: Spacing.three,
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

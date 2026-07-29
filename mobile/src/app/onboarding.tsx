import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { FormField } from '@/components/form-field';
import { SelectSheet } from '@/components/select-sheet';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CONGO_DEPARTMENTS, type CongoDepartment } from '@/constants/congo-locations';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { COMPANY_CATEGORIES, companyService, type CompanyCategory } from '@/services/companyService';
import { CATALOG_ENABLED_CATEGORIES, productService } from '@/services/productService';

type DraftProduct = { name: string; sellPrice: string };

const CATALOG_HINTS: Partial<Record<CompanyCategory, string>> = {
  commerce: 'Ex. Boissons, Pain, Boîte de lait, Paquet de sucre',
  restauration: 'Ex. Plats, Boissons, Desserts',
  services: 'Ex. Coupe de cheveux, Réparation, Consultation',
};

export default function OnboardingScreen() {
  const theme = useTheme();
  const { refreshUser } = useAuth();
  const [name, setName] = useState('');
  const [category, setCategory] = useState<CompanyCategory | null>(null);
  const [otherCategory, setOtherCategory] = useState('');
  const [department, setDepartment] = useState<CongoDepartment | null>(null);
  const [isDepartmentSheetOpen, setIsDepartmentSheetOpen] = useState(false);
  const [useCapitalAsCity, setUseCapitalAsCity] = useState(true);
  const [customCity, setCustomCity] = useState('');
  const [products, setProducts] = useState<DraftProduct[]>([]);
  const [draftName, setDraftName] = useState('');
  const [draftPrice, setDraftPrice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const departmentEntry = CONGO_DEPARTMENTS.find((d) => d.value === department) ?? null;
  const city = useCapitalAsCity ? departmentEntry?.capital : customCity.trim();

  const canSubmit =
    name.trim().length > 0 &&
    category !== null &&
    (category !== 'autre' || otherCategory.trim().length > 0) &&
    department !== null &&
    !!city;
  const showCatalogStep = category !== null && (CATALOG_ENABLED_CATEGORIES as readonly string[]).includes(category);

  function handleSelectDepartment(value: string) {
    setDepartment(value as CongoDepartment);
    setUseCapitalAsCity(true);
    setCustomCity('');
  }

  function handleAddProduct() {
    if (draftName.trim().length === 0) {
      return;
    }

    setProducts((current) => [...current, { name: draftName.trim(), sellPrice: draftPrice }]);
    setDraftName('');
    setDraftPrice('');
  }

  function handleRemoveProduct(index: number) {
    setProducts((current) => current.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    if (!category || !department || !city) {
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await companyService.create(name.trim(), category, department, city, category === 'autre' ? otherCategory.trim() : undefined);

      if (products.length > 0) {
        await Promise.all(
          products.map((p) =>
            productService.create({
              name: p.name,
              sell_price: p.sellPrice ? Number(p.sellPrice.replace(',', '.')) : null,
              tracks_stock: category !== 'services',
            }),
          ),
        ).catch(() => {
          // Best-effort: the catalog can also be built later from the products screen.
        });
      }

      await refreshUser();
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
          <View style={styles.content}>
            <ThemedText type="title" style={styles.title}>
              Votre entreprise
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.subtitle}>
              Configurons votre première entreprise pour personnaliser Elikia Fund.
            </ThemedText>

            <View style={styles.form}>
              <FormField
                label="Nom de l'entreprise"
                placeholder="Ex. Boutique Elikia"
                autoCapitalize="words"
                value={name}
                onChangeText={setName}
              />
            </View>

            <ThemedText type="small" themeColor="textSecondary" style={styles.sectionLabel}>
              Catégorie
            </ThemedText>
            <View style={styles.grid}>
              {COMPANY_CATEGORIES.map((option) => {
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
                    <Ionicons name={option.icon} size={22} color={selected ? theme.tint : theme.textSecondary} />
                    <ThemedText type="small" themeColor={selected ? 'text' : 'textSecondary'} style={styles.cardLabel}>
                      {option.label}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>

            {category === 'autre' && (
              <View style={styles.otherField}>
                <FormField
                  label="Précisez votre secteur"
                  placeholder="Ex. Location de vélos"
                  autoCapitalize="sentences"
                  autoFocus
                  value={otherCategory}
                  onChangeText={setOtherCategory}
                />
              </View>
            )}

            <View style={styles.locationSection}>
              <ThemedText type="small" themeColor="textSecondary" style={styles.sectionLabel}>
                Localisation
              </ThemedText>
              <Pressable
                onPress={() => setIsDepartmentSheetOpen(true)}
                style={[styles.selectField, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}
              >
                <ThemedText themeColor={departmentEntry ? 'text' : 'textSecondary'}>{departmentEntry?.label ?? 'Département'}</ThemedText>
                <Ionicons name="chevron-down" size={16} color={theme.textSecondary} />
              </Pressable>

              {departmentEntry && (
                <View style={[styles.segmented, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                  <Pressable
                    onPress={() => setUseCapitalAsCity(true)}
                    style={[styles.segment, useCapitalAsCity && { backgroundColor: theme.backgroundSelected }]}
                  >
                    <ThemedText type="smallBold" themeColor={useCapitalAsCity ? 'text' : 'textSecondary'}>
                      {departmentEntry.capital}
                    </ThemedText>
                  </Pressable>
                  <Pressable
                    onPress={() => setUseCapitalAsCity(false)}
                    style={[styles.segment, !useCapitalAsCity && { backgroundColor: theme.backgroundSelected }]}
                  >
                    <ThemedText type="smallBold" themeColor={!useCapitalAsCity ? 'text' : 'textSecondary'}>
                      Autre ville
                    </ThemedText>
                  </Pressable>
                </View>
              )}

              {departmentEntry && !useCapitalAsCity && (
                <View style={styles.otherField}>
                  <FormField
                    label="Ville / commune"
                    placeholder="Ex. Nkayi"
                    autoCapitalize="words"
                    autoFocus
                    value={customCity}
                    onChangeText={setCustomCity}
                  />
                </View>
              )}
            </View>

            {showCatalogStep && (
              <View style={styles.catalogSection}>
                <ThemedText type="small" themeColor="textSecondary" style={styles.sectionLabel}>
                  Vos produits ou services (optionnel)
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.catalogHint}>
                  {category && CATALOG_HINTS[category]
                    ? CATALOG_HINTS[category]
                    : 'Ajoutez ce que vous vendez pour le retrouver rapidement lors de vos saisies.'}
                </ThemedText>

                {products.length > 0 && (
                  <View style={[styles.productList, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
                    {products.map((product, index) => (
                      <View
                        key={`${product.name}-${index}`}
                        style={[
                          styles.productRow,
                          index < products.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border },
                        ]}
                      >
                        <View style={styles.productInfo}>
                          <ThemedText numberOfLines={1}>{product.name}</ThemedText>
                          {product.sellPrice && (
                            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                              {product.sellPrice} FCFA
                            </ThemedText>
                          )}
                        </View>
                        <Pressable onPress={() => handleRemoveProduct(index)} hitSlop={8}>
                          <Ionicons name="close-circle" size={20} color={theme.textSecondary} />
                        </Pressable>
                      </View>
                    ))}
                  </View>
                )}

                <View style={[styles.draftRow, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
                  <TextInput
                    value={draftName}
                    onChangeText={setDraftName}
                    placeholder="Nom du produit"
                    placeholderTextColor={theme.textSecondary}
                    style={[styles.draftInput, styles.draftInputName, { color: theme.text }]}
                  />
                  <TextInput
                    value={draftPrice}
                    onChangeText={setDraftPrice}
                    placeholder="Prix"
                    placeholderTextColor={theme.textSecondary}
                    keyboardType="decimal-pad"
                    style={[
                      styles.draftInput,
                      styles.draftInputPrice,
                      { color: theme.text, borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: theme.border },
                    ]}
                  />
                  <Pressable onPress={handleAddProduct} hitSlop={8} style={styles.addButton}>
                    <Ionicons name="add-circle" size={26} color={theme.tint} />
                  </Pressable>
                </View>
              </View>
            )}

            {error && (
              <View style={[styles.errorBox, { backgroundColor: theme.backgroundElement, borderColor: theme.danger }]}>
                <ThemedText type="small" style={[styles.errorText, { color: theme.danger }]}>
                  {error}
                </ThemedText>
              </View>
            )}

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
                  Continuer
                </ThemedText>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <SelectSheet
        visible={isDepartmentSheetOpen}
        title="Département"
        options={CONGO_DEPARTMENTS.map((d) => ({ label: d.label, value: d.value }))}
        selectedValue={department ?? ''}
        onSelect={handleSelectDepartment}
        onClose={() => setIsDepartmentSheetOpen(false)}
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
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.six,
  },
  content: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 440,
  },
  title: {
    textAlign: 'center',
    fontSize: 34,
    lineHeight: 40,
  },
  subtitle: {
    textAlign: 'center',
    marginTop: Spacing.two,
    marginBottom: Spacing.five,
  },
  form: {
    marginBottom: Spacing.four,
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
    flexBasis: '47%',
    flexGrow: 1,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
  },
  cardLabel: {
    lineHeight: 18,
  },
  otherField: {
    marginTop: Spacing.three,
  },
  locationSection: {
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
  segmented: {
    flexDirection: 'row',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    padding: Spacing.half,
    marginTop: Spacing.two,
  },
  segment: {
    flex: 1,
    borderRadius: 11,
    paddingVertical: Spacing.two,
    alignItems: 'center',
  },
  catalogSection: {
    marginTop: Spacing.five,
  },
  catalogHint: {
    marginLeft: Spacing.one,
    marginBottom: Spacing.three,
  },
  productList: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    marginBottom: Spacing.three,
    overflow: 'hidden',
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  productInfo: {
    flex: 1,
  },
  draftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
  },
  draftInput: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.two,
    fontSize: 14,
  },
  draftInputName: {
    flex: 2,
  },
  draftInputPrice: {
    flex: 1,
  },
  addButton: {
    paddingHorizontal: Spacing.two,
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
  errorBox: {
    marginTop: Spacing.four,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  errorText: {
    textAlign: 'center',
  },
});

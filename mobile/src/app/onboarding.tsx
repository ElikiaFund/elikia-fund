import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { FormField } from '@/components/form-field';
import { SelectSheet } from '@/components/select-sheet';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ARRONDISSEMENTS_BY_CITY, CONGO_DEPARTMENTS, type CongoDepartment } from '@/constants/congo-locations';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useCompany } from '@/context/company-context';
import { useTheme } from '@/hooks/use-theme';
import { COMPANY_CATEGORIES, companyService, type CompanyCategory } from '@/services/companyService';
import { productService } from '@/services/productService';

type DraftProduct = { name: string; sellPrice: string };

const CATALOG_HINTS: Partial<Record<CompanyCategory, string>> = {
  commerce: 'Ex. Boissons, Pain, Boîte de lait, Paquet de sucre',
  restauration: 'Ex. Plats, Boissons, Desserts',
  services: 'Ex. Coupe de cheveux, Réparation, Consultation',
};

export default function OnboardingScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string }>();
  // Default (first-run) path is guard-driven from _layout.tsx; `mode=create` is pushed from the
  // company switcher to add a 2nd+ company to an already-onboarded account.
  const isAddingCompany = params.mode === 'create';
  const { user, refreshUser } = useAuth();
  const { refreshCompanies, selectCompany } = useCompany();
  const [name, setName] = useState('');
  const [category, setCategory] = useState<CompanyCategory | null>(null);
  const [otherCategory, setOtherCategory] = useState('');
  const [department, setDepartment] = useState<CongoDepartment | null>(null);
  const [isDepartmentSheetOpen, setIsDepartmentSheetOpen] = useState(false);
  const [useCapitalAsCity, setUseCapitalAsCity] = useState(true);
  const [customCity, setCustomCity] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [isArrondissementSheetOpen, setIsArrondissementSheetOpen] = useState(false);
  const [address, setAddress] = useState('');
  const [products, setProducts] = useState<DraftProduct[]>([]);
  const [draftName, setDraftName] = useState('');
  const [draftPrice, setDraftPrice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // A synchronous guard, not just the isSubmitting state: two taps landing before React
  // re-renders the button's disabled prop would otherwise both pass the isSubmitting check and
  // create two companies — this is exactly what happened when the screen looked stuck and got
  // tapped repeatedly.
  const isSubmittingRef = useRef(false);

  const departmentEntry = CONGO_DEPARTMENTS.find((d) => d.value === department) ?? null;
  const city = useCapitalAsCity ? departmentEntry?.capital : customCity.trim();

  // Only Brazzaville and Pointe-Noire are formally divided into arrondissements — every other
  // city falls back to the free-text "Quartier" field below.
  const arrondissements = city ? (ARRONDISSEMENTS_BY_CITY[city] ?? null) : null;

  // Clears a stale quartier/arrondissement value whenever the arrondissement-preset
  // availability changes (switching city, or between preset cities) — a previously-picked
  // Brazzaville arrondissement shouldn't linger as free text once the city changes.
  useEffect(() => {
    setNeighborhood('');
  }, [arrondissements]);

  // The "onboarding" screen stays registered (guard: isAuthenticated alone, see _layout.tsx —
  // it must also serve router.push('/onboarding?mode=create') from the company switcher after
  // onboarding is already done) so its guard never flips false on first-run completion, and
  // Stack.Protected's automatic "redirect when unauthorized" never fires. Navigate explicitly
  // once refreshUser() has actually landed the updated user in context — a useEffect (rather
  // than calling router.replace() right after the await) so this fires after _layout.tsx has
  // re-rendered with needsOnboarding=false and (tabs) is actually registered in the navigator.
  useEffect(() => {
    if (!isAddingCompany && user?.onboarding_completed_at) {
      router.replace('/');
    }
  }, [isAddingCompany, user?.onboarding_completed_at, router]);

  const canSubmit =
    name.trim().length > 0 &&
    category !== null &&
    (category !== 'autre' || otherCategory.trim().length > 0) &&
    department !== null &&
    !!city &&
    neighborhood.trim().length > 0;
  const showCatalogStep = category !== null;

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
    if (!category || !department || !city || isSubmittingRef.current) {
      return;
    }

    isSubmittingRef.current = true;
    setError(null);
    setIsSubmitting(true);

    try {
      const company = await companyService.create({
        name: name.trim(),
        category,
        otherCategory: category === 'autre' ? otherCategory.trim() : undefined,
        department,
        city,
        neighborhood: neighborhood.trim(),
        address: address.trim() || undefined,
      });

      // The new company must become active (X-Company-Id) before any company-scoped call below —
      // refreshCompanies() alone isn't enough when adding a 2nd+ company, since it would resolve
      // back to whichever company was already selected.
      await refreshCompanies();
      await selectCompany(company.id);

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

      if (isAddingCompany) {
        router.back();
      } else {
        await refreshUser();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Une erreur est survenue. Veuillez réessayer.');
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.content}>
            <ThemedText type="title" style={styles.title}>
              {isAddingCompany ? 'Nouvelle entreprise' : 'Votre entreprise'}
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.subtitle}>
              {isAddingCompany
                ? 'Ajoutez une nouvelle entreprise à votre compte.'
                : 'Configurons votre première entreprise pour personnaliser Elikia Fund.'}
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
                <ThemedText themeColor={departmentEntry ? 'text' : 'textSecondary'}>{departmentEntry?.capital ?? 'Ville'}</ThemedText>
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

              {departmentEntry && (
                <>
                  <View style={styles.otherField}>
                    {arrondissements ? (
                      <Pressable
                        onPress={() => setIsArrondissementSheetOpen(true)}
                        style={[styles.selectField, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}
                      >
                        <ThemedText themeColor={neighborhood ? 'text' : 'textSecondary'}>{neighborhood || 'Arrondissement'}</ThemedText>
                        <Ionicons name="chevron-down" size={16} color={theme.textSecondary} />
                      </Pressable>
                    ) : (
                      <FormField
                        label="Quartier"
                        placeholder="Ex. Centre-ville"
                        autoCapitalize="words"
                        value={neighborhood}
                        onChangeText={setNeighborhood}
                      />
                    )}
                  </View>
                  <View style={styles.otherField}>
                    <FormField
                      label="Adresse (facultatif)"
                      placeholder="Ex. 12 Avenue de la Paix"
                      autoCapitalize="sentences"
                      value={address}
                      onChangeText={setAddress}
                    />
                  </View>
                </>
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
        title="Ville"
        options={CONGO_DEPARTMENTS.map((d) => ({ label: d.capital, value: d.value }))}
        selectedValue={department ?? ''}
        onSelect={handleSelectDepartment}
        onClose={() => setIsDepartmentSheetOpen(false)}
      />

      {arrondissements && (
        <SelectSheet
          visible={isArrondissementSheetOpen}
          title="Arrondissement"
          options={arrondissements.map((a) => ({ label: a, value: a }))}
          selectedValue={neighborhood}
          onSelect={setNeighborhood}
          onClose={() => setIsArrondissementSheetOpen(false)}
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

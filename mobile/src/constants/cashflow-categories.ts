import type { Ionicons } from '@expo/vector-icons';

type Category = { value: string; label: string; icon: keyof typeof Ionicons.glyphMap };

export const INCOME_CATEGORIES: Category[] = [
  { value: 'vente', label: 'Vente', icon: 'storefront-outline' },
  { value: 'salaire', label: 'Salaire', icon: 'briefcase-outline' },
  { value: 'pret', label: 'Prêt reçu', icon: 'hand-left-outline' },
  { value: 'autre_revenu', label: 'Autre revenu', icon: 'ellipsis-horizontal-outline' },
];

export const EXPENSE_CATEGORIES: Category[] = [
  { value: 'alimentation', label: 'Alimentation', icon: 'restaurant-outline' },
  { value: 'transport', label: 'Transport', icon: 'car-outline' },
  { value: 'logement', label: 'Logement', icon: 'home-outline' },
  { value: 'sante', label: 'Santé', icon: 'medkit-outline' },
  { value: 'fournitures', label: 'Fournitures', icon: 'cube-outline' },
  { value: 'loisirs', label: 'Loisirs', icon: 'happy-outline' },
  { value: 'autre_depense', label: 'Autre dépense', icon: 'ellipsis-horizontal-outline' },
];

const ALL_CATEGORIES = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES];

export function categoryLabel(value: string): string {
  return ALL_CATEGORIES.find((category) => category.value === value)?.label ?? value;
}

export function categoryIcon(value: string): keyof typeof Ionicons.glyphMap {
  return ALL_CATEGORIES.find((category) => category.value === value)?.icon ?? 'pricetag-outline';
}

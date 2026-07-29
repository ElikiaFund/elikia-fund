import type { Ionicons } from '@expo/vector-icons';

/** Preset icon choices offered when creating/editing a product category — keeps the picker to a
 * curated, sensibly-sized set rather than exposing the entire Ionicons catalog. */
export const PRODUCT_CATEGORY_ICONS: (keyof typeof Ionicons.glyphMap)[] = [
  'pricetag-outline',
  'fast-food-outline',
  'wine-outline',
  'cart-outline',
  'shirt-outline',
  'construct-outline',
  'cut-outline',
  'sparkles-outline',
  'medkit-outline',
  'briefcase-outline',
];

/** Preset color swatches for category badges/pills and chart legends. */
export const PRODUCT_CATEGORY_COLORS = ['#A069DA', '#4C7A63', '#B5544A', '#D9A441', '#6B9AC4', '#C77DAE', '#7C8471', '#6B675E'];

export const DEFAULT_PRODUCT_CATEGORY_ICON: keyof typeof Ionicons.glyphMap = 'pricetag-outline';
export const DEFAULT_PRODUCT_CATEGORY_COLOR = PRODUCT_CATEGORY_COLORS[0];

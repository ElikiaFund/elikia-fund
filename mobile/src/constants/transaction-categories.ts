import type { Ionicons } from '@expo/vector-icons';

/** Preset icon choices offered when creating a cash flow category — keeps the picker to a
 * curated, sensibly-sized set rather than exposing the entire Ionicons catalog. */
export const TRANSACTION_CATEGORY_ICONS: (keyof typeof Ionicons.glyphMap)[] = [
  'pricetag-outline',
  'storefront-outline',
  'briefcase-outline',
  'hand-left-outline',
  'restaurant-outline',
  'car-outline',
  'home-outline',
  'medkit-outline',
  'cube-outline',
  'archive-outline',
  'happy-outline',
  'ellipsis-horizontal-outline',
];

export const DEFAULT_TRANSACTION_CATEGORY_ICON: keyof typeof Ionicons.glyphMap = 'pricetag-outline';

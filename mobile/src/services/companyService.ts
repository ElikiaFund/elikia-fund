import type { Ionicons } from '@expo/vector-icons';

import { apiService } from '@/services/apiService';
import type { Company } from '@/services/authService';

export type CompanyCategory =
  | 'commerce'
  | 'agriculture'
  | 'artisanat'
  | 'restauration'
  | 'transport'
  | 'services'
  | 'beaute_bien_etre'
  | 'sante'
  | 'education'
  | 'technologie'
  | 'autre';

export const COMPANY_CATEGORIES: { value: CompanyCategory; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'commerce', label: 'Commerce', icon: 'storefront-outline' },
  { value: 'agriculture', label: 'Agriculture', icon: 'leaf-outline' },
  { value: 'artisanat', label: 'Artisanat', icon: 'hammer-outline' },
  { value: 'restauration', label: 'Restauration', icon: 'restaurant-outline' },
  { value: 'transport', label: 'Transport', icon: 'car-outline' },
  { value: 'services', label: 'Services', icon: 'briefcase-outline' },
  { value: 'beaute_bien_etre', label: 'Beauté & bien-être', icon: 'sparkles-outline' },
  { value: 'sante', label: 'Santé', icon: 'medkit-outline' },
  { value: 'education', label: 'Éducation', icon: 'school-outline' },
  { value: 'technologie', label: 'Technologie', icon: 'hardware-chip-outline' },
  { value: 'autre', label: 'Autre', icon: 'ellipsis-horizontal-outline' },
];

export const companyService = {
  create(name: string, category: CompanyCategory, otherCategory?: string) {
    return apiService
      .post<Company>('/onboarding/company', { name, category, other_category: otherCategory })
      .then((r) => r.data);
  },
};

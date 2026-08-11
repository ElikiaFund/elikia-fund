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

export type CreateCompanyPayload = {
  name: string;
  category: CompanyCategory;
  otherCategory?: string;
  department: string;
  city: string;
  neighborhood: string;
  address?: string;
};

export const companyService = {
  /** Every company the authenticated user owns — feeds the mobile switcher. */
  list() {
    return apiService.get<Company[]>('/companies').then((r) => r.data);
  },

  /** Used both for first-time onboarding and for adding a 2nd+ company via the switcher. */
  create(payload: CreateCompanyPayload) {
    return apiService
      .post<Company>('/companies', {
        name: payload.name,
        category: payload.category,
        other_category: payload.otherCategory,
        department: payload.department,
        city: payload.city,
        neighborhood: payload.neighborhood,
        address: payload.address || undefined,
      })
      .then((r) => r.data);
  },

  /** Cascades to the company's transactions/products/categories/cash sessions server-side —
   * never touches the caller's vault, which is strictly 1:1 with the user, not the company. */
  remove(id: number) {
    return apiService.delete(`/companies/${id}`);
  },
};

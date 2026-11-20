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

/** Yabeto's hosted identity-verification states, plus null before the merchant has started. */
export type VerificationStatus = 'created' | 'documents_submitted' | 'in_review' | 'approved' | 'rejected' | 'needs_info';

export type ConnectStatus = {
  /** True when money is locked until the identity is verified. */
  requires_verification: boolean;
  has_account: boolean;
  verification_status: VerificationStatus | null;
  is_connect_ready: boolean;
  onboarding_url: string | null;
  onboarding_expires_at: string | null;
  compliance_checked_at: string | null;
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

  /** Also refreshes the state from Yabeto server-side, so calling it on focus picks up an approval right away. */
  getConnectStatus(id: number) {
    return apiService.get<ConnectStatus>(`/companies/${id}/yabeto-connect`).then((r) => r.data);
  },

  /** Hosted verification link on verify.yabetoo.com — requesting it again resumes the same session. */
  requestOnboardingLink(id: number) {
    return apiService
      .post<{ onboarding_url: string; expires_at: string | null }>(`/companies/${id}/yabeto-connect/onboarding-link`)
      .then((r) => r.data);
  },
};

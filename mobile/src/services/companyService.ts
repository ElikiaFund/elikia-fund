import { apiService } from '@/services/apiService';
import type { Company } from '@/services/authService';

export type CompanyCategory = 'commerce' | 'agriculture' | 'services' | 'transport' | 'artisanat' | 'autre';

export const COMPANY_CATEGORIES: { value: CompanyCategory; label: string }[] = [
  { value: 'commerce', label: 'Commerce' },
  { value: 'agriculture', label: 'Agriculture' },
  { value: 'services', label: 'Services' },
  { value: 'transport', label: 'Transport' },
  { value: 'artisanat', label: 'Artisanat' },
  { value: 'autre', label: 'Autre' },
];

export const companyService = {
  create(name: string, category: CompanyCategory) {
    return apiService.post<Company>('/onboarding/company', { name, category }).then((r) => r.data);
  },
};

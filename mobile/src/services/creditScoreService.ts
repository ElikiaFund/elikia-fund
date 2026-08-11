import { apiService } from '@/services/apiService';

export type CreditScoreVerdict = 'eligible' | 'review' | 'not_eligible';

export type CreditScoreBreakdownItem = {
  key: string;
  label: string;
  value: number;
  points: number;
  weight: number;
  weighted_points: number;
};

export type CreditScore = {
  score: number;
  verdict: CreditScoreVerdict;
  breakdown: CreditScoreBreakdownItem[];
};

export const creditScoreService = {
  get(companyId: number) {
    return apiService.get<CreditScore>(`/companies/${companyId}/credit-score`).then((r) => r.data);
  },
};

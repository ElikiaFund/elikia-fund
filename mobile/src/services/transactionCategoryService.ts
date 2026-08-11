import { apiService } from '@/services/apiService';

export type TransactionCategoryType = 'income' | 'expense';

export type TransactionCategory = {
  id: number;
  company_id: number;
  type: TransactionCategoryType;
  name: string;
  icon: string | null;
  color: string | null;
  created_at: string;
  updated_at: string;
};

export type TransactionCategoryPayload = {
  name: string;
  icon?: string | null;
  color?: string | null;
};

export const transactionCategoryService = {
  list(type?: TransactionCategoryType) {
    return apiService
      .get<TransactionCategory[]>('/transaction-categories', { params: type ? { type } : undefined })
      .then((r) => r.data);
  },

  create(type: TransactionCategoryType, payload: TransactionCategoryPayload) {
    return apiService.post<TransactionCategory>('/transaction-categories', { type, ...payload }).then((r) => r.data);
  },

  update(id: number, payload: TransactionCategoryPayload) {
    return apiService.put<TransactionCategory>(`/transaction-categories/${id}`, payload).then((r) => r.data);
  },

  remove(id: number) {
    return apiService.delete(`/transaction-categories/${id}`);
  },
};

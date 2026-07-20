import { apiService } from '@/services/apiService';

export type TransactionType = 'income' | 'expense';

export type RemoteTransaction = {
  id: number;
  uuid: string;
  user_id: number;
  type: TransactionType;
  amount: string;
  category: string;
  note: string | null;
  product_name: string | null;
  quantity: number | null;
  occurred_at: string;
  created_at: string;
};

export type CreateTransactionPayload = {
  uuid: string;
  type: TransactionType;
  amount: number;
  category: string;
  note: string | null;
  product_name: string | null;
  quantity: number | null;
  occurred_at: string;
};

export const transactionService = {
  list() {
    return apiService.get<RemoteTransaction[]>('/transactions').then((r) => r.data);
  },

  create(payload: CreateTransactionPayload) {
    return apiService.post<RemoteTransaction>('/transactions', payload).then((r) => r.data);
  },
};

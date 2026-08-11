import { apiService } from '@/services/apiService';

export type TransactionType = 'income' | 'expense';

export type RemoteTransaction = {
  id: number;
  uuid: string;
  company_id: number;
  type: TransactionType;
  amount: string;
  category: string;
  payment_method: string | null;
  note: string | null;
  product_name: string | null;
  quantity: number | null;
  product_id: number | null;
  /** Snapshot of the linked product's cost_price at the moment of this transaction — server-set,
   * never sent by the client. */
  unit_cost: string | null;
  occurred_at: string;
  created_at: string;
};

export type CreateTransactionPayload = {
  uuid: string;
  type: TransactionType;
  amount: number;
  category: string;
  payment_method: string;
  note: string | null;
  product_name: string | null;
  quantity: number | null;
  product_id: number | null;
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

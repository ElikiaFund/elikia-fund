import type { LocalTransaction } from '@/db/database';
import { apiService } from '@/services/apiService';

export type SyncTransactionPayload = Omit<LocalTransaction, 'created_at' | 'synced' | 'user_id'>;

export const syncService = {
  push(transactions: SyncTransactionPayload[]) {
    return apiService.post<{ accepted: string[] }>('/sync', { transactions }).then((r) => r.data);
  },
};

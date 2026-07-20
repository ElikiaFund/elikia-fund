import { apiService } from '@/services/apiService';

export type AppNotification = {
  id: number;
  user_id: number;
  group_id: number | null;
  type:
    | 'contribution_reminder'
    | 'late_payment'
    | 'late_payment_summary'
    | 'cycle_report'
    | 'vault_deposit_succeeded'
    | 'vault_deposit_failed'
    | 'vault_withdraw_succeeded'
    | 'vault_withdraw_failed'
    | 'contribution_succeeded'
    | 'contribution_failed';
  cycle_period: string | null;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
};

export const notificationService = {
  list() {
    return apiService.get<AppNotification[]>('/me/notifications').then((r) => r.data);
  },

  markRead(id: number) {
    return apiService.post<AppNotification>(`/me/notifications/${id}/read`).then((r) => r.data);
  },

  markAllRead() {
    return apiService.post('/me/notifications/read-all');
  },
};

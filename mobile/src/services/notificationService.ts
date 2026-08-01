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
    | 'contribution_failed'
    | 'tontine_payout_received'
    | 'tontine_payout_broadcast'
    | 'tontine_payout_confirmed'
    | 'tontine_payout_blocked_no_vault'
    | 'tontine_round_completed'
    | 'tontine_recipient_order_changed'
    | 'tontine_recipient_decided'
    | 'tontine_member_removed'
    | 'tontine_member_removed_broadcast';
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

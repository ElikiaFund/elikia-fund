import { apiService } from '@/services/apiService';

export type RemoteCashSession = {
  id: number;
  uuid: string;
  company_id: number;
  period_start: string | null;
  closed_at: string;
  expected_balance: string;
  counted_balance: string;
  variance: string;
  notes: string | null;
  created_at: string;
};

export type CurrentCashSession = {
  period_start: string | null;
  expected_balance: number;
  as_of: string;
  schedule_label: string | null;
};

export type CloseCashSessionPayload = {
  uuid: string;
  period_start: string | null;
  closed_at: string;
  expected_balance: number;
  counted_balance: number;
  notes: string | null;
};

export const cashSessionService = {
  list() {
    return apiService.get<RemoteCashSession[]>('/cash-sessions').then((r) => r.data);
  },

  /** The live, authoritative expected balance since the last closing — used online only. */
  current() {
    return apiService.get<CurrentCashSession>('/cash-sessions/current').then((r) => r.data);
  },

  close(payload: CloseCashSessionPayload) {
    return apiService.post<RemoteCashSession>('/cash-sessions/close', payload).then((r) => r.data);
  },
};

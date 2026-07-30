import { apiService } from '@/services/apiService';

export type CreateSupportTicketPayload = {
  email: string;
  subject: string;
  message: string;
};

export type SupportTicket = {
  id: number;
  user_id: number;
  email: string;
  subject: string;
  message: string;
  created_at: string;
};

export const supportService = {
  create(payload: CreateSupportTicketPayload) {
    return apiService.post<SupportTicket>('/support-tickets', payload).then((r) => r.data);
  },
};

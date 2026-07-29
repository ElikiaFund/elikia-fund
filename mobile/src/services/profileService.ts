import { apiService } from '@/services/apiService';
import type { AuthUser } from '@/services/authService';

export type UpdateProfilePayload = {
  name: string;
  email: string;
  phone: string | null;
  currentPassword?: string;
  password?: string;
  passwordConfirmation?: string;
};

export type UpdateCashSessionSettingsPayload = {
  cash_session_frequency: 'daily' | 'weekly';
  cash_session_day: number | null;
  cash_session_reminder_time: string | null;
  cash_session_reminders_enabled: boolean;
};

export const profileService = {
  update(payload: UpdateProfilePayload) {
    return apiService
      .put<AuthUser>('/me', {
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        current_password: payload.currentPassword,
        password: payload.password,
        password_confirmation: payload.passwordConfirmation,
      })
      .then((r) => r.data);
  },

  updateCashSessionSettings(payload: UpdateCashSessionSettingsPayload) {
    return apiService.put<AuthUser>('/me/cash-session-settings', payload).then((r) => r.data);
  },

  uploadAvatar(uri: string) {
    const formData = new FormData();
    const filename = uri.split('/').pop() ?? 'avatar.jpg';
    const extension = filename.split('.').pop()?.toLowerCase();
    const mimeType = extension === 'png' ? 'image/png' : 'image/jpeg';

    formData.append('avatar', { uri, name: filename, type: mimeType } as unknown as Blob);

    return apiService
      .post<AuthUser>('/me/avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      .then((r) => r.data);
  },
};

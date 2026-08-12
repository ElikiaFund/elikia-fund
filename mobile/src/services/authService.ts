import { apiService } from '@/services/apiService';

export type Company = {
  id: number;
  name: string;
  category: string;
  other_category: string | null;
  department: string | null;
  city: string | null;
  neighborhood: string | null;
  address: string | null;
};

export type AuthUser = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  is_admin: boolean;
  /** Whether this person has ever set a vault PIN — one shared PIN across every company vault
   * they can reach, not per-vault. Used by vault-activate.tsx to decide whether activating a
   * 2nd/3rd company's vault should ask to *confirm* the existing PIN instead of choosing a new one. */
  has_pin_set: boolean;
  /** True when the account still has the generic placeholder name — happens on Apple sign-in
   * when Apple withholds the real name (it's only ever shared on the very first authorization
   * for a given Apple id + app). Mobile prompts once to collect a real name when this is true. */
  needs_name: boolean;
  onboarding_completed_at: string | null;
  created_at: string;
  cash_session_frequency: 'daily' | 'weekly';
  cash_session_day: number | null;
  cash_session_reminder_time: string | null;
  cash_session_reminders_enabled: boolean;
};

export type AuthResponse = {
  user: AuthUser;
  token: string;
};

export const authService = {
  register(name: string, phone: string, password: string) {
    return apiService.post<AuthResponse>('/auth/register', { name, phone, password }).then((r) => r.data);
  },

  login(phone: string, password: string) {
    return apiService.post<AuthResponse>('/auth/login', { phone, password }).then((r) => r.data);
  },

  loginWithGoogle(idToken: string) {
    return apiService.post<AuthResponse>('/auth/google', { id_token: idToken }).then((r) => r.data);
  },

  loginWithApple(identityToken: string, name?: string) {
    return apiService.post<AuthResponse>('/auth/apple', { identity_token: identityToken, name }).then((r) => r.data);
  },

  loginWithFacebook(accessToken: string) {
    return apiService.post<AuthResponse>('/auth/facebook', { access_token: accessToken }).then((r) => r.data);
  },

  logout() {
    return apiService.post('/logout');
  },

  me() {
    return apiService.get<AuthUser>('/me').then((r) => r.data);
  },
};

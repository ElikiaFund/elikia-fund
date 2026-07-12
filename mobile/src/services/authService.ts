import { apiService } from '@/services/apiService';

export type Company = {
  id: number;
  name: string;
  category: string;
};

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  avatar_url: string | null;
  is_admin: boolean;
  onboarding_completed_at: string | null;
  company: Company | null;
};

export type AuthResponse = {
  user: AuthUser;
  token: string;
};

export const authService = {
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

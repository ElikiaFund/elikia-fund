import * as SecureStore from 'expo-secure-store';
import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';

import { backfillLegacyUserId } from '@/db/database';
import { registerForPushNotifications } from '@/lib/push-notifications';
import { setApiAuthToken } from '@/services/apiService';
import { authService, type AuthResponse, type AuthUser } from '@/services/authService';

const TOKEN_KEY = 'elikia_fund_token';

type AuthContextValue = {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  register: (name: string, phone: string, password: string) => Promise<void>;
  login: (phone: string, password: string) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  loginWithApple: (identityToken: string, name?: string) => Promise<void>;
  loginWithFacebook: (accessToken: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    restoreSession();
  }, []);

  async function restoreSession() {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);

    if (token) {
      setApiAuthToken(token);

      try {
        const restoredUser = await authService.me();
        setUser(restoredUser);
        registerForPushNotifications().catch(() => {});
        backfillLegacyUserId(restoredUser.id).catch(() => {});
      } catch {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        setApiAuthToken(null);
      }
    }

    setIsLoading(false);
  }

  async function applySession({ user, token }: AuthResponse) {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    setApiAuthToken(token);
    setUser(user);
    registerForPushNotifications().catch(() => {});
    backfillLegacyUserId(user.id).catch(() => {});
  }

  async function register(name: string, phone: string, password: string) {
    await applySession(await authService.register(name, phone, password));
  }

  async function login(phone: string, password: string) {
    await applySession(await authService.login(phone, password));
  }

  async function loginWithGoogle(idToken: string) {
    await applySession(await authService.loginWithGoogle(idToken));
  }

  async function loginWithApple(identityToken: string, name?: string) {
    await applySession(await authService.loginWithApple(identityToken, name));
  }

  async function loginWithFacebook(accessToken: string) {
    await applySession(await authService.loginWithFacebook(accessToken));
  }

  async function refreshUser() {
    setUser(await authService.me());
  }

  async function logout() {
    try {
      await authService.logout();
    } catch {
      // Already logged out server-side (expired/revoked token) — clear local state anyway.
    }

    await SecureStore.deleteItemAsync(TOKEN_KEY);
    setApiAuthToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: user !== null,
        register,
        login,
        loginWithGoogle,
        loginWithApple,
        loginWithFacebook,
        logout,
        refreshUser,
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}

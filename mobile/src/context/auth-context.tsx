import * as SecureStore from 'expo-secure-store';
import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';

import { clearActiveCashSession } from '@/db/database';
import { registerForPushNotifications } from '@/lib/push-notifications';
import { ApiError, setApiAuthToken } from '@/services/apiService';
import { authService, type AuthResponse, type AuthUser } from '@/services/authService';

const TOKEN_KEY = 'elikia_fund_token';
// Last known-good profile, refreshed on every successful /me — lets restoreSession() keep the
// user signed in when it can't reach the API at all (offline/timeout/5xx), instead of treating
// "couldn't verify" the same as "the server said this token is invalid".
const CACHED_USER_KEY = 'elikia_fund_cached_user';

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
        await cacheUser(restoredUser);
        registerForPushNotifications().catch(() => {});
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) {
          // The server explicitly rejected this token (expired/revoked) — a genuine logout.
          await SecureStore.deleteItemAsync(TOKEN_KEY);
          await SecureStore.deleteItemAsync(CACHED_USER_KEY);
          setApiAuthToken(null);
        } else {
          // Couldn't reach the API at all (offline, timeout, 5xx) — nothing here proves the
          // session is actually invalid, so don't sign the user out and lock them out of the
          // app until they happen to reconnect. Fall back to the last known-good profile so
          // isAuthenticated stays true; the token itself is left untouched and gets re-verified
          // for real the next time any authenticated request actually reaches the server.
          const cached = await SecureStore.getItemAsync(CACHED_USER_KEY);

          if (cached) {
            try {
              setUser(JSON.parse(cached));
            } catch {
              // Corrupted cache — nothing to restore from, but the token is still kept.
            }
          }
        }
      }
    }

    setIsLoading(false);
  }

  async function cacheUser(userToCache: AuthUser) {
    await SecureStore.setItemAsync(CACHED_USER_KEY, JSON.stringify(userToCache)).catch(() => {});
  }

  async function applySession({ user, token }: AuthResponse) {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    await cacheUser(user);
    setApiAuthToken(token);
    setUser(user);
    registerForPushNotifications().catch(() => {});
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
    const refreshedUser = await authService.me();
    setUser(refreshedUser);
    await cacheUser(refreshedUser);
  }

  async function logout() {
    try {
      await authService.logout();
    } catch {
      // Already logged out server-side (expired/revoked token) — clear local state anyway.
    }

    // The "active session" marker is local-only and deliberately scoped to this auth session —
    // it must not resurrect a stale "in progress" state next time someone logs into this account.
    if (user) {
      await clearActiveCashSession(user.id).catch(() => {});
    }

    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(CACHED_USER_KEY);
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

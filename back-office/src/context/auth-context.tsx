import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react'

import { setApiAuthToken } from '@/services/apiService'
import { authService, type AdminUser, type AuthResponse } from '@/services/authService'

const TOKEN_KEY = 'elikia_fund_admin_token'

type AuthContextValue = {
  user: AdminUser | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  updateUser: (user: AdminUser) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AdminUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    restoreSession()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function restoreSession() {
    const token = localStorage.getItem(TOKEN_KEY)

    if (token) {
      setApiAuthToken(token)

      try {
        setUser(await authService.me())
      } catch {
        localStorage.removeItem(TOKEN_KEY)
        setApiAuthToken(null)
      }
    }

    setIsLoading(false)
  }

  function applySession({ user, token }: AuthResponse) {
    localStorage.setItem(TOKEN_KEY, token)
    setApiAuthToken(token)
    setUser(user)
  }

  async function login(email: string, password: string) {
    applySession(await authService.login(email, password))
  }

  async function logout() {
    try {
      await authService.logout()
    } catch {
      // Already logged out server-side (expired/revoked token) — clear local state anyway.
    }

    localStorage.removeItem(TOKEN_KEY)
    setApiAuthToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated: user !== null, login, logout, updateUser: setUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }

  return context
}

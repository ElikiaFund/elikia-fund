import { apiService } from '@/services/apiService'

export type AdminUser = {
  id: number
  name: string
  email: string
  avatar_url: string | null
  is_admin: boolean
}

export type AuthResponse = {
  user: AdminUser
  token: string
}

export const authService = {
  login(email: string, password: string) {
    return apiService.post<AuthResponse>('/admin/login', { email, password }).then((r) => r.data)
  },

  logout() {
    return apiService.post('/logout')
  },

  me() {
    return apiService.get<AdminUser>('/me').then((r) => r.data)
  },
}

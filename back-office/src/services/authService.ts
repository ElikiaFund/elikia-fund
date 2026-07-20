import { apiService } from '@/services/apiService'

export type AdminRole = {
  id: number
  name: string
  description: string | null
}

export type AdminUser = {
  id: number
  name: string
  email: string
  avatar_url: string | null
  is_admin: boolean
  role: AdminRole | null
}

export type AuthResponse = {
  user: AdminUser
  token: string
}

export type UpdateProfilePayload = {
  name: string
  email: string
  current_password?: string
  password?: string
  password_confirmation?: string
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

  updateProfile(data: UpdateProfilePayload) {
    return apiService.put<AdminUser>('/me', data).then((r) => r.data)
  },

  uploadAvatar(file: File) {
    const formData = new FormData()
    formData.append('avatar', file)
    return apiService.post<AdminUser>('/me/avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data)
  },
}

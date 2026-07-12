import { apiService } from '@/services/apiService'

export type AdminCompany = {
  id: number
  user_id: number
  name: string
  category: string
  created_at: string
  updated_at: string
}

export type AdminUser = {
  id: number
  name: string
  email: string
  is_admin: boolean
  avatar_url: string | null
  onboarding_completed_at: string | null
  created_at: string
  updated_at: string
  company: AdminCompany | null
}

export type AdminTransaction = {
  id: number
  uuid: string
  user_id: number
  type: 'income' | 'expense'
  amount: string
  category: string
  note: string | null
  occurred_at: string
  created_at: string
  user: AdminUser
}

export type AdminContribution = {
  id: number
  group_id: number
  user_id: number
  amount: string
  cycle_period: string
  paid_at: string
}

export type AdminGroup = {
  id: number
  uuid: string
  name: string
  contribution_amount: string
  frequency: 'weekly' | 'monthly'
  invite_code: string
  owner_id: number
  created_at: string
  members_count: number
  contributions_sum_amount: string | null
  contributions: AdminContribution[]
  owner: AdminUser
}

export type AdminCompanyWithOwner = AdminCompany & { user: AdminUser }

export type AdminStats = {
  users_count: number
  transactions_volume: number
  vault_balance_total: number
  active_groups_count: number
}

export const adminService = {
  stats() {
    return apiService.get<AdminStats>('/admin/stats').then((r) => r.data)
  },

  listUsers() {
    return apiService.get<AdminUser[]>('/admin/users').then((r) => r.data)
  },

  deleteUser(id: number) {
    return apiService.delete(`/admin/users/${id}`)
  },

  listTransactions() {
    return apiService.get<AdminTransaction[]>('/admin/transactions').then((r) => r.data)
  },

  deleteTransaction(id: number) {
    return apiService.delete(`/admin/transactions/${id}`)
  },

  listGroups() {
    return apiService.get<AdminGroup[]>('/admin/groups').then((r) => r.data)
  },

  deleteGroup(id: number) {
    return apiService.delete(`/admin/groups/${id}`)
  },

  listCompanies() {
    return apiService.get<AdminCompanyWithOwner[]>('/admin/companies').then((r) => r.data)
  },

  deleteCompany(id: number) {
    return apiService.delete(`/admin/companies/${id}`)
  },
}

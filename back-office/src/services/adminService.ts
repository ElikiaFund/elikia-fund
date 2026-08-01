import { apiService } from '@/services/apiService'

export type AdminCompany = {
  id: number
  user_id: number
  name: string
  category: string
  other_category: string | null
  department: string | null
  city: string | null
  neighborhood: string | null
  address: string | null
  created_at: string
  updated_at: string
}

export type AdminRole = {
  id: number
  name: string
  description: string | null
  created_at: string
  updated_at: string
  users_count?: number
  permissions: AdminPermission[]
}

export type AdminPermission = {
  id: number
  key: string
  label: string
  group: string
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
  role?: AdminRole | null
}

export type AdminTransactionBase = {
  id: number
  uuid: string
  user_id: number
  type: 'income' | 'expense'
  amount: string
  category: string
  note: string | null
  product_name: string | null
  quantity: number | null
  occurred_at: string
  created_at: string
}

export type AdminTransaction = AdminTransactionBase & { user: AdminUser }

export type AdminContribution = {
  id: number
  group_id: number
  user_id: number
  amount: string
  fee_amount: string
  net_amount: string
  cycle_period: string
  paid_at: string
  status: string
  provider: string | null
}

export type AdminContributionWithUser = AdminContribution & { user: AdminUser }

export type AdminPayout = {
  id: number
  cycle_period: string
  round_number: number
  paid_out_at: string
  user: AdminUser | null
  vault_movement: { amount: string } | null
}

export type AdminGroupBase = {
  id: number
  uuid: string
  name: string
  contribution_amount: string
  frequency: 'weekly' | 'monthly'
  max_members: number | null
  invite_code: string
  owner_id: number
  auto_payout_enabled: boolean
  round_number: number
  round_status: 'active' | 'completed'
  recipient_order_updated_at: string | null
  created_at: string
}

export type AdminGroup = AdminGroupBase & {
  members_count: number
  contributions_sum_amount: string | null
  contributions: AdminContribution[]
  owner: AdminUser
}

export type AdminGroupDetail = AdminGroupBase & {
  members_count: number
  contributions_sum_amount: string | null
  owner: AdminUser
  members: (AdminUser & { pivot: { joined_at: string } })[]
  removed_members: (AdminUser & { pivot: { joined_at: string; removed_at: string } })[]
  contributions: AdminContributionWithUser[]
  cycle_recipients: AdminPayout[]
}

export type AdminCompanyWithOwner = AdminCompany & { user: AdminUser }

export type AdminWaitlistEntry = {
  id: number
  name: string | null
  email: string
  created_at: string
}

export type AdminProductCategory = {
  id: number
  name: string
  icon: string | null
  color: string | null
}

export type AdminProduct = {
  id: number
  name: string
  category: AdminProductCategory | null
  sell_price: string
  cost_price: string | null
  tracks_stock: boolean
  stock_quantity: number
  low_stock_threshold: number | null
  created_at: string
}

export type AdminCashSession = {
  id: number
  uuid: string
  period_start: string | null
  closed_at: string
  expected_balance: string
  counted_balance: string
  variance: string
  notes: string | null
}

export type AdminUserDetail = AdminUser & {
  transactions: AdminTransactionBase[]
  vault: { id: number; balance: string; pin_set_at: string | null } | null
  groups: AdminGroupBase[]
  products: AdminProduct[]
  cash_sessions: AdminCashSession[]
}

export type AdminStats = {
  users_count: number
  transactions_volume: number
  vault_balance_total: number
  active_groups_count: number
}

export type ScoringThresholdBand = {
  min: number
  max: number | null
  points: number
}

export type AdminScoringCriterion = {
  id: number
  key: string
  label: string
  description: string | null
  weight: number
  is_active: boolean
  thresholds: ScoringThresholdBand[]
}

export type CreditScoreVerdict = 'eligible' | 'review' | 'not_eligible'

export type CreditScoreBreakdownItem = {
  key: string
  label: string
  value: number
  points: number
  weight: number
  weighted_points: number
}

export type CreditScore = {
  score: number
  verdict: CreditScoreVerdict
  breakdown: CreditScoreBreakdownItem[]
}

export type AdminSettings = {
  platform: { name: string; support_email: string }
  credit_scoring: { min_score_eligible: number; min_score_review: number }
  contact: { phone: string | null; whatsapp: string | null; address: string | null; hours: string | null }
}

export type AdminSupportTicket = {
  id: number
  email: string
  subject: string
  message: string
  created_at: string
  user: AdminUser
}

export type AdminContactMessage = {
  id: number
  name: string
  email: string
  subject: string
  message: string
  created_at: string
}

export type YabetoSettings = {
  mode: 'sandbox' | 'live'
  account_id: string | null
  is_enabled: boolean
  has_secret_key: boolean
  has_webhook_secret: boolean
  webhook_url: string
}

export type YabetoTestConnectionResult = {
  success: boolean
  message: string
}

export type YabetoWebhookRegistration = {
  id: string | null
  secret: string | null
}

export const adminService = {
  stats() {
    return apiService.get<AdminStats>('/admin/stats').then((r) => r.data)
  },

  verifyPassword(password: string) {
    return apiService.post('/admin/verify-password', { password })
  },

  listUsers() {
    return apiService.get<AdminUser[]>('/admin/users').then((r) => r.data)
  },

  getUser(id: number) {
    return apiService.get<AdminUserDetail>(`/admin/users/${id}`).then((r) => r.data)
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

  getGroup(id: number) {
    return apiService.get<AdminGroupDetail>(`/admin/groups/${id}`).then((r) => r.data)
  },

  deleteGroup(id: number) {
    return apiService.delete(`/admin/groups/${id}`)
  },

  listCompanies() {
    return apiService.get<AdminCompanyWithOwner[]>('/admin/companies').then((r) => r.data)
  },

  getCompany(id: number) {
    return apiService.get<AdminCompanyWithOwner>(`/admin/companies/${id}`).then((r) => r.data)
  },

  deleteCompany(id: number) {
    return apiService.delete(`/admin/companies/${id}`)
  },

  listWaitlist() {
    return apiService.get<AdminWaitlistEntry[]>('/admin/waitlist').then((r) => r.data)
  },

  deleteWaitlistEntry(id: number) {
    return apiService.delete(`/admin/waitlist/${id}`)
  },

  deleteProduct(id: number) {
    return apiService.delete(`/admin/products/${id}`)
  },

  deleteCashSession(id: number) {
    return apiService.delete(`/admin/cash-sessions/${id}`)
  },

  listSupportTickets() {
    return apiService.get<AdminSupportTicket[]>('/admin/support-tickets').then((r) => r.data)
  },

  deleteSupportTicket(id: number) {
    return apiService.delete(`/admin/support-tickets/${id}`)
  },

  listContactMessages() {
    return apiService.get<AdminContactMessage[]>('/admin/contact-messages').then((r) => r.data)
  },

  deleteContactMessage(id: number) {
    return apiService.delete(`/admin/contact-messages/${id}`)
  },

  listPermissions() {
    return apiService.get<AdminPermission[]>('/admin/permissions').then((r) => r.data)
  },

  listRoles() {
    return apiService.get<AdminRole[]>('/admin/roles').then((r) => r.data)
  },

  createRole(data: { name: string; description?: string; permission_ids: number[] }) {
    return apiService.post<AdminRole>('/admin/roles', data).then((r) => r.data)
  },

  updateRole(id: number, data: { name: string; description?: string; permission_ids: number[] }) {
    return apiService.put<AdminRole>(`/admin/roles/${id}`, data).then((r) => r.data)
  },

  deleteRole(id: number) {
    return apiService.delete(`/admin/roles/${id}`)
  },

  listPersonnel() {
    return apiService.get<AdminUser[]>('/admin/personnel').then((r) => r.data)
  },

  createPersonnel(data: { name: string; email: string; password: string; role_id: number }) {
    return apiService.post<AdminUser>('/admin/personnel', data).then((r) => r.data)
  },

  updatePersonnel(id: number, data: { name: string; email: string; role_id: number }) {
    return apiService.put<AdminUser>(`/admin/personnel/${id}`, data).then((r) => r.data)
  },

  deletePersonnel(id: number) {
    return apiService.delete(`/admin/personnel/${id}`)
  },

  getCreditScore(userId: number) {
    return apiService.get<CreditScore>(`/admin/users/${userId}/credit-score`).then((r) => r.data)
  },

  listScoringCriteria() {
    return apiService.get<AdminScoringCriterion[]>('/admin/scoring-criteria').then((r) => r.data)
  },

  updateScoringCriterion(id: number, data: { weight: number; is_active: boolean; thresholds: ScoringThresholdBand[] }) {
    return apiService.put<AdminScoringCriterion>(`/admin/scoring-criteria/${id}`, data).then((r) => r.data)
  },

  getSettings() {
    return apiService.get<AdminSettings>('/admin/settings').then((r) => r.data)
  },

  updateSettings(data: Partial<AdminSettings>) {
    return apiService.put<AdminSettings>('/admin/settings', data).then((r) => r.data)
  },

  getYabetoSettings() {
    return apiService.get<YabetoSettings>('/admin/settings/yabeto').then((r) => r.data)
  },

  updateYabetoSettings(data: {
    mode?: 'sandbox' | 'live'
    account_id?: string | null
    secret_key?: string
    webhook_secret?: string
    is_enabled?: boolean
    /** Required (and re-verified server-side) when switching mode from 'sandbox' to 'live'. */
    password?: string
  }) {
    return apiService.put<YabetoSettings>('/admin/settings/yabeto', data).then((r) => r.data)
  },

  testYabetoConnection() {
    return apiService.post<YabetoTestConnectionResult>('/admin/settings/yabeto/test-connection').then((r) => r.data)
  },

  registerYabetoWebhook() {
    return apiService.post<YabetoWebhookRegistration>('/admin/settings/yabeto/register-webhook').then((r) => r.data)
  },
}

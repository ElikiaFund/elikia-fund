export type Transaction = {
  id: number
  user: string
  type: 'income' | 'expense'
  category: string
  amount: number
  date: Date
  /** Owning company's department — only set where the caller has it (dashboard.tsx's zone chart); optional everywhere else. */
  department?: string | null
}

export type Contribution = {
  id: number
  tontine: string
  member: string
  amount: number
  feeAmount: number
  date: Date
}

export type NewUser = {
  id: number
  name: string
  email: string
  joinedAt: Date
}

/**
 * A single fee-generating event on Elikia's books — a tontine contribution or a vault
 * deposit/withdrawal. `platformFeeAmount` is Elikia's actual kept revenue; `providerFeeAmount` is
 * Yabeto's cut of the same fee. Vault `tontine_payout` movements are deliberately excluded at the
 * source (see finance.tsx) — a payout carries no fee, it's an internal transfer of already-taxed money.
 */
export type RevenueEvent = {
  id: string
  source: 'contribution' | 'vault_deposit' | 'vault_withdraw'
  userId: number
  grossAmount: number
  feeAmount: number
  providerFeeAmount: number
  platformFeeAmount: number
  date: Date
}

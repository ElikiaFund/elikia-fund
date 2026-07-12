export type Transaction = {
  id: number
  user: string
  type: 'income' | 'expense'
  category: string
  amount: number
  date: Date
}

export type Contribution = {
  id: number
  tontine: string
  member: string
  amount: number
  date: Date
}

export type NewUser = {
  id: number
  name: string
  email: string
  joinedAt: Date
}

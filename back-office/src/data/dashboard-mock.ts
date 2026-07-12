// Mock data for the admin dashboard, standing in until the real endpoints exist:
// TODO (Day 6): replace with GET /admin/stats, /admin/users, /admin/transactions, /admin/groups.
// Kept in one file so wiring the real API later means deleting this file and swapping the
// imports in src/pages/dashboard.tsx — nothing else should depend on it.

const DAY_MS = 24 * 60 * 60 * 1000
const HISTORY_DAYS = 90

// Deterministic PRNG (mulberry32) so the mock data is stable across renders/reloads.
function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const rand = mulberry32(20260711)

function daysAgo(n: number) {
  return new Date(Date.now() - n * DAY_MS)
}

const userNames = [
  'Aline Mbala', 'Joseph Nkounkou', 'Grace Tsiba', 'Prisca Loemba', 'Yannick Mabiala',
  'Christelle Bemba', 'Dieu-Donné Kaya', 'Nadège Okemba', 'Ferdinand Ngouabi', 'Sarah Ibara',
  'Patrick Loubaki', 'Merveille Samba', 'Rock Moukala', 'Bénie Gomes', 'Arsène Bakala',
]

const categoriesIncome = ['Salaire', 'Vente', 'Aide familiale', 'Freelance']
const categoriesExpense = ['Loyer', 'Alimentation', 'Transport', 'Santé', 'Scolarité', 'Cotisation tontine']

const tontineNames = [
  'Tontine des Commerçantes',
  'Cercle Elikia Bandal',
  'Groupe Bakala Solidarité',
  'Tontine Familiale Loemba',
  'Cercle Espoir Poto-Poto',
]

export type Transaction = {
  id: number
  user: string
  type: 'income' | 'expense'
  category: string
  amount: number
  date: Date
}

export const transactions: Transaction[] = Array.from({ length: 220 }, (_, i) => {
  const isIncome = rand() < 0.4
  const category = isIncome
    ? categoriesIncome[Math.floor(rand() * categoriesIncome.length)]
    : categoriesExpense[Math.floor(rand() * categoriesExpense.length)]

  return {
    id: i + 1,
    user: userNames[Math.floor(rand() * userNames.length)],
    type: (isIncome ? 'income' : 'expense') as 'income' | 'expense',
    category,
    amount: Math.round((isIncome ? 40000 + rand() * 180000 : 3000 + rand() * 60000) / 100) * 100,
    date: daysAgo(Math.floor(rand() * HISTORY_DAYS)),
  }
}).sort((a, b) => b.date.getTime() - a.date.getTime())

export type Contribution = {
  id: number
  tontine: string
  member: string
  amount: number
  date: Date
}

export const contributions: Contribution[] = Array.from({ length: 140 }, (_, i) => ({
  id: i + 1,
  tontine: tontineNames[Math.floor(rand() * tontineNames.length)],
  member: userNames[Math.floor(rand() * userNames.length)],
  amount: Math.round((10000 + rand() * 25000) / 500) * 500,
  date: daysAgo(Math.floor(rand() * HISTORY_DAYS)),
})).sort((a, b) => b.date.getTime() - a.date.getTime())

export type NewUser = {
  id: number
  name: string
  email: string
  joinedAt: Date
}

export const newUsers: NewUser[] = Array.from({ length: 30 }, (_, i) => {
  const name = userNames[i % userNames.length]
  const slug = name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '.')

  return {
    id: i + 1,
    name,
    email: `${slug}@example.cg`,
    joinedAt: daysAgo(Math.floor(rand() * HISTORY_DAYS)),
  }
}).sort((a, b) => b.joinedAt.getTime() - a.joinedAt.getTime())

export const earliestMockDate = daysAgo(HISTORY_DAYS)
export const latestMockDate = daysAgo(0)

import { endOfDay, format, isWithinInterval, startOfDay, subMilliseconds } from 'date-fns'
import type { DateRange } from 'react-day-picker'

import type { Contribution, RevenueEvent, Transaction } from '@/components/dashboard/types'
import { COMPANY_CATEGORY_LABELS } from '@/lib/company-categories'
import { DEPARTMENT_LABELS } from '@/lib/company-locations'

function dateOf(item: { date: Date } | { joinedAt: Date }) {
  return 'date' in item ? item.date : item.joinedAt
}

export function filterByRange<T extends { date: Date } | { joinedAt: Date }>(items: T[], range: DateRange | undefined): T[] {
  if (!range?.from) {
    return items
  }

  const interval = { start: startOfDay(range.from), end: endOfDay(range.to ?? range.from) }

  return items.filter((item) => isWithinInterval(dateOf(item), interval))
}

/** The equal-length window immediately preceding `range`, for trend comparisons. */
export function previousRange(range: DateRange | undefined): DateRange | undefined {
  if (!range?.from) {
    return undefined
  }

  const start = startOfDay(range.from)
  const end = endOfDay(range.to ?? range.from)
  const duration = end.getTime() - start.getTime()

  return { from: subMilliseconds(start, duration + 1), to: subMilliseconds(start, 1) }
}

export function aggregateDaily(transactions: Transaction[]) {
  const byDay = new Map<string, { date: string; revenus: number; depenses: number }>()

  for (const t of transactions) {
    const key = format(t.date, 'yyyy-MM-dd')
    const entry = byDay.get(key) ?? { date: key, revenus: 0, depenses: 0 }

    if (t.type === 'income') {
      entry.revenus += t.amount
    } else {
      entry.depenses += t.amount
    }

    byDay.set(key, entry)
  }

  return Array.from(byDay.values()).sort((a, b) => a.date.localeCompare(b.date))
}

export function aggregateByTontine(contributions: Contribution[], limit = 5) {
  const byTontine = new Map<string, number>()

  for (const c of contributions) {
    byTontine.set(c.tontine, (byTontine.get(c.tontine) ?? 0) + c.amount)
  }

  return Array.from(byTontine.entries())
    .map(([tontine, total]) => ({ tontine, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit)
}

/** Transaction count per day — a proxy for account activity/engagement. */
export function aggregateCountByDay(transactions: Transaction[]) {
  const byDay = new Map<string, number>()

  for (const t of transactions) {
    const key = format(t.date, 'yyyy-MM-dd')
    byDay.set(key, (byDay.get(key) ?? 0) + 1)
  }

  return Array.from(byDay.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

/** Ranked spend-by-category breakdown — reuses the tontines chart's `{tontine, total}` shape (relabeled). */
export function aggregateByCategory(transactions: Transaction[], limit = 5) {
  const byCategory = new Map<string, number>()

  for (const t of transactions) {
    byCategory.set(t.category, (byCategory.get(t.category) ?? 0) + t.amount)
  }

  return Array.from(byCategory.entries())
    .map(([tontine, total]) => ({ tontine, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit)
}

/**
 * Company sector distribution — grouped by the fixed `Company::CATEGORIES` label only (not the
 * free-text `other_category`), so every "Autre" company lands in one bucket instead of
 * fragmenting into one bucket per custom sector name.
 */
export function aggregateByCompanyCategory(companies: { category: string }[]) {
  const byCategory = new Map<string, number>()

  for (const c of companies) {
    const label = COMPANY_CATEGORY_LABELS[c.category] ?? c.category
    byCategory.set(label, (byCategory.get(label) ?? 0) + 1)
  }

  return Array.from(byCategory.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
}

/** Ranked company count per department — reuses the tontines chart's `{tontine, total}` shape (relabeled). */
export function aggregateByDepartment(companies: { department: string | null }[], limit = 6) {
  const byDepartment = new Map<string, number>()

  for (const c of companies) {
    if (!c.department) continue
    const label = DEPARTMENT_LABELS[c.department] ?? c.department
    byDepartment.set(label, (byDepartment.get(label) ?? 0) + 1)
  }

  return Array.from(byDepartment.entries())
    .map(([tontine, total]) => ({ tontine, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit)
}

/**
 * Ranked transaction volume per department — same shape/idiom as `aggregateByDepartment`, but
 * summing transaction amounts (scoped to the selected date range by the caller) instead of
 * counting companies, so it reads as "where is cash-flow activity happening right now."
 */
export function aggregateTransactionVolumeByDepartment(transactions: Transaction[], limit = 6) {
  const byDepartment = new Map<string, number>()

  for (const t of transactions) {
    if (!t.department) continue
    const label = DEPARTMENT_LABELS[t.department] ?? t.department
    byDepartment.set(label, (byDepartment.get(label) ?? 0) + t.amount)
  }

  return Array.from(byDepartment.entries())
    .map(([tontine, total]) => ({ tontine, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit)
}

const REVENUE_SOURCE_LABELS: Record<RevenueEvent['source'], string> = {
  contribution: 'Cotisations tontines',
  vault_deposit: 'Dépôts coffre',
  vault_withdraw: 'Retraits coffre',
}

/** Daily Elikia-kept revenue (`platformFeeAmount`), sorted ascending — feeds RevenueTrendChart. */
export function aggregateRevenueDaily(events: RevenueEvent[]) {
  const byDay = new Map<string, number>()

  for (const e of events) {
    const key = format(e.date, 'yyyy-MM-dd')
    byDay.set(key, (byDay.get(key) ?? 0) + e.platformFeeAmount)
  }

  return Array.from(byDay.entries())
    .map(([date, revenue]) => ({ date, revenue }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

/** Elikia-kept revenue ranked by source — reuses the tontines chart's `{tontine, total}` shape. */
export function aggregateRevenueBySource(events: RevenueEvent[]) {
  const bySource = new Map<string, number>()

  for (const e of events) {
    const label = REVENUE_SOURCE_LABELS[e.source]
    bySource.set(label, (bySource.get(label) ?? 0) + e.platformFeeAmount)
  }

  return Array.from(bySource.entries())
    .map(([tontine, total]) => ({ tontine, total }))
    .sort((a, b) => b.total - a.total)
}

/** Every fee FCFA collected splits into Yabeto's cut and Elikia's kept share — feeds the fee-split donut. */
export function aggregateFeeSplit(events: RevenueEvent[]) {
  const elikia = events.reduce((sum, e) => sum + e.platformFeeAmount, 0)
  const yabeto = events.reduce((sum, e) => sum + e.providerFeeAmount, 0)

  return [
    { label: 'Elikia Fund', value: elikia },
    { label: 'Yabeto', value: yabeto },
  ]
}

/** Distinct users who generated at least one fee-bearing event in the period. */
export function countActiveUsers(events: RevenueEvent[]) {
  return new Set(events.map((e) => e.userId)).size
}

export type RevenueForecast = {
  activeUsers: number
  dailyAverage: number
  avgRevenuePerUserPerDay: number
  projectedDaily: number
  projectedNextPeriod: number
  horizonDays: number
  /** Second-half vs first-half average change, as a signal of whether revenue is picking up or slowing down. */
  growthRate: number
}

/**
 * Deliberately simple, not a statistical model: "X active users generating Y FCFA/day on
 * average" extrapolated forward, nudged by a first-half-vs-second-half momentum signal rather
 * than a full regression — good enough to say "trending up/down" without overclaiming precision.
 */
export function computeRevenueForecast(
  dailyRevenue: { date: string; revenue: number }[],
  activeUsers: number,
  horizonDays = 7,
): RevenueForecast {
  const days = Math.max(dailyRevenue.length, 1)
  const total = dailyRevenue.reduce((sum, d) => sum + d.revenue, 0)
  const dailyAverage = total / days
  const avgRevenuePerUserPerDay = activeUsers > 0 ? dailyAverage / activeUsers : 0

  const mid = Math.floor(dailyRevenue.length / 2)
  const average = (rows: typeof dailyRevenue) => (rows.length ? rows.reduce((sum, d) => sum + d.revenue, 0) / rows.length : 0)
  const firstHalfAverage = average(dailyRevenue.slice(0, mid))
  const secondHalfAverage = average(dailyRevenue.slice(mid))
  const growthRate = firstHalfAverage > 0 ? (secondHalfAverage - firstHalfAverage) / firstHalfAverage : 0

  const projectedDaily = Math.max(0, dailyAverage * (1 + growthRate))

  return {
    activeUsers,
    dailyAverage,
    avgRevenuePerUserPerDay,
    projectedDaily,
    projectedNextPeriod: projectedDaily * horizonDays,
    horizonDays,
    growthRate,
  }
}

/**
 * Extends `dailyRevenue` with `horizonDays` future points at the projected daily rate, for
 * RevenueTrendChart's dashed continuation. The last real day is duplicated as both `revenue` and
 * `forecast` so the dashed segment visually connects to the solid line instead of leaving a gap.
 */
export function buildForecastSeries(dailyRevenue: { date: string; revenue: number }[], forecast: RevenueForecast) {
  if (dailyRevenue.length === 0) {
    return []
  }

  const points: { date: string; revenue?: number; forecast?: number }[] = dailyRevenue.map((d) => ({ date: d.date, revenue: d.revenue }))
  const lastDate = new Date(dailyRevenue[dailyRevenue.length - 1].date)

  points[points.length - 1] = { ...points[points.length - 1], forecast: points[points.length - 1].revenue }

  for (let i = 1; i <= forecast.horizonDays; i++) {
    const date = new Date(lastDate)
    date.setDate(date.getDate() + i)
    points.push({ date: format(date, 'yyyy-MM-dd'), forecast: forecast.projectedDaily })
  }

  return points
}

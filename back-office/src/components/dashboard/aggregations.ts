import { endOfDay, format, isWithinInterval, startOfDay, subMilliseconds } from 'date-fns'
import type { DateRange } from 'react-day-picker'

import type { Contribution, Transaction } from '@/components/dashboard/types'

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

import { subDays } from 'date-fns'
import { useEffect, useMemo, useState } from 'react'
import type { DateRange } from 'react-day-picker'

import { aggregateByTontine, aggregateDaily, filterByRange, previousRange } from '@/components/dashboard/aggregations'
import { DateRangeFilter } from '@/components/dashboard/date-range-filter'
import { NewUsersTable } from '@/components/dashboard/new-users-table'
import { RecentTransactionsTable } from '@/components/dashboard/recent-transactions-table'
import { StatCards } from '@/components/dashboard/stat-cards'
import { TontinesChart } from '@/components/dashboard/tontines-chart'
import { TransactionsChart } from '@/components/dashboard/transactions-chart'
import type { Contribution, NewUser, Transaction } from '@/components/dashboard/types'
import { Skeleton } from '@/components/ui/skeleton'
import { adminService } from '@/services/adminService'

export function DashboardPage() {
  const [range, setRange] = useState<DateRange | undefined>({ from: subDays(new Date(), 30), to: new Date() })
  const [isLoading, setIsLoading] = useState(true)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [contributions, setContributions] = useState<Contribution[]>([])
  const [newUsers, setNewUsers] = useState<NewUser[]>([])

  useEffect(() => {
    Promise.all([adminService.listUsers(), adminService.listTransactions(), adminService.listGroups()])
      .then(([users, apiTransactions, groups]) => {
        const userNameById = new Map(users.map((u) => [u.id, u.name]))

        setNewUsers(users.map((u) => ({ id: u.id, name: u.name, email: u.email, joinedAt: new Date(u.created_at) })))

        setTransactions(
          apiTransactions.map((t) => ({
            id: t.id,
            user: t.user.name,
            type: t.type,
            category: t.category,
            amount: Number(t.amount),
            date: new Date(t.occurred_at),
          })),
        )

        setContributions(
          groups.flatMap((group) =>
            group.contributions.map((c) => ({
              id: c.id,
              tontine: group.name,
              member: userNameById.get(c.user_id) ?? 'Membre',
              amount: Number(c.amount),
              feeAmount: Number(c.fee_amount),
              date: new Date(c.paid_at),
            })),
          ),
        )
      })
      .finally(() => setIsLoading(false))
  }, [])

  const current = useMemo(
    () => ({
      transactions: filterByRange(transactions, range),
      contributions: filterByRange(contributions, range),
      newUsers: filterByRange(newUsers, range),
    }),
    [transactions, contributions, newUsers, range],
  )

  const previous = useMemo(() => {
    const prev = previousRange(range)
    return {
      transactions: filterByRange(transactions, prev),
      contributions: filterByRange(contributions, prev),
      newUsers: filterByRange(newUsers, prev),
    }
  }, [transactions, contributions, newUsers, range])

  const dailyData = useMemo(() => aggregateDaily(current.transactions), [current.transactions])
  const tontineData = useMemo(() => aggregateByTontine(current.contributions), [current.contributions])

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 md:gap-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-72" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div className="flex justify-end">
        <DateRangeFilter value={range} onChange={setRange} />
      </div>

      <StatCards current={current} previous={previous} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TransactionsChart data={dailyData} />
        </div>
        <TontinesChart data={tontineData} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <RecentTransactionsTable transactions={current.transactions} />
        <NewUsersTable users={current.newUsers} />
      </div>
    </div>
  )
}

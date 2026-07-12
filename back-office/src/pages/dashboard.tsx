import { subDays } from 'date-fns'
import { useMemo, useState } from 'react'
import type { DateRange } from 'react-day-picker'

import { aggregateByTontine, aggregateDaily, filterByRange, previousRange } from '@/components/dashboard/aggregations'
import { DateRangeFilter } from '@/components/dashboard/date-range-filter'
import { NewUsersTable } from '@/components/dashboard/new-users-table'
import { RecentTransactionsTable } from '@/components/dashboard/recent-transactions-table'
import { StatCards } from '@/components/dashboard/stat-cards'
import { TontinesChart } from '@/components/dashboard/tontines-chart'
import { TransactionsChart } from '@/components/dashboard/transactions-chart'
import { contributions, newUsers, transactions } from '@/data/dashboard-mock'

export function DashboardPage() {
  const [range, setRange] = useState<DateRange | undefined>({ from: subDays(new Date(), 30), to: new Date() })

  const current = useMemo(
    () => ({
      transactions: filterByRange(transactions, range),
      contributions: filterByRange(contributions, range),
      newUsers: filterByRange(newUsers, range),
    }),
    [range],
  )

  const previous = useMemo(() => {
    const prev = previousRange(range)
    return {
      transactions: filterByRange(transactions, prev),
      contributions: filterByRange(contributions, prev),
      newUsers: filterByRange(newUsers, prev),
    }
  }, [range])

  const dailyData = useMemo(() => aggregateDaily(current.transactions), [current.transactions])
  const tontineData = useMemo(() => aggregateByTontine(current.contributions), [current.contributions])

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

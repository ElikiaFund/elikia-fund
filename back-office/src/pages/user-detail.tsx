import { subDays } from 'date-fns'
import { ArrowLeftIcon } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { DateRange } from 'react-day-picker'

import { DateRangeFilter } from '@/components/dashboard/date-range-filter'
import { filterByRange } from '@/components/dashboard/aggregations'
import type { Transaction } from '@/components/dashboard/types'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AnalyticsTab } from '@/components/user-detail/analytics-tab'
import { CreditScoreTab } from '@/components/user-detail/credit-score-tab'
import { InformationsTab } from '@/components/user-detail/informations-tab'
import { TransactionsTab } from '@/components/user-detail/transactions-tab'
import { adminService, type AdminUserDetail } from '@/services/adminService'

export function UserDetailPage() {
  const { id } = useParams()
  const [user, setUser] = useState<AdminUserDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [range, setRange] = useState<DateRange | undefined>({ from: subDays(new Date(), 30), to: new Date() })

  useEffect(() => {
    setIsLoading(true)
    adminService
      .getUser(Number(id))
      .then(setUser)
      .finally(() => setIsLoading(false))
  }, [id])

  const transactions: Transaction[] = useMemo(
    () =>
      (user?.transactions ?? []).map((t) => ({
        id: t.id,
        user: user?.name ?? '',
        type: t.type,
        category: t.category,
        amount: Number(t.amount),
        date: new Date(t.occurred_at),
      })),
    [user],
  )

  const filteredTransactions = useMemo(() => filterByRange(transactions, range), [transactions, range])

  return (
    <div className="flex flex-col gap-4">
      <Button variant="ghost" size="sm" className="w-fit" asChild>
        <Link to="/utilisateurs">
          <ArrowLeftIcon />
          Retour aux utilisateurs
        </Link>
      </Button>

      {isLoading || !user ? (
        <Skeleton className="h-96" />
      ) : (
        <Tabs defaultValue="informations">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <TabsList>
              <TabsTrigger value="informations">Informations</TabsTrigger>
              <TabsTrigger value="score">Score de crédit</TabsTrigger>
              <TabsTrigger value="transactions">Transactions</TabsTrigger>
              <TabsTrigger value="analytique">Analytique</TabsTrigger>
            </TabsList>
            <DateRangeFilter value={range} onChange={setRange} />
          </div>

          <TabsContent value="informations">
            <InformationsTab user={user} />
          </TabsContent>

          <TabsContent value="score">
            <CreditScoreTab userId={user.id} />
          </TabsContent>

          <TabsContent value="transactions">
            <TransactionsTab transactions={filteredTransactions} />
          </TabsContent>

          <TabsContent value="analytique">
            <AnalyticsTab transactions={filteredTransactions} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}

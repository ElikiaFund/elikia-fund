import { subDays } from 'date-fns'
import { useEffect, useMemo, useState } from 'react'
import type { DateRange } from 'react-day-picker'

import {
  aggregateByCategory,
  aggregateByCompanyCategory,
  aggregateByDepartment,
  aggregateByTontine,
  aggregateDaily,
  aggregateTransactionVolumeByDepartment,
  filterByRange,
  previousRange,
} from '@/components/dashboard/aggregations'
import { DateRangeFilter } from '@/components/dashboard/date-range-filter'
import { DistributionDonutChart } from '@/components/dashboard/distribution-donut-chart'
import { NewUsersTable } from '@/components/dashboard/new-users-table'
import { RecentTransactionsTable } from '@/components/dashboard/recent-transactions-table'
import { StatCards } from '@/components/dashboard/stat-cards'
import { TontinesChart } from '@/components/dashboard/tontines-chart'
import { TransactionsChart } from '@/components/dashboard/transactions-chart'
import type { Contribution, NewUser, Transaction } from '@/components/dashboard/types'
import { Skeleton } from '@/components/ui/skeleton'
import { usePageTitle } from '@/hooks/use-page-title'
import { adminService, type AdminCompany } from '@/services/adminService'

const currency = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 })

export function DashboardPage() {
  usePageTitle('Tableau de bord')

  const [range, setRange] = useState<DateRange | undefined>({ from: subDays(new Date(), 30), to: new Date() })
  const [isLoading, setIsLoading] = useState(true)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [contributions, setContributions] = useState<Contribution[]>([])
  const [newUsers, setNewUsers] = useState<NewUser[]>([])
  const [companies, setCompanies] = useState<AdminCompany[]>([])

  useEffect(() => {
    Promise.all([adminService.listUsers(), adminService.listTransactions(), adminService.listGroups(), adminService.listCompanies()])
      .then(([users, apiTransactions, groups, apiCompanies]) => {
        const userNameById = new Map(users.map((u) => [u.id, u.name]))

        setNewUsers(users.map((u) => ({ id: u.id, name: u.name, email: u.email, joinedAt: new Date(u.created_at) })))

        setTransactions(
          apiTransactions.map((t) => ({
            id: t.id,
            user: t.company.name,
            type: t.type,
            category: t.category,
            paymentMethod: t.payment_method,
            amount: Number(t.amount),
            date: new Date(t.occurred_at),
            department: t.company.department,
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

        setCompanies(apiCompanies)
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

  const incomeExpenseData = useMemo(() => {
    const revenus = current.transactions.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0)
    const depenses = current.transactions.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0)
    return [
      { label: 'Revenus', value: revenus },
      { label: 'Dépenses', value: depenses },
    ]
  }, [current.transactions])

  const topExpenseCategories = useMemo(
    () => aggregateByCategory(current.transactions.filter((t) => t.type === 'expense')),
    [current.transactions],
  )
  const topIncomeCategories = useMemo(
    () => aggregateByCategory(current.transactions.filter((t) => t.type === 'income')),
    [current.transactions],
  )
  const transactionsByZone = useMemo(() => aggregateTransactionVolumeByDepartment(current.transactions), [current.transactions])

  // Merchant profile snapshot — who our companies are today, not scoped to the selected date
  // range (a company created 3 months ago is still part of "how our merchants break down now").
  const sectorData = useMemo(() => aggregateByCompanyCategory(companies), [companies])
  const departmentData = useMemo(() => aggregateByDepartment(companies), [companies])

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

      <div>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Activité sur la période</h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <DistributionDonutChart data={incomeExpenseData} title="Revenus vs dépenses" valueFormatter={currency.format} />
          <TontinesChart
            data={transactionsByZone}
            title="Transactions par zone"
            description="Volume par département sur la période sélectionnée"
          />
          <TontinesChart data={topExpenseCategories} title="Top catégories de dépenses" description="Top 5 sur la période sélectionnée" />
          <TontinesChart data={topIncomeCategories} title="Top catégories de revenus" description="Top 5 sur la période sélectionnée" />
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Profil des entreprises</h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <DistributionDonutChart data={sectorData} title="Répartition par secteur d'activité" description="Toutes les entreprises enregistrées" />
          <TontinesChart data={departmentData} title="Répartition géographique" description="Entreprises par département" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <RecentTransactionsTable transactions={current.transactions} />
        <NewUsersTable users={current.newUsers} />
      </div>
    </div>
  )
}

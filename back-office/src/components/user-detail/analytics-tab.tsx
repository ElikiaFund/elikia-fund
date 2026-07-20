import { useMemo } from 'react'

import { aggregateByCategory, aggregateCountByDay, aggregateDaily } from '@/components/dashboard/aggregations'
import { TontinesChart } from '@/components/dashboard/tontines-chart'
import { TransactionsChart } from '@/components/dashboard/transactions-chart'
import type { Transaction } from '@/components/dashboard/types'
import { UsageChart } from '@/components/dashboard/usage-chart'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const currency = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 })
const number = new Intl.NumberFormat('fr-FR')

type AnalyticsTabProps = {
  transactions: Transaction[]
}

export function AnalyticsTab({ transactions }: AnalyticsTabProps) {
  const dailyData = useMemo(() => aggregateDaily(transactions), [transactions])
  const usageData = useMemo(() => aggregateCountByDay(transactions), [transactions])
  const categoryData = useMemo(() => aggregateByCategory(transactions), [transactions])

  const totals = useMemo(() => {
    const revenus = transactions.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0)
    const depenses = transactions.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0)

    return { revenus, depenses, solde: revenus - depenses, count: transactions.length }
  }, [transactions])

  const stats = [
    { label: 'Total revenus', value: currency.format(totals.revenus) },
    { label: 'Total dépenses', value: currency.format(totals.depenses) },
    { label: 'Solde net', value: currency.format(totals.solde) },
    { label: 'Nombre de transactions', value: number.format(totals.count) },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="@container/card">
            <CardHeader>
              <CardDescription>{stat.label}</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">{stat.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <TransactionsChart data={dailyData} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <UsageChart data={usageData} />
        <TontinesChart data={categoryData} title="Répartition par catégorie" description="Top 5 catégories sur la période" />
      </div>
    </div>
  )
}

import { TrendingDownIcon, TrendingUpIcon } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardAction, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import type { Contribution, NewUser, Transaction } from '@/data/dashboard-mock'

const currency = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 })
const number = new Intl.NumberFormat('fr-FR')

function trend(current: number, previous: number) {
  if (previous === 0) {
    return current === 0 ? 0 : 100
  }
  return ((current - previous) / previous) * 100
}

function TrendBadge({ value }: { value: number }) {
  const isUp = value >= 0
  const Icon = isUp ? TrendingUpIcon : TrendingDownIcon

  return (
    <Badge variant="outline" className={isUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>
      <Icon />
      {isUp ? '+' : ''}
      {value.toFixed(1)}%
    </Badge>
  )
}

type StatCardsProps = {
  current: { transactions: Transaction[]; contributions: Contribution[]; newUsers: NewUser[] }
  previous: { transactions: Transaction[]; contributions: Contribution[]; newUsers: NewUser[] }
}

export function StatCards({ current, previous }: StatCardsProps) {
  const volume = current.transactions.reduce((sum, t) => sum + t.amount, 0)
  const previousVolume = previous.transactions.reduce((sum, t) => sum + t.amount, 0)

  const cotisations = current.contributions.reduce((sum, c) => sum + c.amount, 0)
  const previousCotisations = previous.contributions.reduce((sum, c) => sum + c.amount, 0)

  const activeTontines = new Set(current.contributions.map((c) => c.tontine)).size
  const previousActiveTontines = new Set(previous.contributions.map((c) => c.tontine)).size

  const stats = [
    {
      label: 'Nouveaux utilisateurs',
      value: number.format(current.newUsers.length),
      change: trend(current.newUsers.length, previous.newUsers.length),
      footer: 'Sur la période sélectionnée',
    },
    {
      label: 'Volume des transactions',
      value: currency.format(volume),
      change: trend(volume, previousVolume),
      footer: `${number.format(current.transactions.length)} transactions`,
    },
    {
      label: 'Cotisations tontines',
      value: currency.format(cotisations),
      change: trend(cotisations, previousCotisations),
      footer: `${number.format(current.contributions.length)} cotisations`,
    },
    {
      label: 'Tontines actives',
      value: number.format(activeTontines),
      change: trend(activeTontines, previousActiveTontines),
      footer: 'Avec au moins une cotisation',
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="@container/card">
          <CardHeader>
            <CardDescription>{stat.label}</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">{stat.value}</CardTitle>
            <CardAction>
              <TrendBadge value={stat.change} />
            </CardAction>
          </CardHeader>
          <CardFooter className="text-sm text-muted-foreground">{stat.footer}</CardFooter>
        </Card>
      ))}
    </div>
  )
}

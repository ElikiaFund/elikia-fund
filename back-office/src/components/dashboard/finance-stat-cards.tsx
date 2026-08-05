import { trend, TrendBadge } from '@/components/dashboard/stat-cards'
import { countActiveUsers } from '@/components/dashboard/aggregations'
import type { RevenueEvent } from '@/components/dashboard/types'
import { Card, CardAction, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

const currency = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 })
const number = new Intl.NumberFormat('fr-FR')

function sumPlatformFee(events: RevenueEvent[]) {
  return events.reduce((sum, e) => sum + e.platformFeeAmount, 0)
}

type FinanceStatCardsProps = {
  current: RevenueEvent[]
  previous: RevenueEvent[]
}

export function FinanceStatCards({ current, previous }: FinanceStatCardsProps) {
  const revenue = sumPlatformFee(current)
  const previousRevenue = sumPlatformFee(previous)

  const tontineRevenue = sumPlatformFee(current.filter((e) => e.source === 'contribution'))
  const previousTontineRevenue = sumPlatformFee(previous.filter((e) => e.source === 'contribution'))

  const vaultRevenue = sumPlatformFee(current.filter((e) => e.source !== 'contribution'))
  const previousVaultRevenue = sumPlatformFee(previous.filter((e) => e.source !== 'contribution'))

  const grossFees = current.reduce((sum, e) => sum + e.feeAmount, 0)
  const previousGrossFees = previous.reduce((sum, e) => sum + e.feeAmount, 0)
  const yabetoShare = current.reduce((sum, e) => sum + e.providerFeeAmount, 0)

  const activeUsers = countActiveUsers(current)
  const previousActiveUsers = countActiveUsers(previous)

  const stats = [
    {
      label: 'Revenu Elikia Fund',
      value: currency.format(revenue),
      change: trend(revenue, previousRevenue),
      footer: `${number.format(current.length)} événement${current.length > 1 ? 's' : ''} générateur${current.length > 1 ? 's' : ''} de frais`,
    },
    {
      label: 'Revenu — cotisations tontines',
      value: currency.format(tontineRevenue),
      change: trend(tontineRevenue, previousTontineRevenue),
      footer: 'Part Elikia des frais de cotisation',
    },
    {
      label: 'Revenu — coffre',
      value: currency.format(vaultRevenue),
      change: trend(vaultRevenue, previousVaultRevenue),
      footer: 'Dépôts et retraits confondus',
    },
    {
      label: 'Frais bruts collectés',
      value: currency.format(grossFees),
      change: trend(grossFees, previousGrossFees),
      footer: `Dont ${currency.format(yabetoShare)} pour Yabeto`,
    },
    {
      label: 'Utilisateurs payants actifs',
      value: number.format(activeUsers),
      change: trend(activeUsers, previousActiveUsers),
      footer: 'Ont généré au moins un frais sur la période',
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {stats.map((stat) => (
        <Card key={stat.label} className="@container/card min-w-0">
          <CardHeader>
            <CardDescription>{stat.label}</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums wrap-break-word @[250px]/card:text-3xl">{stat.value}</CardTitle>
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

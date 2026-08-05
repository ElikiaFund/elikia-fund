import { subDays } from 'date-fns'
import { useEffect, useMemo, useState } from 'react'
import type { DateRange } from 'react-day-picker'

import {
  aggregateFeeSplit,
  aggregateRevenueBySource,
  aggregateRevenueDaily,
  buildForecastSeries,
  computeRevenueForecast,
  countActiveUsers,
  filterByRange,
  previousRange,
} from '@/components/dashboard/aggregations'
import { DateRangeFilter } from '@/components/dashboard/date-range-filter'
import { DistributionDonutChart } from '@/components/dashboard/distribution-donut-chart'
import { FinanceStatCards } from '@/components/dashboard/finance-stat-cards'
import { ForecastCallout } from '@/components/dashboard/forecast-callout'
import { RecentRevenueTable } from '@/components/dashboard/recent-revenue-table'
import { RevenueTrendChart } from '@/components/dashboard/revenue-trend-chart'
import { TontinesChart } from '@/components/dashboard/tontines-chart'
import type { RevenueEvent } from '@/components/dashboard/types'
import { Skeleton } from '@/components/ui/skeleton'
import { usePageTitle } from '@/hooks/use-page-title'
import { adminService } from '@/services/adminService'

const currency = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 })

export function FinancePage() {
  usePageTitle('Finances')

  const [range, setRange] = useState<DateRange | undefined>({ from: subDays(new Date(), 30), to: new Date() })
  const [isLoading, setIsLoading] = useState(true)
  const [events, setEvents] = useState<RevenueEvent[]>([])

  useEffect(() => {
    Promise.all([adminService.listGroups(), adminService.listVaultMovements()])
      .then(([groups, vaultMovements]) => {
        // fee_amount/provider_fee_amount/platform_fee_amount are computed and persisted once, at
        // creation time (FeeService), before Yabeto has confirmed anything — a contribution/
        // movement still 'processing' or that later resolves 'failed' carries the same fee fields
        // as a real success, but the money was never actually collected. Only count terminal
        // successes toward revenue. Vault movements have two different success labels depending
        // on the path taken: 'succeeded' (real Yabeto) and 'completed' (the simulated fallback
        // used while Yabeto isn't configured/enabled) — contributions only ever use 'succeeded'.
        const contributionEvents: RevenueEvent[] = groups.flatMap((group) =>
          group.contributions
            .filter((c) => c.status === 'succeeded')
            .map((c) => ({
              id: `contribution-${c.id}`,
              source: 'contribution' as const,
              userId: c.user_id,
              grossAmount: Number(c.amount),
              feeAmount: Number(c.fee_amount),
              providerFeeAmount: Number(c.provider_fee_amount),
              platformFeeAmount: Number(c.platform_fee_amount),
              date: new Date(c.paid_at),
            })),
        )

        // tontine_payout movements carry no fee — the fee was already taken at contribution
        // time, a payout just moves already-taxed money into the recipient's vault.
        const vaultEvents: RevenueEvent[] = vaultMovements
          .filter((m) => (m.type === 'deposit' || m.type === 'withdraw') && (m.status === 'succeeded' || m.status === 'completed'))
          .map((m) => ({
            id: `vault-${m.id}`,
            source: m.type === 'deposit' ? ('vault_deposit' as const) : ('vault_withdraw' as const),
            userId: m.vault.user.id,
            grossAmount: Number(m.amount),
            feeAmount: Number(m.fee_amount),
            providerFeeAmount: Number(m.provider_fee_amount),
            platformFeeAmount: Number(m.platform_fee_amount),
            date: new Date(m.created_at),
          }))

        setEvents([...contributionEvents, ...vaultEvents])
      })
      .finally(() => setIsLoading(false))
  }, [])

  const current = useMemo(() => filterByRange(events, range), [events, range])
  const previous = useMemo(() => filterByRange(events, previousRange(range)), [events, range])

  const dailyRevenue = useMemo(() => aggregateRevenueDaily(current), [current])
  const forecast = useMemo(() => computeRevenueForecast(dailyRevenue, countActiveUsers(current)), [dailyRevenue, current])
  const forecastSeries = useMemo(() => buildForecastSeries(dailyRevenue, forecast), [dailyRevenue, forecast])
  const revenueBySource = useMemo(() => aggregateRevenueBySource(current), [current])
  const feeSplit = useMemo(() => aggregateFeeSplit(current), [current])

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 md:gap-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

      <FinanceStatCards current={current} previous={previous} />

      <ForecastCallout forecast={forecast} />

      <RevenueTrendChart data={forecastSeries} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DistributionDonutChart data={feeSplit} title="Répartition des frais" description="Elikia Fund vs Yabeto, sur la période" valueFormatter={currency.format} />
        <TontinesChart
          data={revenueBySource}
          title="Revenu par source"
          description="Cotisations tontines vs coffre, sur la période"
        />
      </div>

      <RecentRevenueTable events={current} />
    </div>
  )
}

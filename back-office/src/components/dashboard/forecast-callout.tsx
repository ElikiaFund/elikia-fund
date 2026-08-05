import { SparklesIcon, TrendingDownIcon, TrendingUpIcon } from 'lucide-react'

import type { RevenueForecast } from '@/components/dashboard/aggregations'
import { Card, CardContent } from '@/components/ui/card'

const currency = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 })
const number = new Intl.NumberFormat('fr-FR')

type ForecastCalloutProps = {
  forecast: RevenueForecast
}

// A narrative stat, not a chart — the "if X users generate Y FCFA/day, projection is Z" story is
// easier to read as one sentence than decoded from an axis, so it gets its own highlighted card
// instead of another plot.
export function ForecastCallout({ forecast }: ForecastCalloutProps) {
  const { activeUsers, dailyAverage, avgRevenuePerUserPerDay, projectedNextPeriod, horizonDays, growthRate } = forecast

  const isFlat = Math.abs(growthRate) < 0.02
  const TrendIcon = isFlat ? SparklesIcon : growthRate > 0 ? TrendingUpIcon : TrendingDownIcon
  const trendColor = isFlat ? 'text-muted-foreground' : growthRate > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'

  if (activeUsers === 0) {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex items-center gap-3 py-2 text-sm text-muted-foreground">
          <SparklesIcon className="size-5 shrink-0" />
          Pas assez de données sur la période sélectionnée pour projeter un revenu.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-background ${trendColor}`}>
            <TrendIcon className="size-5" />
          </div>
          <p className="text-sm leading-relaxed">
            <span className="font-semibold">{number.format(activeUsers)} utilisateurs actifs</span> génèrent en moyenne{' '}
            <span className="font-semibold">{currency.format(avgRevenuePerUserPerDay)}</span> par jour chacun, soit{' '}
            <span className="font-semibold">{currency.format(dailyAverage)}</span> de revenu quotidien pour Elikia Fund.{' '}
            {isFlat ? 'Le rythme est stable.' : growthRate > 0 ? 'Le rythme accélère.' : 'Le rythme ralentit.'} Au rythme actuel, projection sur
            les {horizonDays} prochains jours :{' '}
            <span className="font-semibold text-foreground">{currency.format(projectedNextPeriod)}</span>.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

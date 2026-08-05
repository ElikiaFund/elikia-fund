import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'

const currency = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 })

// Both keys share the same hue on purpose — "projection" isn't a different entity, it's the same
// revenue metric under less certainty, so it's encoded with a dashed stroke + softer fill instead
// of a second categorical color (which would wrongly imply a distinct series).
const chartConfig = {
  revenue: { label: 'Revenu réel', color: 'var(--chart-1)' },
  forecast: { label: 'Projection', color: 'var(--chart-1)' },
} satisfies ChartConfig

type RevenueTrendChartProps = {
  data: { date: string; revenue?: number; forecast?: number }[]
}

export function RevenueTrendChart({ data }: RevenueTrendChartProps) {
  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Revenu Elikia Fund</CardTitle>
        <CardDescription>Frais conservés par jour, avec projection sur les prochains jours</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="aspect-auto h-[280px] w-full">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-revenue)" stopOpacity={0.4} />
                <stop offset="95%" stopColor="var(--color-revenue)" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="fillForecast" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-forecast)" stopOpacity={0.15} />
                <stop offset="95%" stopColor="var(--color-forecast)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value: string) => format(new Date(value), 'd MMM', { locale: fr })}
            />
            <YAxis tickLine={false} axisLine={false} tickMargin={8} width={40} tickFormatter={(value: number) => `${value / 1000}k`} />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => format(new Date(value as string), 'EEEE d MMMM y', { locale: fr })}
                  formatter={(value, name) => (
                    <div className="flex w-full items-center justify-between gap-3">
                      <span className="text-muted-foreground">{name === 'forecast' ? 'Projection' : 'Revenu réel'}</span>
                      <span className="font-mono font-medium text-foreground tabular-nums">{currency.format(Number(value))}</span>
                    </div>
                  )}
                  indicator="dot"
                />
              }
            />
            <Area dataKey="revenue" type="natural" fill="url(#fillRevenue)" stroke="var(--color-revenue)" strokeWidth={2} connectNulls />
            <Area
              dataKey="forecast"
              type="natural"
              fill="url(#fillForecast)"
              stroke="var(--color-forecast)"
              strokeWidth={2}
              strokeDasharray="6 4"
              connectNulls
            />
            <ChartLegend content={<ChartLegendContent />} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

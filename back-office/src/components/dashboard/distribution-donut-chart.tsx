import { Cell, Pie, PieChart } from 'recharts'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'

const COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)']

/** Keeps the legend/slice count readable regardless of how many distinct labels the caller has. */
function groupTopWithOthers(data: { label: string; value: number }[], max = 4) {
  if (data.length <= max + 1) {
    return data
  }

  const sorted = [...data].sort((a, b) => b.value - a.value)
  const othersTotal = sorted.slice(max).reduce((sum, d) => sum + d.value, 0)

  return [...sorted.slice(0, max), { label: 'Autres', value: othersTotal }]
}

type DistributionDonutChartProps = {
  data: { label: string; value: number }[]
  title: string
  description?: string
  valueFormatter?: (value: number) => string
}

// Generic donut — reused for company-sector and revenus/dépenses breakdowns; any {label, value}[]
// works. Grouped to top 4 + "Autres" to stay within the 5-color chart palette.
export function DistributionDonutChart({ data, title, description, valueFormatter }: DistributionDonutChartProps) {
  const grouped = groupTopWithOthers(data)
  const total = grouped.reduce((sum, d) => sum + d.value, 0)

  const chartConfig = Object.fromEntries(
    grouped.map((d, i) => [d.label, { label: d.label, color: COLORS[i % COLORS.length] }]),
  ) satisfies ChartConfig

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">Aucune donnée.</div>
        ) : (
          <ChartContainer config={chartConfig} className="mx-auto aspect-square h-[240px]">
            <PieChart>
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    hideLabel
                    nameKey="label"
                    formatter={(value, name) => (
                      <div className="flex w-full items-center justify-between gap-3">
                        <span className="text-muted-foreground">{name}</span>
                        <span className="font-mono font-medium text-foreground tabular-nums">
                          {valueFormatter ? valueFormatter(Number(value)) : Number(value).toLocaleString('fr-FR')}
                        </span>
                      </div>
                    )}
                  />
                }
              />
              <Pie data={grouped} dataKey="value" nameKey="label" innerRadius={56} outerRadius={90} strokeWidth={4}>
                {grouped.map((entry, index) => (
                  <Cell key={entry.label} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <ChartLegend content={<ChartLegendContent nameKey="label" />} />
            </PieChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}

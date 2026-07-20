import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'

const chartConfig = {
  total: { label: 'Total', color: 'var(--chart-3)' },
} satisfies ChartConfig

type TontinesChartProps = {
  data: { tontine: string; total: number }[]
  title?: string
  description?: string
}

// Generic ranked horizontal bar chart — the `tontine` field name is a historical leftover from
// its first use case (cotisations par tontine); other callers repurpose it for member names,
// categories, etc. `title`/`description` let each caller label it correctly.
export function TontinesChart({ data, title = 'Cotisations par tontine', description = 'Top 5 sur la période sélectionnée' }: TontinesChartProps) {
  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="aspect-auto h-[280px] w-full">
          <BarChart data={data} layout="vertical" margin={{ left: 8 }}>
            <CartesianGrid horizontal={false} />
            <XAxis type="number" tickLine={false} axisLine={false} tickFormatter={(value: number) => `${value / 1000}k`} />
            <YAxis
              dataKey="tontine"
              type="category"
              tickLine={false}
              axisLine={false}
              width={140}
              tick={{ fontSize: 12 }}
              tickFormatter={(value: string) => (value.length > 20 ? `${value.slice(0, 20)}…` : value)}
            />
            <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
            <Bar dataKey="total" fill="var(--color-total)" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'

const chartConfig = {
  total: { label: 'Cotisations', color: 'var(--chart-3)' },
} satisfies ChartConfig

type TontinesChartProps = {
  data: { tontine: string; total: number }[]
}

export function TontinesChart({ data }: TontinesChartProps) {
  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Cotisations par tontine</CardTitle>
        <CardDescription>Top 5 sur la période sélectionnée</CardDescription>
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

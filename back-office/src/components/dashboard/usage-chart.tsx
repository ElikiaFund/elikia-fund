import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'

const chartConfig = {
  count: { label: 'Transactions', color: 'var(--chart-4)' },
} satisfies ChartConfig

type UsageChartProps = {
  data: { date: string; count: number }[]
}

export function UsageChart({ data }: UsageChartProps) {
  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Fréquence d'utilisation</CardTitle>
        <CardDescription>Nombre de transactions par jour sur la période sélectionnée</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="aspect-auto h-[240px] w-full">
          <BarChart data={data}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value: string) => format(new Date(value), 'd MMM', { locale: fr })}
            />
            <YAxis tickLine={false} axisLine={false} tickMargin={8} width={30} allowDecimals={false} />
            <ChartTooltip
              content={
                <ChartTooltipContent labelFormatter={(value) => format(new Date(value as string), 'EEEE d MMMM y', { locale: fr })} indicator="dot" />
              }
            />
            <Bar dataKey="count" fill="var(--color-count)" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

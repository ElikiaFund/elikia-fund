import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'

const chartConfig = {
  revenus: { label: 'Revenus', color: 'var(--chart-1)' },
  depenses: { label: 'Dépenses', color: 'var(--chart-2)' },
} satisfies ChartConfig

type TransactionsChartProps = {
  data: { date: string; revenus: number; depenses: number }[]
}

export function TransactionsChart({ data }: TransactionsChartProps) {
  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Revenus et dépenses</CardTitle>
        <CardDescription>Cumul journalier sur la période sélectionnée</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="aspect-auto h-[280px] w-full">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="fillRevenus" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-revenus)" stopOpacity={0.4} />
                <stop offset="95%" stopColor="var(--color-revenus)" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="fillDepenses" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-depenses)" stopOpacity={0.4} />
                <stop offset="95%" stopColor="var(--color-depenses)" stopOpacity={0.05} />
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
                  indicator="dot"
                />
              }
            />
            <Area dataKey="depenses" type="natural" fill="url(#fillDepenses)" stroke="var(--color-depenses)" stackId="a" />
            <Area dataKey="revenus" type="natural" fill="url(#fillRevenus)" stroke="var(--color-revenus)" stackId="b" />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

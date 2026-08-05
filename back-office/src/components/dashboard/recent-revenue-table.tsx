import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

import type { RevenueEvent } from '@/components/dashboard/types'
import { Badge } from '@/components/ui/badge'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const currency = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 })

const SOURCE_LABELS: Record<RevenueEvent['source'], string> = {
  contribution: 'Cotisation tontine',
  vault_deposit: 'Dépôt coffre',
  vault_withdraw: 'Retrait coffre',
}

type RecentRevenueTableProps = {
  events: RevenueEvent[]
}

export function RecentRevenueTable({ events }: RecentRevenueTableProps) {
  const rows = [...events].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 8)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenus récents</CardTitle>
        <CardDescription>{events.length} événements générateurs de frais sur la période</CardDescription>
      </CardHeader>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Source</TableHead>
            <TableHead>Montant</TableHead>
            <TableHead>Frais total</TableHead>
            <TableHead>Part Elikia</TableHead>
            <TableHead className="text-right">Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                Aucun revenu sur cette période.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((event) => (
              <TableRow key={event.id}>
                <TableCell>
                  <Badge variant="outline">{SOURCE_LABELS[event.source]}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{currency.format(event.grossAmount)}</TableCell>
                <TableCell className="text-muted-foreground">{currency.format(event.feeAmount)}</TableCell>
                <TableCell className="font-medium text-emerald-600 dark:text-emerald-400">{currency.format(event.platformFeeAmount)}</TableCell>
                <TableCell className="text-right text-muted-foreground">{format(event.date, 'd MMM y', { locale: fr })}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </Card>
  )
}

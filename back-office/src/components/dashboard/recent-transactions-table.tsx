import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

import { Badge } from '@/components/ui/badge'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { Transaction } from '@/data/dashboard-mock'

const currency = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 })

type RecentTransactionsTableProps = {
  transactions: Transaction[]
}

export function RecentTransactionsTable({ transactions }: RecentTransactionsTableProps) {
  const rows = transactions.slice(0, 8)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transactions récentes</CardTitle>
        <CardDescription>{transactions.length} transactions sur la période</CardDescription>
      </CardHeader>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Utilisateur</TableHead>
            <TableHead>Catégorie</TableHead>
            <TableHead>Montant</TableHead>
            <TableHead className="text-right">Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                Aucune transaction sur cette période.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.user}</TableCell>
                <TableCell className="text-muted-foreground">{t.category}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={t.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>
                    {t.type === 'income' ? '+' : '−'}
                    {currency.format(t.amount)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right text-muted-foreground">{format(t.date, 'd MMM y', { locale: fr })}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </Card>
  )
}

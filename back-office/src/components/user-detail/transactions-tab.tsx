import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useMemo, useState } from 'react'

import type { Transaction } from '@/components/dashboard/types'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const currency = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 })

type TypeFilter = 'all' | 'income' | 'expense'

type TransactionsTabProps = {
  transactions: Transaction[]
}

export function TransactionsTab({ transactions }: TransactionsTabProps) {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')

  const filtered = useMemo(() => {
    const rows = typeFilter === 'all' ? transactions : transactions.filter((t) => t.type === typeFilter)
    return rows.slice().sort((a, b) => b.date.getTime() - a.date.getTime())
  }, [transactions, typeFilter])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as TypeFilter)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            <SelectItem value="income">Revenus</SelectItem>
            <SelectItem value="expense">Dépenses</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Type</TableHead>
            <TableHead>Catégorie</TableHead>
            <TableHead>Montant</TableHead>
            <TableHead className="text-right">Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                Aucune transaction sur cette période.
              </TableCell>
            </TableRow>
          ) : (
            filtered.map((t) => (
              <TableRow key={t.id}>
                <TableCell>
                  <Badge variant={t.type === 'income' ? 'default' : 'outline'}>{t.type === 'income' ? 'Revenu' : 'Dépense'}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{t.category}</TableCell>
                <TableCell>{currency.format(t.amount)}</TableCell>
                <TableCell className="text-right text-muted-foreground">{format(t.date, 'd MMM y', { locale: fr })}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

// TODO (Day 6, cuttable to a basic list): fetch from GET /admin/transactions, filters: date, type, user.
export function TransactionsPage() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Utilisateur</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Montant</TableHead>
          <TableHead>Date</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell colSpan={4} className="text-center text-muted-foreground">
            Aucune donnée pour le moment.
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  )
}

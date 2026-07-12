import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

// TODO (Day 6): fetch from GET /admin/users, add search, link rows to a detail view.
export function UsersPage() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nom</TableHead>
          <TableHead>E-mail</TableHead>
          <TableHead>Inscrit le</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell colSpan={3} className="text-center text-muted-foreground">
            Aucune donnée pour le moment.
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  )
}

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

// TODO (Day 6, cuttable): fetch from GET /admin/groups, link rows to a detail view (members + contribution status).
export function GroupsPage() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nom</TableHead>
          <TableHead>Fréquence</TableHead>
          <TableHead>Membres</TableHead>
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

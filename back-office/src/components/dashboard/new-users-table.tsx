import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { NewUser } from '@/data/dashboard-mock'

function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

type NewUsersTableProps = {
  users: NewUser[]
}

export function NewUsersTable({ users }: NewUsersTableProps) {
  const rows = users.slice(0, 8)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nouveaux utilisateurs</CardTitle>
        <CardDescription>{users.length} inscriptions sur la période</CardDescription>
      </CardHeader>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Utilisateur</TableHead>
            <TableHead className="text-right">Inscrit le</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={2} className="text-center text-muted-foreground">
                Aucune inscription sur cette période.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((u) => (
              <TableRow key={u.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="size-7">
                      <AvatarFallback className="text-xs">{initials(u.name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="font-medium">{u.name}</span>
                      <span className="text-xs text-muted-foreground">{u.email}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right text-muted-foreground">{format(u.joinedAt, 'd MMM y', { locale: fr })}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </Card>
  )
}

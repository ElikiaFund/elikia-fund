import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useState } from 'react'
import { toast } from 'sonner'

import { DataTableRowActions } from '@/components/data-table/row-actions'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { adminService, type AdminCashSession } from '@/services/adminService'

const currency = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 })

type CashSessionsTabProps = {
  cashSessions: AdminCashSession[]
}

export function CashSessionsTab({ cashSessions: initialSessions }: CashSessionsTabProps) {
  const [sessions, setSessions] = useState(initialSessions)

  async function handleDelete(id: number) {
    await adminService.deleteCashSession(id)
    setSessions((current) => current.filter((s) => s.id !== id))
    toast.success('Session de caisse supprimée.')
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Période</TableHead>
          <TableHead>Clôturée le</TableHead>
          <TableHead>Solde attendu</TableHead>
          <TableHead>Solde compté</TableHead>
          <TableHead>Écart</TableHead>
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {sessions.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="text-center text-muted-foreground">
              Aucune session de caisse enregistrée.
            </TableCell>
          </TableRow>
        ) : (
          sessions.map((session) => {
            const variance = Number(session.variance)

            return (
              <TableRow key={session.id}>
                <TableCell className="text-muted-foreground">
                  {session.period_start ? format(new Date(session.period_start), 'd MMM y', { locale: fr }) : 'Depuis le début'}
                </TableCell>
                <TableCell>{format(new Date(session.closed_at), 'd MMM y, HH:mm', { locale: fr })}</TableCell>
                <TableCell>{currency.format(Number(session.expected_balance))}</TableCell>
                <TableCell>{currency.format(Number(session.counted_balance))}</TableCell>
                <TableCell className={variance !== 0 ? 'text-destructive' : 'text-muted-foreground'}>
                  {currency.format(variance)}
                </TableCell>
                <TableCell>
                  <DataTableRowActions
                    itemLabel={`la session du ${format(new Date(session.closed_at), 'd MMM y', { locale: fr })}`}
                    confirmValue={format(new Date(session.closed_at), 'd MMM y', { locale: fr })}
                    onDelete={() => handleDelete(session.id)}
                  />
                </TableCell>
              </TableRow>
            )
          })
        )}
      </TableBody>
    </Table>
  )
}

import type { ColumnDef } from '@tanstack/react-table'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { BulkDeleteButton } from '@/components/data-table/bulk-delete-button'
import { DataTableColumnHeader } from '@/components/data-table/column-header'
import { DataTable } from '@/components/data-table/data-table'
import { DataTableRowActions } from '@/components/data-table/row-actions'
import { createSelectColumn } from '@/components/data-table/select-column'
import { usePageTitle } from '@/hooks/use-page-title'
import { adminService, type AdminSupportTicket } from '@/services/adminService'

const columns: ColumnDef<AdminSupportTicket>[] = [
  createSelectColumn<AdminSupportTicket>(),
  {
    id: 'user',
    accessorFn: (row) => row.user.name,
    header: ({ column }) => <DataTableColumnHeader column={column} title="Utilisateur" />,
    meta: { label: 'Utilisateur' },
  },
  {
    accessorKey: 'email',
    header: ({ column }) => <DataTableColumnHeader column={column} title="E-mail" />,
    meta: { label: 'E-mail' },
  },
  {
    accessorKey: 'subject',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Sujet" />,
    meta: { label: 'Sujet' },
  },
  {
    accessorKey: 'message',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Message" />,
    cell: ({ row }) => <span className="line-clamp-2 max-w-md text-muted-foreground">{row.original.message}</span>,
    meta: { label: 'Message' },
  },
  {
    accessorKey: 'created_at',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Reçu le" />,
    cell: ({ row }) => format(new Date(row.original.created_at), 'd MMM y, HH:mm', { locale: fr }),
    meta: { label: 'Reçu le' },
  },
]

export function SupportTicketsPage() {
  usePageTitle('Support')

  const [tickets, setTickets] = useState<AdminSupportTicket[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchTickets()
  }, [])

  function fetchTickets() {
    setIsLoading(true)
    adminService
      .listSupportTickets()
      .then(setTickets)
      .finally(() => setIsLoading(false))
  }

  async function handleDelete(id: number) {
    await adminService.deleteSupportTicket(id)
    setTickets((current) => current.filter((t) => t.id !== id))
    toast.success('Ticket supprimé.')
  }

  const columnsWithActions: ColumnDef<AdminSupportTicket>[] = [
    ...columns,
    {
      id: 'actions',
      cell: ({ row }) => <DataTableRowActions itemLabel={row.original.subject} onDelete={() => handleDelete(row.original.id)} />,
    },
  ]

  return (
    <DataTable
      columns={columnsWithActions}
      data={tickets}
      isLoading={isLoading}
      searchPlaceholder="Rechercher un ticket…"
      bulkActions={(rows, clearSelection) => (
        <BulkDeleteButton
          count={rows.length}
          itemLabelPlural="tickets"
          onConfirm={async () => {
            await Promise.all(rows.map((row) => adminService.deleteSupportTicket(row.id)))
            setTickets((current) => current.filter((t) => !rows.some((r) => r.id === t.id)))
            clearSelection()
            toast.success(`${rows.length} ticket(s) supprimé(s).`)
          }}
        />
      )}
    />
  )
}

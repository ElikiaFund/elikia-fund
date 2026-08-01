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
import { adminService, type AdminContactMessage } from '@/services/adminService'

const columns: ColumnDef<AdminContactMessage>[] = [
  createSelectColumn<AdminContactMessage>(),
  {
    accessorKey: 'name',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Nom" />,
    meta: { label: 'Nom' },
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

export function ContactPage() {
  usePageTitle('Contact')

  const [messages, setMessages] = useState<AdminContactMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchMessages()
  }, [])

  function fetchMessages() {
    setIsLoading(true)
    adminService
      .listContactMessages()
      .then(setMessages)
      .finally(() => setIsLoading(false))
  }

  async function handleDelete(id: number) {
    await adminService.deleteContactMessage(id)
    setMessages((current) => current.filter((m) => m.id !== id))
    toast.success('Message supprimé.')
  }

  const columnsWithActions: ColumnDef<AdminContactMessage>[] = [
    ...columns,
    {
      id: 'actions',
      cell: ({ row }) => <DataTableRowActions itemLabel={row.original.subject} onDelete={() => handleDelete(row.original.id)} />,
    },
  ]

  return (
    <DataTable
      columns={columnsWithActions}
      data={messages}
      isLoading={isLoading}
      searchPlaceholder="Rechercher un message…"
      bulkActions={(rows, clearSelection) => (
        <BulkDeleteButton
          count={rows.length}
          itemLabelPlural="messages"
          onConfirm={async () => {
            await Promise.all(rows.map((row) => adminService.deleteContactMessage(row.id)))
            setMessages((current) => current.filter((m) => !rows.some((r) => r.id === m.id)))
            clearSelection()
            toast.success(`${rows.length} message(s) supprimé(s).`)
          }}
        />
      )}
    />
  )
}

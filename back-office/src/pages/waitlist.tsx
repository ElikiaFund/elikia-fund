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
import { adminService, type AdminWaitlistEntry } from '@/services/adminService'

const columns: ColumnDef<AdminWaitlistEntry>[] = [
  createSelectColumn<AdminWaitlistEntry>(),
  {
    accessorKey: 'email',
    header: ({ column }) => <DataTableColumnHeader column={column} title="E-mail" />,
    meta: { label: 'E-mail' },
  },
  {
    accessorKey: 'name',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Nom" />,
    cell: ({ row }) => row.original.name ?? 'Non renseigné',
    meta: { label: 'Nom' },
  },
  {
    accessorKey: 'created_at',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Inscrit le" />,
    cell: ({ row }) => format(new Date(row.original.created_at), 'd MMM y', { locale: fr }),
    meta: { label: 'Inscrit le' },
  },
]

export function WaitlistPage() {
  const [entries, setEntries] = useState<AdminWaitlistEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchEntries()
  }, [])

  function fetchEntries() {
    setIsLoading(true)
    adminService
      .listWaitlist()
      .then(setEntries)
      .finally(() => setIsLoading(false))
  }

  async function handleDelete(id: number) {
    await adminService.deleteWaitlistEntry(id)
    setEntries((current) => current.filter((e) => e.id !== id))
    toast.success('Inscription supprimée.')
  }

  const columnsWithActions: ColumnDef<AdminWaitlistEntry>[] = [
    ...columns,
    {
      id: 'actions',
      cell: ({ row }) => <DataTableRowActions itemLabel={row.original.email} onDelete={() => handleDelete(row.original.id)} />,
    },
  ]

  return (
    <DataTable
      columns={columnsWithActions}
      data={entries}
      isLoading={isLoading}
      searchPlaceholder="Rechercher un e-mail…"
      bulkActions={(rows, clearSelection) => (
        <BulkDeleteButton
          count={rows.length}
          itemLabelPlural="inscriptions"
          onConfirm={async () => {
            await Promise.all(rows.map((row) => adminService.deleteWaitlistEntry(row.id)))
            setEntries((current) => current.filter((e) => !rows.some((r) => r.id === e.id)))
            clearSelection()
            toast.success(`${rows.length} inscription(s) supprimée(s).`)
          }}
        />
      )}
    />
  )
}

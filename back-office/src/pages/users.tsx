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
import { facetedFilterFn } from '@/components/data-table/types'
import { Badge } from '@/components/ui/badge'
import { adminService, type AdminUser } from '@/services/adminService'

const columns: ColumnDef<AdminUser>[] = [
  createSelectColumn<AdminUser>(),
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
    id: 'company',
    accessorFn: (row) => row.company?.name ?? '—',
    header: 'Entreprise',
    meta: { label: 'Entreprise' },
  },
  {
    id: 'is_admin',
    accessorFn: (row) => String(row.is_admin),
    header: ({ column }) => <DataTableColumnHeader column={column} title="Admin" />,
    cell: ({ row }) => <Badge variant={row.original.is_admin ? 'default' : 'outline'}>{row.original.is_admin ? 'Oui' : 'Non'}</Badge>,
    filterFn: facetedFilterFn,
    meta: { label: 'Admin' },
  },
  {
    accessorKey: 'created_at',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Inscrit le" />,
    cell: ({ row }) => format(new Date(row.original.created_at), 'd MMM y', { locale: fr }),
    meta: { label: 'Inscrit le' },
  },
]

export function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchUsers()
  }, [])

  function fetchUsers() {
    setIsLoading(true)
    adminService
      .listUsers()
      .then(setUsers)
      .finally(() => setIsLoading(false))
  }

  async function handleDelete(id: number) {
    await adminService.deleteUser(id)
    setUsers((current) => current.filter((u) => u.id !== id))
    toast.success('Utilisateur supprimé.')
  }

  const columnsWithActions: ColumnDef<AdminUser>[] = [
    ...columns,
    {
      id: 'actions',
      cell: ({ row }) => <DataTableRowActions itemLabel={row.original.name} onDelete={() => handleDelete(row.original.id)} />,
    },
  ]

  return (
    <DataTable
      columns={columnsWithActions}
      data={users}
      isLoading={isLoading}
      searchPlaceholder="Rechercher un utilisateur…"
      facetedFilters={[
        {
          columnId: 'is_admin',
          title: 'Admin',
          options: [
            { label: 'Oui', value: 'true' },
            { label: 'Non', value: 'false' },
          ],
        },
      ]}
      bulkActions={(rows, clearSelection) => (
        <BulkDeleteButton
          count={rows.length}
          itemLabelPlural="utilisateurs"
          onConfirm={async () => {
            await Promise.all(rows.map((row) => adminService.deleteUser(row.id)))
            setUsers((current) => current.filter((u) => !rows.some((r) => r.id === u.id)))
            clearSelection()
            toast.success(`${rows.length} utilisateur(s) supprimé(s).`)
          }}
        />
      )}
    />
  )
}

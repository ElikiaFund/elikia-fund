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
import { adminService, type AdminGroup } from '@/services/adminService'

const currency = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 })

const FREQUENCY_LABELS: Record<string, string> = { weekly: 'Hebdomadaire', monthly: 'Mensuelle' }

const columns: ColumnDef<AdminGroup>[] = [
  createSelectColumn<AdminGroup>(),
  {
    accessorKey: 'name',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Nom" />,
    meta: { label: 'Nom' },
  },
  {
    accessorKey: 'frequency',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Fréquence" />,
    cell: ({ row }) => <Badge variant="outline">{FREQUENCY_LABELS[row.original.frequency] ?? row.original.frequency}</Badge>,
    filterFn: facetedFilterFn,
    meta: { label: 'Fréquence' },
  },
  {
    accessorKey: 'contribution_amount',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Cotisation" />,
    cell: ({ row }) => currency.format(Number(row.original.contribution_amount)),
    sortingFn: (a, b) => Number(a.original.contribution_amount) - Number(b.original.contribution_amount),
    meta: { label: 'Cotisation' },
  },
  {
    accessorKey: 'members_count',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Membres" />,
    cell: ({ row }) => (row.original.max_members ? `${row.original.members_count} / ${row.original.max_members}` : row.original.members_count),
    meta: { label: 'Membres' },
  },
  {
    id: 'owner',
    accessorFn: (row) => row.owner.name,
    header: ({ column }) => <DataTableColumnHeader column={column} title="Propriétaire" />,
    meta: { label: 'Propriétaire' },
  },
  {
    accessorKey: 'created_at',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Créée le" />,
    cell: ({ row }) => format(new Date(row.original.created_at), 'd MMM y', { locale: fr }),
    meta: { label: 'Créée le' },
  },
]

export function GroupsPage() {
  const [groups, setGroups] = useState<AdminGroup[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchGroups()
  }, [])

  function fetchGroups() {
    setIsLoading(true)
    adminService
      .listGroups()
      .then(setGroups)
      .finally(() => setIsLoading(false))
  }

  async function handleDelete(id: number) {
    await adminService.deleteGroup(id)
    setGroups((current) => current.filter((g) => g.id !== id))
    toast.success('Tontine supprimée.')
  }

  const columnsWithActions: ColumnDef<AdminGroup>[] = [
    ...columns,
    {
      id: 'actions',
      cell: ({ row }) => <DataTableRowActions itemLabel={row.original.name} onDelete={() => handleDelete(row.original.id)} />,
    },
  ]

  return (
    <DataTable
      columns={columnsWithActions}
      data={groups}
      isLoading={isLoading}
      getRowHref={(row) => `/tontines/${row.id}`}
      searchPlaceholder="Rechercher une tontine…"
      facetedFilters={[
        {
          columnId: 'frequency',
          title: 'Fréquence',
          options: [
            { label: 'Hebdomadaire', value: 'weekly' },
            { label: 'Mensuelle', value: 'monthly' },
          ],
        },
      ]}
      bulkActions={(rows, clearSelection) => (
        <BulkDeleteButton
          count={rows.length}
          itemLabelPlural="tontines"
          onConfirm={async () => {
            await Promise.all(rows.map((row) => adminService.deleteGroup(row.id)))
            setGroups((current) => current.filter((g) => !rows.some((r) => r.id === g.id)))
            clearSelection()
            toast.success(`${rows.length} tontine(s) supprimée(s).`)
          }}
        />
      )}
    />
  )
}

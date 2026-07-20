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
import { COMPANY_CATEGORY_OPTIONS, formatCompanyCategory } from '@/lib/company-categories'
import { adminService, type AdminCompanyWithOwner } from '@/services/adminService'

const columns: ColumnDef<AdminCompanyWithOwner>[] = [
  createSelectColumn<AdminCompanyWithOwner>(),
  {
    accessorKey: 'name',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Nom" />,
    meta: { label: 'Nom' },
  },
  {
    accessorKey: 'category',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Catégorie" />,
    cell: ({ row }) => (
      <Badge variant="outline">{formatCompanyCategory(row.original.category, row.original.other_category)}</Badge>
    ),
    filterFn: facetedFilterFn,
    meta: { label: 'Catégorie' },
  },
  {
    id: 'owner',
    accessorFn: (row) => row.user.name,
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

export function CompaniesPage() {
  const [companies, setCompanies] = useState<AdminCompanyWithOwner[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchCompanies()
  }, [])

  function fetchCompanies() {
    setIsLoading(true)
    adminService
      .listCompanies()
      .then(setCompanies)
      .finally(() => setIsLoading(false))
  }

  async function handleDelete(id: number) {
    await adminService.deleteCompany(id)
    setCompanies((current) => current.filter((c) => c.id !== id))
    toast.success('Entreprise supprimée.')
  }

  const columnsWithActions: ColumnDef<AdminCompanyWithOwner>[] = [
    ...columns,
    {
      id: 'actions',
      cell: ({ row }) => <DataTableRowActions itemLabel={row.original.name} onDelete={() => handleDelete(row.original.id)} />,
    },
  ]

  return (
    <DataTable
      columns={columnsWithActions}
      data={companies}
      isLoading={isLoading}
      getRowHref={(row) => `/entreprises/${row.id}`}
      searchPlaceholder="Rechercher une entreprise…"
      facetedFilters={[{ columnId: 'category', title: 'Catégorie', options: COMPANY_CATEGORY_OPTIONS }]}
      bulkActions={(rows, clearSelection) => (
        <BulkDeleteButton
          count={rows.length}
          itemLabelPlural="entreprises"
          onConfirm={async () => {
            await Promise.all(rows.map((row) => adminService.deleteCompany(row.id)))
            setCompanies((current) => current.filter((c) => !rows.some((r) => r.id === c.id)))
            clearSelection()
            toast.success(`${rows.length} entreprise(s) supprimée(s).`)
          }}
        />
      )}
    />
  )
}

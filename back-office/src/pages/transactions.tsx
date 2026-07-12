import type { ColumnDef } from '@tanstack/react-table'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { BulkDeleteButton } from '@/components/data-table/bulk-delete-button'
import { DataTableColumnHeader } from '@/components/data-table/column-header'
import { DataTable } from '@/components/data-table/data-table'
import { DataTableRowActions } from '@/components/data-table/row-actions'
import { createSelectColumn } from '@/components/data-table/select-column'
import { facetedFilterFn } from '@/components/data-table/types'
import { Badge } from '@/components/ui/badge'
import { adminService, type AdminTransaction } from '@/services/adminService'

const currency = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 })

const columns: ColumnDef<AdminTransaction>[] = [
  createSelectColumn<AdminTransaction>(),
  {
    id: 'user',
    accessorFn: (row) => row.user.name,
    header: ({ column }) => <DataTableColumnHeader column={column} title="Utilisateur" />,
    meta: { label: 'Utilisateur' },
  },
  {
    accessorKey: 'type',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
    cell: ({ row }) => <Badge variant={row.original.type === 'income' ? 'default' : 'outline'}>{row.original.type === 'income' ? 'Revenu' : 'Dépense'}</Badge>,
    filterFn: facetedFilterFn,
    meta: { label: 'Type' },
  },
  {
    accessorKey: 'category',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Catégorie" />,
    filterFn: facetedFilterFn,
    meta: { label: 'Catégorie' },
  },
  {
    accessorKey: 'amount',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Montant" />,
    cell: ({ row }) => currency.format(Number(row.original.amount)),
    sortingFn: (a, b) => Number(a.original.amount) - Number(b.original.amount),
    meta: { label: 'Montant' },
  },
  {
    accessorKey: 'occurred_at',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
    cell: ({ row }) => format(new Date(row.original.occurred_at), 'd MMM y', { locale: fr }),
    meta: { label: 'Date' },
  },
]

export function TransactionsPage() {
  const [transactions, setTransactions] = useState<AdminTransaction[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchTransactions()
  }, [])

  function fetchTransactions() {
    setIsLoading(true)
    adminService
      .listTransactions()
      .then(setTransactions)
      .finally(() => setIsLoading(false))
  }

  async function handleDelete(id: number) {
    await adminService.deleteTransaction(id)
    setTransactions((current) => current.filter((t) => t.id !== id))
    toast.success('Transaction supprimée.')
  }

  const categoryOptions = useMemo(
    () => Array.from(new Set(transactions.map((t) => t.category))).map((category) => ({ label: category, value: category })),
    [transactions],
  )

  const columnsWithActions: ColumnDef<AdminTransaction>[] = [
    ...columns,
    {
      id: 'actions',
      cell: ({ row }) => <DataTableRowActions itemLabel={`la transaction de ${row.original.user.name}`} onDelete={() => handleDelete(row.original.id)} />,
    },
  ]

  return (
    <DataTable
      columns={columnsWithActions}
      data={transactions}
      isLoading={isLoading}
      searchPlaceholder="Rechercher une transaction…"
      facetedFilters={[
        {
          columnId: 'type',
          title: 'Type',
          options: [
            { label: 'Revenu', value: 'income' },
            { label: 'Dépense', value: 'expense' },
          ],
        },
        { columnId: 'category', title: 'Catégorie', options: categoryOptions },
      ]}
      bulkActions={(rows, clearSelection) => (
        <BulkDeleteButton
          count={rows.length}
          itemLabelPlural="transactions"
          onConfirm={async () => {
            await Promise.all(rows.map((row) => adminService.deleteTransaction(row.id)))
            setTransactions((current) => current.filter((t) => !rows.some((r) => r.id === t.id)))
            clearSelection()
            toast.success(`${rows.length} transaction(s) supprimée(s).`)
          }}
        />
      )}
    />
  )
}

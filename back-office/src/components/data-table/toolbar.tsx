import type { Table } from '@tanstack/react-table'
import { SlidersHorizontalIcon, XIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { DataTableFacetedFilter, type FacetedFilterOption } from '@/components/data-table/faceted-filter'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'

export type FacetedFilterConfig = {
  columnId: string
  title: string
  options: FacetedFilterOption[]
}

type DataTableToolbarProps<TData> = {
  table: Table<TData>
  searchPlaceholder?: string
  facetedFilters?: FacetedFilterConfig[]
  bulkActions?: ReactNode
}

export function DataTableToolbar<TData>({ table, searchPlaceholder, facetedFilters, bulkActions }: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0
  const selectedCount = table.getFilteredSelectedRowModel().rows.length

  if (selectedCount > 0 && bulkActions) {
    return (
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{selectedCount} ligne(s) sélectionnée(s)</p>
        <div className="flex items-center gap-2">{bulkActions}</div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 flex-wrap items-center gap-2">
        {searchPlaceholder && (
          <Input
            placeholder={searchPlaceholder}
            value={(table.getState().globalFilter as string) ?? ''}
            onChange={(event) => table.setGlobalFilter(event.target.value)}
            className="h-8 w-[180px] lg:w-[250px]"
          />
        )}
        {facetedFilters?.map((filter) => (
          <DataTableFacetedFilter key={filter.columnId} column={table.getColumn(filter.columnId)} title={filter.title} options={filter.options} />
        ))}
        {isFiltered && (
          <Button variant="ghost" onClick={() => table.resetColumnFilters()} className="h-8 px-2 lg:px-3">
            Réinitialiser
            <XIcon />
          </Button>
        )}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="ml-auto hidden h-8 lg:flex">
            <SlidersHorizontalIcon />
            Colonnes
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[180px]">
          {table
            .getAllColumns()
            .filter((column) => column.getCanHide())
            .map((column) => (
              <DropdownMenuCheckboxItem
                key={column.id}
                checked={column.getIsVisible()}
                onCheckedChange={(value) => column.toggleVisibility(!!value)}>
                {column.columnDef.meta?.label ?? column.id}
              </DropdownMenuCheckboxItem>
            ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

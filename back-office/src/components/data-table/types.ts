import type { Row } from '@tanstack/react-table'

// Lets ColumnDef.meta carry a French display label, used by the column-visibility dropdown.
declare module '@tanstack/react-table' {
  interface ColumnMeta<TData, TValue> {
    label?: string
  }
}

export function facetedFilterFn<TData>(row: Row<TData>, columnId: string, filterValue: string[]): boolean {
  return filterValue.includes(String(row.getValue(columnId)))
}

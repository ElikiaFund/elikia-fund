import { MoreHorizontalIcon, TrashIcon } from 'lucide-react'
import { useState } from 'react'

import { ConfirmDeleteDialog } from '@/components/data-table/confirm-delete-dialog'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

type DataTableRowActionsProps = {
  itemLabel: string
  /** The value the admin must type to confirm — defaults to itemLabel (e.g. a record's name); pass a formatted amount for transactions. */
  confirmValue?: string
  onDelete: () => Promise<void>
}

export function DataTableRowActions({ itemLabel, confirmValue, onDelete }: DataTableRowActionsProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8">
            <MoreHorizontalIcon />
            <span className="sr-only">Ouvrir le menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem variant="destructive" onClick={() => setConfirmOpen(true)}>
            <TrashIcon />
            Supprimer
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDeleteDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Supprimer ${itemLabel} ?`}
        description="Cette action est irréversible."
        confirmValue={confirmValue ?? itemLabel}
        onConfirm={onDelete}
      />
    </>
  )
}

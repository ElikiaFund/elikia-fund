import { TrashIcon } from 'lucide-react'
import { useState } from 'react'

import { ConfirmDeleteDialog } from '@/components/data-table/confirm-delete-dialog'
import { Button } from '@/components/ui/button'

const BULK_CONFIRM_KEYWORD = 'SUPPRIMER'

type BulkDeleteButtonProps = {
  count: number
  itemLabelPlural: string
  onConfirm: () => Promise<void>
}

export function BulkDeleteButton({ count, itemLabelPlural, onConfirm }: BulkDeleteButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button variant="destructive" size="sm" onClick={() => setOpen(true)}>
        <TrashIcon />
        Supprimer ({count})
      </Button>

      <ConfirmDeleteDialog
        open={open}
        onOpenChange={setOpen}
        title={`Supprimer ${count} ${itemLabelPlural} ?`}
        description={`Cette action est irréversible. Tapez ${BULK_CONFIRM_KEYWORD} pour confirmer la suppression groupée.`}
        confirmValue={BULK_CONFIRM_KEYWORD}
        onConfirm={onConfirm}
      />
    </>
  )
}

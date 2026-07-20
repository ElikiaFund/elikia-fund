import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { adminService } from '@/services/adminService'

type ConfirmDeleteDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  /** The value the admin must type verbatim before being allowed to continue (a record's name/amount, or a fixed keyword for bulk deletes). */
  confirmValue: string
  onConfirm: () => Promise<void>
}

export function ConfirmDeleteDialog({ open, onOpenChange, title, description, confirmValue, onConfirm }: ConfirmDeleteDialogProps) {
  const [step, setStep] = useState<'confirm-value' | 'password'>('confirm-value')
  const [typedValue, setTypedValue] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function reset() {
    setStep('confirm-value')
    setTypedValue('')
    setPassword('')
    setError(null)
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      reset()
    }
    onOpenChange(next)
  }

  async function handleFinalConfirm() {
    setError(null)
    setIsSubmitting(true)

    try {
      await adminService.verifyPassword(password)
      await onConfirm()
      handleOpenChange(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Une erreur est survenue. Veuillez réessayer.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        {step === 'confirm-value' ? (
          <div className="flex flex-col gap-2">
            <Label htmlFor="confirm-delete-value">
              Tapez <span className="font-semibold">{confirmValue}</span> pour confirmer
            </Label>
            <Input
              id="confirm-delete-value"
              value={typedValue}
              onChange={(event) => setTypedValue(event.target.value)}
              autoComplete="off"
              autoFocus
            />
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <Label htmlFor="confirm-delete-password">Votre mot de passe</Label>
            <Input
              id="confirm-delete-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              autoFocus
              onKeyDown={(event) => event.key === 'Enter' && !isSubmitting && password && handleFinalConfirm()}
            />
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
            Annuler
          </Button>
          {step === 'confirm-value' ? (
            <Button variant="destructive" disabled={typedValue !== confirmValue} onClick={() => setStep('password')}>
              Continuer
            </Button>
          ) : (
            <Button variant="destructive" disabled={!password || isSubmitting} onClick={handleFinalConfirm}>
              {isSubmitting ? 'Suppression…' : 'Confirmer la suppression'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

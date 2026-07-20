import { AlertTriangleIcon } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { adminService } from '@/services/adminService'

type ConfirmLiveModeDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /**
   * Performs the actual save — called only after the password re-check succeeds. Receives the
   * password so the mutation request itself can carry it: the API independently re-verifies it
   * server-side before flipping the stored mode to 'live', not just trusting that this dialog
   * ran (see YabetoSettingController::update()).
   */
  onConfirm: (password: string) => Promise<void>
}

/**
 * Step-up confirmation for switching Yabeto Pay from sandbox to live — the same password
 * re-check used by ConfirmDeleteDialog for destructive actions, since flipping to production
 * means real money moves on every deposit/withdraw/contribution from then on.
 */
export function ConfirmLiveModeDialog({ open, onOpenChange, onConfirm }: ConfirmLiveModeDialogProps) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function handleOpenChange(next: boolean) {
    if (!next) {
      setPassword('')
      setError(null)
    }
    onOpenChange(next)
  }

  async function handleConfirm() {
    setError(null)
    setIsSubmitting(true)

    try {
      await adminService.verifyPassword(password)
      await onConfirm(password)
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
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangleIcon className="size-5 text-destructive" />
            Passer Yabeto Pay en mode Live
          </DialogTitle>
          <DialogDescription>
            Vous êtes sur le point d&apos;activer l&apos;environnement de production. Les dépôts, retraits et
            cotisations utiliseront de l&apos;argent réel via Yabeto Pay — ce n&apos;est plus une simulation.
            Confirmez avec votre mot de passe pour continuer.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <Label htmlFor="confirm-live-password">Votre mot de passe</Label>
          <Input
            id="confirm-live-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            autoFocus
            onKeyDown={(event) => event.key === 'Enter' && !isSubmitting && password && handleConfirm()}
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
            Annuler
          </Button>
          <Button variant="destructive" disabled={!password || isSubmitting} onClick={handleConfirm}>
            {isSubmitting ? 'Activation…' : 'Activer le mode Live'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

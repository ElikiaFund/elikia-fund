import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { AlertTriangleIcon, Loader2Icon } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { ApiError } from '@/services/apiService'
import { adminService, type AdminVaultMovement, type SettleOutcome } from '@/services/adminService'

const currency = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 })

/**
 * Withdrawals Yabeto couldn't confirm either way. They are no longer refunded automatically (a
 * refund on a payout that did go through would pay the merchant twice) — support checks the
 * reference in Yabeto's dashboard and settles each one here.
 */
export function WithdrawalsReviewCard({
  movements,
  onSettled,
}: {
  movements: AdminVaultMovement[]
  onSettled: (movement: AdminVaultMovement) => void
}) {
  const [selected, setSelected] = useState<AdminVaultMovement | null>(null)

  if (movements.length === 0) {
    return null
  }

  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangleIcon className="size-4 text-destructive" />
          Retraits à vérifier ({movements.length})
        </CardTitle>
        <CardDescription>
          Yabeto n’a pas pu confirmer ces retraits. L’argent reste réservé : vérifiez la référence dans le tableau de bord Yabeto, puis
          confirmez le versement ou remboursez le coffre.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Entreprise</TableHead>
              <TableHead className="text-right">Montant</TableHead>
              <TableHead>Référence Yabeto</TableHead>
              <TableHead>Motif</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {movements.map((movement) => (
              <TableRow key={movement.id}>
                <TableCell className="whitespace-nowrap">{format(new Date(movement.created_at), 'd MMM y, HH:mm', { locale: fr })}</TableCell>
                <TableCell>
                  <Link to={`/entreprises/${movement.vault.company.id}`} className="font-medium hover:underline">
                    {movement.vault.company.name}
                  </Link>
                  <span className="block text-xs text-muted-foreground">{movement.vault.company.user.name}</span>
                </TableCell>
                <TableCell className="text-right whitespace-nowrap">{currency.format(Number(movement.amount))}</TableCell>
                <TableCell className="font-mono text-xs">{movement.yabeto_reference ?? 'Aucune'}</TableCell>
                <TableCell className="max-w-xs truncate text-muted-foreground" title={movement.review_reason ?? undefined}>
                  {movement.review_reason ?? '—'}
                </TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="outline" onClick={() => setSelected(movement)}>
                    Régler
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      {selected && (
        <SettleDialog
          movement={selected}
          onClose={() => setSelected(null)}
          onSettled={(settled) => {
            setSelected(null)
            onSettled(settled)
          }}
        />
      )}
    </Card>
  )
}

function SettleDialog({
  movement,
  onClose,
  onSettled,
}: {
  movement: AdminVaultMovement
  onClose: () => void
  onSettled: (movement: AdminVaultMovement) => void
}) {
  const [outcome, setOutcome] = useState<SettleOutcome | null>(null)
  const [note, setNote] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const amount = currency.format(Number(movement.amount))

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()

    if (!outcome || !password) {
      return
    }

    setError(null)
    setIsSubmitting(true)

    try {
      const settled = await adminService.settleVaultMovement(movement.id, { outcome, password, note: note.trim() || undefined })
      toast.success(outcome === 'succeeded' ? 'Versement confirmé.' : `Coffre remboursé de ${amount}.`)
      onSettled(settled)
    } catch (e) {
      setError(
        e instanceof ApiError && e.status === 403
          ? 'Action réservée aux rôles autorisés à régler les retraits.'
          : e instanceof Error
            ? e.message
            : 'Une erreur est survenue.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Régler le retrait de {amount}</DialogTitle>
            <DialogDescription>
              {movement.vault.company.name} · référence {movement.yabeto_reference ?? 'aucune'}. Vérifiez d’abord ce retrait dans le tableau
              de bord Yabeto.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button type="button" variant={outcome === 'succeeded' ? 'default' : 'outline'} onClick={() => setOutcome('succeeded')}>
              Le versement a eu lieu
            </Button>
            <Button type="button" variant={outcome === 'failed' ? 'destructive' : 'outline'} onClick={() => setOutcome('failed')}>
              Rembourser le coffre
            </Button>
          </div>
          {outcome && (
            <p className="text-sm text-muted-foreground">
              {outcome === 'succeeded'
                ? `Le retrait est confirmé : les ${amount} restent hors du coffre et le marchand est notifié.`
                : `Le retrait est annulé : ${amount} sont recrédités sur le coffre et le marchand est notifié.`}
            </p>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="settle-note">Note (facultatif)</Label>
            <Textarea id="settle-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} placeholder="Ce que montre Yabeto…" />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="settle-password">Votre mot de passe</Label>
            <Input id="settle-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={!outcome || !password || isSubmitting}>
              {isSubmitting && <Loader2Icon className="animate-spin" />}
              Confirmer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

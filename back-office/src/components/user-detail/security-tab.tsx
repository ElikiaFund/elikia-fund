import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useEffect, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { adminService, type VaultSecurityEvent, type VaultSecurityEventType } from '@/services/adminService'

const currency = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 })

const TYPE_LABELS: Record<VaultSecurityEventType, string> = {
  pin_failed: 'Code PIN incorrect',
  pin_locked: 'Coffre verrouillé',
  activated: 'Coffre activé',
  flagged_transaction: 'Transaction signalée',
}

const TYPE_BADGE_VARIANTS: Record<VaultSecurityEventType, 'outline' | 'secondary' | 'destructive'> = {
  pin_failed: 'outline',
  pin_locked: 'destructive',
  activated: 'secondary',
  flagged_transaction: 'destructive',
}

const FRAUD_REASON_LABELS: Record<string, string> = {
  unusual_amount: 'Montant inhabituel',
  velocity: 'Fréquence de transactions élevée',
  rapid_cycling: 'Dépôt suivi d’un retrait rapide',
}

function detailFor(event: VaultSecurityEvent): string {
  const metadata = event.metadata ?? {}

  switch (event.type) {
    case 'pin_failed':
      return typeof metadata.attempt === 'number' ? `Tentative n°${metadata.attempt} sur 5` : '—'
    case 'pin_locked':
      return typeof metadata.minutes === 'number' ? `Verrouillé pendant ${metadata.minutes} minute(s)` : '—'
    case 'activated':
      return '—'
    case 'flagged_transaction': {
      const reasons = Array.isArray(metadata.reasons)
        ? (metadata.reasons as string[]).map((r) => FRAUD_REASON_LABELS[r] ?? r).join(', ')
        : ''
      const amount = event.vault_movement ? currency.format(Number(event.vault_movement.amount)) : null

      return [reasons, amount].filter(Boolean).join(' — ') || '—'
    }
    default:
      return '—'
  }
}

type SecurityTabProps = {
  userId: number
}

export function SecurityTab({ userId }: SecurityTabProps) {
  const [events, setEvents] = useState<VaultSecurityEvent[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setIsLoading(true)
    adminService
      .getVaultSecurityEvents(userId)
      .then(setEvents)
      .finally(() => setIsLoading(false))
  }, [userId])

  if (isLoading || !events) {
    return <Skeleton className="h-96" />
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activité de sécurité du coffre</CardTitle>
        <CardDescription>Tentatives de code PIN, verrouillages et transactions signalées comme suspectes.</CardDescription>
      </CardHeader>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Détail</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {events.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} className="text-center text-muted-foreground">
                Aucun événement de sécurité enregistré.
              </TableCell>
            </TableRow>
          ) : (
            events.map((event) => (
              <TableRow key={event.id}>
                <TableCell className="text-muted-foreground">
                  {format(new Date(event.created_at), 'd MMM y, HH:mm', { locale: fr })}
                </TableCell>
                <TableCell>
                  <Badge variant={TYPE_BADGE_VARIANTS[event.type]}>{TYPE_LABELS[event.type] ?? event.type}</Badge>
                </TableCell>
                <TableCell>{detailFor(event)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </Card>
  )
}

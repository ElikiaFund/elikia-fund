import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { BellIcon, CheckIcon } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { adminService, type AdminAlert } from '@/services/adminService'

const POLL_MS = 60_000

/**
 * Header bell for things staff must act on (withdrawals Yabeto couldn't confirm, Connect refunds
 * blocked by Elikia's balance). The same alerts are e-mailed to the support address; this is the
 * shared to-do list — acknowledging one clears it for every admin.
 */
export function AlertsBell() {
  const [alerts, setAlerts] = useState<AdminAlert[]>([])

  const load = useCallback(() => {
    adminService
      .listAlerts()
      .then(setAlerts)
      .catch(() => {})
  }, [])

  useEffect(() => {
    load()
    const id = window.setInterval(load, POLL_MS)
    return () => window.clearInterval(id)
  }, [load])

  const open = alerts.filter((alert) => !alert.acknowledged_at)

  async function acknowledge(alert: AdminAlert) {
    try {
      const updated = await adminService.acknowledgeAlert(alert.id)
      setAlerts((list) => list.map((a) => (a.id === updated.id ? updated : a)))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Une erreur est survenue.')
    }
  }

  async function acknowledgeAll() {
    try {
      await adminService.acknowledgeAllAlerts()
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Une erreur est survenue.')
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative ml-auto" aria-label={`Alertes (${open.length} à traiter)`}>
          <BellIcon />
          {open.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-white">
              {open.length > 9 ? '9+' : open.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <span className="text-sm font-medium">Alertes</span>
          {open.length > 0 && (
            <Button variant="ghost" size="sm" onClick={acknowledgeAll}>
              Tout marquer comme traité
            </Button>
          )}
        </div>

        {open.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">Aucune alerte à traiter.</p>
        ) : (
          <ul className="max-h-96 divide-y overflow-y-auto">
            {open.map((alert) => (
              <li key={alert.id} className="flex flex-col gap-1 px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-medium">{alert.title}</span>
                  <Button variant="ghost" size="icon" className="size-7 shrink-0" onClick={() => acknowledge(alert)} title="Marquer comme traité">
                    <CheckIcon />
                    <span className="sr-only">Marquer comme traité</span>
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">{alert.body}</p>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{formatDistanceToNow(new Date(alert.created_at), { addSuffix: true, locale: fr })}</span>
                  {alert.type === 'withdrawal_needs_review' && (
                    <Link to="/finances" className="font-medium text-primary hover:underline">
                      Régler dans Finances
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  )
}

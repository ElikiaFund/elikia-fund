import { format, formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { CopyIcon, Loader2Icon, LinkIcon, RefreshCwIcon, ServerIcon } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ApiError } from '@/services/apiService'
import {
  adminService,
  type CompanyConnect,
  type CompanyConnectAuditEntry,
  type YabetoVerificationStatus,
} from '@/services/adminService'

const VERIFICATION_LABELS: Record<YabetoVerificationStatus, string> = {
  created: 'Commencée',
  documents_submitted: 'Documents envoyés',
  in_review: 'En cours d’examen',
  approved: 'Approuvée',
  rejected: 'Refusée',
  needs_info: 'Informations demandées',
}

const ACTION_LABELS: Record<string, string> = {
  provision: 'Création du compte',
  onboarding_link: 'Lien de vérification',
  compliance_refresh: 'Actualisation du statut',
}

const SOURCE_LABELS: Record<string, string> = {
  admin: 'Back-office',
  mobile: 'Application',
  schedule: 'Automatique',
  signup: 'Inscription',
}

type Action = 'provision' | 'link' | 'refresh'

function errorMessage(e: unknown): string {
  // The permission middleware answers in English; every other refusal already carries French copy.
  if (e instanceof ApiError && e.status === 403) {
    return 'Action réservée aux rôles autorisés à gérer Yabeto Connect.'
  }
  return e instanceof Error ? e.message : 'Une erreur est survenue.'
}

function statusBadge(connect: CompanyConnect) {
  if (connect.is_connect_ready) {
    return <Badge>Vérifiée — argent ouvert</Badge>
  }
  if (!connect.yabeto_connect_required) {
    return <Badge variant="secondary">Parcours historique</Badge>
  }
  if (!connect.yabeto_account_id) {
    return <Badge variant="destructive">Compte non créé</Badge>
  }
  if (connect.yabeto_verification_status === 'rejected') {
    return <Badge variant="destructive">Vérification refusée</Badge>
  }
  return <Badge variant="outline">En attente de vérification — argent bloqué</Badge>
}

export function YabetoConnectCard({ companyId }: { companyId: number }) {
  const [connect, setConnect] = useState<CompanyConnect | null>(null)
  const [auditLog, setAuditLog] = useState<CompanyConnectAuditEntry[] | null>(null)
  const [auditLogError, setAuditLogError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [pendingAction, setPendingAction] = useState<Action | null>(null)

  const loadAuditLog = useCallback(() => {
    adminService
      .getCompanyConnectAuditLog(companyId)
      .then((entries) => {
        setAuditLog(entries)
        setAuditLogError(null)
      })
      .catch((e) => setAuditLogError(errorMessage(e)))
  }, [companyId])

  useEffect(() => {
    adminService
      .getCompanyConnect(companyId)
      .then(setConnect)
      .catch((e) => toast.error(errorMessage(e)))
      .finally(() => setIsLoading(false))
    loadAuditLog()
  }, [companyId, loadAuditLog])

  async function run(action: Action) {
    setPendingAction(action)

    try {
      const updated =
        action === 'provision'
          ? await adminService.provisionCompanyConnect(companyId)
          : action === 'link'
            ? await adminService.issueCompanyConnectOnboardingLink(companyId)
            : await adminService.refreshCompanyConnectCompliance(companyId)
      setConnect(updated)
      toast.success(
        action === 'provision'
          ? 'Compte Yabeto Connect créé.'
          : action === 'link'
            ? 'Nouveau lien de vérification généré.'
            : 'Statut actualisé auprès de Yabeto.',
      )
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setPendingAction(null)
      loadAuditLog()
    }
  }

  async function copyLink(url: string) {
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Lien copié.')
    } catch {
      toast.error('Impossible de copier le lien.')
    }
  }

  if (isLoading) {
    return <Skeleton className="h-48 lg:col-span-2" />
  }

  if (!connect) {
    return null
  }

  const allowedOperations = connect.yabeto_capabilities?.allowed_operations ?? []
  const linkExpired = connect.yabeto_onboarding_expires_at ? new Date(connect.yabeto_onboarding_expires_at) < new Date() : false
  // Provisioning a legacy company would move it onto Connect (and lock its money until KYC) —
  // an owner-level migration decision, so it's only offered to Connect signups that failed it.
  const canProvision = connect.yabeto_connect_required && !connect.yabeto_account_id
  const hasAccount = connect.yabeto_account_id !== null

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>Yabeto Connect</CardTitle>
          {statusBadge(connect)}
        </div>
        <CardDescription>
          {connect.yabeto_connect_required || hasAccount
            ? 'Compte de paiement propre à l’entreprise. Ses dépôts, retraits et tontines restent bloqués tant que Yabeto n’a pas vérifié son identité.'
            : 'Entreprise inscrite avant Yabeto Connect : son argent passe par le compte Elikia Fund, sans vérification d’identité requise.'}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-6">
        {(connect.yabeto_connect_required || hasAccount) && (
          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            <div className="flex flex-col gap-0.5">
              <dt className="text-muted-foreground">Compte Yabeto</dt>
              <dd className="font-mono">{connect.yabeto_account_id ?? '—'}</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-muted-foreground">Vérification d’identité</dt>
              <dd>{connect.yabeto_verification_status ? VERIFICATION_LABELS[connect.yabeto_verification_status] : 'Pas commencée'}</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-muted-foreground">Opérations autorisées</dt>
              <dd>{allowedOperations.length > 0 ? allowedOperations.join(', ') : 'Aucune'}</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-muted-foreground">Statut vérifié auprès de Yabeto</dt>
              <dd>
                {connect.yabeto_compliance_checked_at
                  ? formatDistanceToNow(new Date(connect.yabeto_compliance_checked_at), { addSuffix: true, locale: fr })
                  : 'Jamais'}
              </dd>
            </div>
            {connect.yabeto_onboarding_url && (
              <div className="flex flex-col gap-0.5 sm:col-span-2">
                <dt className="text-muted-foreground">
                  Lien de vérification
                  {connect.yabeto_onboarding_expires_at &&
                    (linkExpired
                      ? ' (expiré)'
                      : ` (expire le ${format(new Date(connect.yabeto_onboarding_expires_at), "d MMMM 'à' HH:mm", { locale: fr })})`)}
                </dt>
                <dd className="flex items-center gap-2">
                  <span className="truncate font-mono text-xs">{connect.yabeto_onboarding_url}</span>
                  <Button variant="ghost" size="icon" className="size-7 shrink-0" onClick={() => copyLink(connect.yabeto_onboarding_url!)}>
                    <CopyIcon />
                    <span className="sr-only">Copier le lien</span>
                  </Button>
                </dd>
              </div>
            )}
          </dl>
        )}

        {(canProvision || hasAccount) && (
          <div className="flex flex-wrap gap-2">
            {canProvision && (
              <Button onClick={() => run('provision')} disabled={pendingAction !== null}>
                {pendingAction === 'provision' ? <Loader2Icon className="animate-spin" /> : <ServerIcon />}
                Créer le compte Yabeto
              </Button>
            )}
            {hasAccount && !connect.is_connect_ready && (
              <Button variant="outline" onClick={() => run('link')} disabled={pendingAction !== null}>
                {pendingAction === 'link' ? <Loader2Icon className="animate-spin" /> : <LinkIcon />}
                Générer un lien de vérification
              </Button>
            )}
            {hasAccount && (
              <Button variant="outline" onClick={() => run('refresh')} disabled={pendingAction !== null}>
                {pendingAction === 'refresh' ? <Loader2Icon className="animate-spin" /> : <RefreshCwIcon />}
                Actualiser le statut
              </Button>
            )}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium">Historique</h3>
          {auditLogError ? (
            <p className="text-sm text-muted-foreground">{auditLogError}</p>
          ) : auditLog === null ? (
            <Skeleton className="h-20" />
          ) : auditLog.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune opération Yabeto Connect pour cette entreprise.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Opération</TableHead>
                  <TableHead>Origine</TableHead>
                  <TableHead>Résultat</TableHead>
                  <TableHead>Détail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditLog.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="whitespace-nowrap">{format(new Date(entry.created_at), 'd MMM y, HH:mm', { locale: fr })}</TableCell>
                    <TableCell>{ACTION_LABELS[entry.action] ?? entry.action}</TableCell>
                    <TableCell>
                      {SOURCE_LABELS[entry.source] ?? entry.source}
                      {entry.actor && <span className="block text-xs text-muted-foreground">{entry.actor.name}</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant={entry.result === 'success' ? 'secondary' : 'destructive'}>
                        {entry.result === 'success' ? 'Réussi' : 'Échec'}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground" title={entry.reason ?? undefined}>
                      {entry.reason ?? '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

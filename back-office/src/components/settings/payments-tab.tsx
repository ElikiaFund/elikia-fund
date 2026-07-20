import { CheckIcon, CopyIcon, PlugZapIcon } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { adminService, type YabetoSettings } from '@/services/adminService'

export function PaymentsTab() {
  const [isLoading, setIsLoading] = useState(true)
  const [settings, setSettings] = useState<YabetoSettings | null>(null)
  const [mode, setMode] = useState<'sandbox' | 'live'>('sandbox')
  const [accountId, setAccountId] = useState('')
  const [secretKey, setSecretKey] = useState('')
  const [webhookSecret, setWebhookSecret] = useState('')
  const [isEnabled, setIsEnabled] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [isRegisteringWebhook, setIsRegisteringWebhook] = useState(false)
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null)

  useEffect(() => {
    fetchSettings()
  }, [])

  function fetchSettings() {
    setIsLoading(true)
    adminService
      .getYabetoSettings()
      .then((data) => {
        setSettings(data)
        setMode(data.mode)
        setAccountId(data.account_id ?? '')
        setIsEnabled(data.is_enabled)
      })
      .finally(() => setIsLoading(false))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setIsSaving(true)

    try {
      const updated = await adminService.updateYabetoSettings({
        mode,
        account_id: accountId || null,
        ...(secretKey ? { secret_key: secretKey } : {}),
        ...(webhookSecret ? { webhook_secret: webhookSecret } : {}),
        is_enabled: isEnabled,
      })
      setSettings(updated)
      setSecretKey('')
      setWebhookSecret('')
      toast.success('Configuration Yabeto Pay enregistrée.')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Une erreur est survenue.')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleTestConnection() {
    setIsTesting(true)

    try {
      const result = await adminService.testYabetoConnection()
      toast.success(result.message)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Échec de connexion.')
    } finally {
      setIsTesting(false)
    }
  }

  async function handleRegisterWebhook() {
    setIsRegisteringWebhook(true)

    try {
      const result = await adminService.registerYabetoWebhook()
      if (result.secret) {
        setRevealedSecret(result.secret)
      }
      fetchSettings()
      toast.success('Webhook enregistré auprès de Yabeto Pay.')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Échec de l'enregistrement du webhook.")
    } finally {
      setIsRegisteringWebhook(false)
    }
  }

  function copyWebhookUrl() {
    if (!settings) return
    navigator.clipboard.writeText(settings.webhook_url)
    toast.success('URL copiée.')
  }

  if (isLoading || !settings) {
    return <Skeleton className="h-96" />
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div>
              <CardTitle>Yabeto Pay</CardTitle>
              <CardDescription>
                Fournisseur mobile money (MTN MoMo, Airtel Money) pour les dépôts/retraits du coffre et les cotisations de tontine. Voir{' '}
                <code className="text-xs">yabeto.md</code> à la racine du dépôt pour la référence complète.
              </CardDescription>
            </div>
            <Badge variant={settings.is_enabled ? 'default' : 'outline'}>{settings.is_enabled ? 'Actif' : 'Inactif'}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Activer Yabeto Pay</p>
                <p className="text-sm text-muted-foreground">
                  Tant que désactivé, les dépôts/retraits/cotisations restent simulés (aucun appel réseau réel).
                </p>
              </div>
              <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="yabeto-mode">Environnement</Label>
                <Select value={mode} onValueChange={(value) => setMode(value as 'sandbox' | 'live')}>
                  <SelectTrigger id="yabeto-mode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sandbox">Sandbox (test)</SelectItem>
                    <SelectItem value="live">Live (production)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="yabeto-account">Identifiant de compte (account ID)</Label>
                <Input id="yabeto-account" value={accountId} onChange={(event) => setAccountId(event.target.value)} placeholder="acct_..." />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="yabeto-secret">Clé secrète</Label>
                <Input
                  id="yabeto-secret"
                  type="password"
                  value={secretKey}
                  onChange={(event) => setSecretKey(event.target.value)}
                  placeholder={settings.has_secret_key ? '•••••••••••• (configurée)' : 'sk_test_...'}
                />
                <p className="text-xs text-muted-foreground">Laissez vide pour conserver la clé actuellement enregistrée.</p>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="yabeto-webhook-secret">Secret webhook</Label>
                <Input
                  id="yabeto-webhook-secret"
                  type="password"
                  value={webhookSecret}
                  onChange={(event) => setWebhookSecret(event.target.value)}
                  placeholder={settings.has_webhook_secret ? '•••••••••••• (configuré)' : 'whsec_...'}
                />
                <p className="text-xs text-muted-foreground">Rempli automatiquement par "Enregistrer le webhook" ci-dessous.</p>
              </div>
            </div>

            <Button type="submit" className="w-fit" disabled={isSaving}>
              {isSaving ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Webhook</CardTitle>
          <CardDescription>Yabeto Pay confirme les paiements et décaissements via un webhook — c'est le mécanisme de confirmation, pas du polling.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded-md bg-muted px-3 py-2 text-sm">{settings.webhook_url}</code>
            <Button type="button" variant="outline" size="icon" onClick={copyWebhookUrl}>
              <CopyIcon />
            </Button>
          </div>

          {revealedSecret && (
            <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-3">
              <p className="text-sm font-medium">Secret webhook (affiché une seule fois)</p>
              <code className="mt-1 block truncate text-sm">{revealedSecret}</code>
              <p className="mt-1 text-xs text-muted-foreground">Yabeto Pay ne renverra plus cette valeur — elle est déjà enregistrée automatiquement.</p>
            </div>
          )}

          <p className="text-sm text-muted-foreground">
            {settings.has_webhook_secret ? 'Un secret webhook est déjà enregistré.' : 'Aucun secret webhook enregistré — les paiements resteront en attente jusqu\'à confirmation.'}
          </p>
        </CardContent>
        <CardFooter className="gap-2">
          <Button type="button" variant="outline" onClick={handleTestConnection} disabled={isTesting}>
            <PlugZapIcon />
            {isTesting ? 'Test en cours…' : 'Tester la connexion'}
          </Button>
          <Button type="button" variant="outline" onClick={handleRegisterWebhook} disabled={isRegisteringWebhook}>
            <CheckIcon />
            {isRegisteringWebhook ? 'Enregistrement…' : 'Enregistrer le webhook'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

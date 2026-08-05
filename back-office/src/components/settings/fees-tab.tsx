import { useEffect, useState, type FormEvent } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { adminService, type AdminSettings } from '@/services/adminService'

type FeeForm = AdminSettings['fees']

const DEFAULT_FEES: FeeForm = {
  contribution_yabeto_percent: 3.5,
  contribution_elikia_percent: 1,
  deposit_yabeto_percent: 3.5,
  deposit_elikia_percent: 0.5,
  deposit_yabeto_fixed: 25,
  deposit_elikia_fixed: 75,
  withdrawal_yabeto_percent: 2,
  withdrawal_elikia_percent: 0.5,
}

function FeeField({
  label,
  value,
  onChange,
  suffix,
}: {
  label: string
  value: number
  onChange: (value: number) => void
  suffix: string
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <Input type="number" min={0} step="0.1" value={value} onChange={(event) => onChange(Number(event.target.value))} className="w-28" />
        <span className="text-sm text-muted-foreground">{suffix}</span>
      </div>
    </div>
  )
}

export function FeesTab() {
  const [isLoading, setIsLoading] = useState(true)
  const [fees, setFees] = useState<FeeForm>(DEFAULT_FEES)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setIsLoading(true)
    adminService
      .getSettings()
      .then((settings) => setFees(settings.fees))
      .finally(() => setIsLoading(false))
  }, [])

  function updateField(key: keyof FeeForm, value: number) {
    setFees((current) => ({ ...current, [key]: value }))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setIsSaving(true)

    try {
      const updated = await adminService.updateSettings({ fees })
      setFees(updated.fees)
      toast.success('Frais enregistrés.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Une erreur est survenue.')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return <Skeleton className="h-96" />
  }

  const contributionTotal = fees.contribution_yabeto_percent + fees.contribution_elikia_percent
  const depositPercentTotal = fees.deposit_yabeto_percent + fees.deposit_elikia_percent
  const depositFixedTotal = fees.deposit_yabeto_fixed + fees.deposit_elikia_fixed
  const withdrawalTotal = fees.withdrawal_yabeto_percent + fees.withdrawal_elikia_percent

  return (
    <Card>
      <CardHeader>
        <CardTitle>Frais</CardTitle>
        <CardDescription>
          Frais retenus sur chaque cotisation de tontine, dépôt et retrait de coffre — répartis entre le coût réel de Yabeto Pay et la marge
          d'Elikia Fund. Les deux parts sont indépendantes : modifier l'une ne change pas l'autre.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-medium">Cotisation tontine</h3>
            <div className="flex flex-wrap items-end gap-4">
              <FeeField
                label="Yabeto"
                value={fees.contribution_yabeto_percent}
                onChange={(value) => updateField('contribution_yabeto_percent', value)}
                suffix="%"
              />
              <FeeField
                label="Elikia Fund"
                value={fees.contribution_elikia_percent}
                onChange={(value) => updateField('contribution_elikia_percent', value)}
                suffix="%"
              />
              <p className="pb-2 text-sm text-muted-foreground">Total : {contributionTotal.toFixed(1)}%</p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-medium">Dépôt coffre</h3>
            <div className="flex flex-wrap items-end gap-4">
              <FeeField label="Yabeto" value={fees.deposit_yabeto_percent} onChange={(value) => updateField('deposit_yabeto_percent', value)} suffix="%" />
              <FeeField
                label="Elikia Fund"
                value={fees.deposit_elikia_percent}
                onChange={(value) => updateField('deposit_elikia_percent', value)}
                suffix="%"
              />
              <p className="pb-2 text-sm text-muted-foreground">Total : {depositPercentTotal.toFixed(1)}%</p>
            </div>
            <div className="flex flex-wrap items-end gap-4">
              <FeeField
                label="Yabeto (fixe)"
                value={fees.deposit_yabeto_fixed}
                onChange={(value) => updateField('deposit_yabeto_fixed', value)}
                suffix="FCFA"
              />
              <FeeField
                label="Elikia Fund (fixe)"
                value={fees.deposit_elikia_fixed}
                onChange={(value) => updateField('deposit_elikia_fixed', value)}
                suffix="FCFA"
              />
              <p className="pb-2 text-sm text-muted-foreground">Total : {depositFixedTotal.toFixed(0)} FCFA</p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-medium">Retrait coffre</h3>
            <div className="flex flex-wrap items-end gap-4">
              <FeeField
                label="Yabeto"
                value={fees.withdrawal_yabeto_percent}
                onChange={(value) => updateField('withdrawal_yabeto_percent', value)}
                suffix="%"
              />
              <FeeField
                label="Elikia Fund"
                value={fees.withdrawal_elikia_percent}
                onChange={(value) => updateField('withdrawal_elikia_percent', value)}
                suffix="%"
              />
              <p className="pb-2 text-sm text-muted-foreground">Total : {withdrawalTotal.toFixed(1)}%</p>
            </div>
            <p className="text-xs text-muted-foreground">Aucun frais fixe sur les retraits.</p>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" className="w-fit" disabled={isSaving}>
            {isSaving ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

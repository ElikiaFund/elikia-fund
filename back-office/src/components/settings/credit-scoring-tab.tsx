import { PencilIcon } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { toast } from 'sonner'

import { CriterionFormDialog } from '@/components/settings/criterion-form-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { adminService, type AdminScoringCriterion } from '@/services/adminService'

function CriterionCard({ criterion, onEdit }: { criterion: AdminScoringCriterion; onEdit: () => void }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle>{criterion.label}</CardTitle>
            {criterion.description && <CardDescription>{criterion.description}</CardDescription>}
          </div>
          <Badge variant={criterion.is_active ? 'default' : 'outline'}>{criterion.is_active ? 'Actif' : 'Inactif'}</Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">Poids : {criterion.weight}</p>
        <div className="flex flex-wrap gap-1">
          {criterion.thresholds.map((band, i) => (
            <Badge key={i} variant="outline" className="font-normal">
              {band.min}–{band.max ?? '∞'} → {band.points}pts
            </Badge>
          ))}
        </div>
      </CardContent>
      <CardFooter>
        <Button variant="outline" size="sm" onClick={onEdit}>
          <PencilIcon />
          Modifier
        </Button>
      </CardFooter>
    </Card>
  )
}

export function CreditScoringTab() {
  const [isLoading, setIsLoading] = useState(true)
  const [criteria, setCriteria] = useState<AdminScoringCriterion[]>([])
  const [minEligible, setMinEligible] = useState(70)
  const [minReview, setMinReview] = useState(40)
  const [thresholdError, setThresholdError] = useState<string | null>(null)
  const [isSavingThresholds, setIsSavingThresholds] = useState(false)
  const [editing, setEditing] = useState<AdminScoringCriterion | null>(null)

  useEffect(() => {
    fetchAll()
  }, [])

  function fetchAll() {
    setIsLoading(true)
    Promise.all([adminService.getSettings(), adminService.listScoringCriteria()])
      .then(([settings, criteriaData]) => {
        setMinEligible(settings.credit_scoring.min_score_eligible)
        setMinReview(settings.credit_scoring.min_score_review)
        setCriteria(criteriaData)
      })
      .finally(() => setIsLoading(false))
  }

  async function handleThresholdsSubmit(event: FormEvent) {
    event.preventDefault()
    setThresholdError(null)
    setIsSavingThresholds(true)

    try {
      await adminService.updateSettings({ credit_scoring: { min_score_eligible: minEligible, min_score_review: minReview } })
      toast.success('Seuils de notation enregistrés.')
    } catch (e) {
      setThresholdError(e instanceof Error ? e.message : 'Une erreur est survenue.')
    } finally {
      setIsSavingThresholds(false)
    }
  }

  if (isLoading) {
    return <Skeleton className="h-96" />
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Seuils d'admissibilité</CardTitle>
          <CardDescription>Détermine le verdict (Éligible / À examiner / Non éligible) à partir du score calculé (0–100).</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleThresholdsSubmit} className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex flex-col gap-2">
              <Label htmlFor="min-review">Score minimum "À examiner"</Label>
              <Input id="min-review" type="number" min={0} max={100} value={minReview} onChange={(event) => setMinReview(Number(event.target.value))} className="w-40" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="min-eligible">Score minimum "Éligible"</Label>
              <Input id="min-eligible" type="number" min={0} max={100} value={minEligible} onChange={(event) => setMinEligible(Number(event.target.value))} className="w-40" />
            </div>
            <Button type="submit" disabled={isSavingThresholds}>
              {isSavingThresholds ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </form>
          {thresholdError && <p className="mt-2 text-sm text-destructive">{thresholdError}</p>}
        </CardContent>
      </Card>

      <div>
        <h3 className="mb-2 text-sm font-medium text-muted-foreground">Critères de notation</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {criteria.map((criterion) => (
            <CriterionCard key={criterion.id} criterion={criterion} onEdit={() => setEditing(criterion)} />
          ))}
        </div>
      </div>

      <CriterionFormDialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        criterion={editing}
        onSubmit={async (data) => {
          if (!editing) return
          const updated = await adminService.updateScoringCriterion(editing.id, data)
          setCriteria((current) => current.map((c) => (c.id === updated.id ? updated : c)))
          toast.success('Critère mis à jour.')
        }}
      />
    </div>
  )
}

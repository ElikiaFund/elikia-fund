import { PlusIcon, TrashIcon } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import type { AdminScoringCriterion, ScoringThresholdBand } from '@/services/adminService'

type CriterionFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  criterion: AdminScoringCriterion | null
  onSubmit: (data: { weight: number; is_active: boolean; thresholds: ScoringThresholdBand[] }) => Promise<void>
}

export function CriterionFormDialog({ open, onOpenChange, criterion, onSubmit }: CriterionFormDialogProps) {
  const [weight, setWeight] = useState(0)
  const [isActive, setIsActive] = useState(true)
  const [bands, setBands] = useState<ScoringThresholdBand[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (open && criterion) {
      setWeight(criterion.weight)
      setIsActive(criterion.is_active)
      setBands(criterion.thresholds)
      setError(null)
    }
  }, [open, criterion])

  function updateBand(index: number, patch: Partial<ScoringThresholdBand>) {
    setBands((current) => current.map((band, i) => (i === index ? { ...band, ...patch } : band)))
  }

  function addBand() {
    const last = bands[bands.length - 1]
    setBands((current) => [...current, { min: last ? (last.max ?? last.min) : 0, max: null, points: 100 }])
  }

  function removeBand(index: number) {
    setBands((current) => current.filter((_, i) => i !== index))
  }

  async function handleSubmit() {
    setError(null)
    setIsSubmitting(true)

    try {
      await onSubmit({ weight, is_active: isActive, thresholds: bands })
      onOpenChange(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Une erreur est survenue. Veuillez réessayer.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!criterion) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{criterion.label}</DialogTitle>
          {criterion.description && <DialogDescription>{criterion.description}</DialogDescription>}
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="criterion-active">Critère actif</Label>
            <Switch id="criterion-active" checked={isActive} onCheckedChange={setIsActive} />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="criterion-weight">Poids (0–100)</Label>
            <Input
              id="criterion-weight"
              type="number"
              min={0}
              max={100}
              value={weight}
              onChange={(event) => setWeight(Number(event.target.value))}
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label>Tranches de notation</Label>
              <Button variant="outline" size="sm" onClick={addBand}>
                <PlusIcon />
                Ajouter une tranche
              </Button>
            </div>
            <div className="flex flex-col gap-2">
              {bands.map((band, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    type="number"
                    aria-label="Minimum"
                    value={band.min}
                    onChange={(event) => updateBand(index, { min: Number(event.target.value) })}
                    className="w-20"
                  />
                  <span className="text-sm text-muted-foreground">à</span>
                  <Input
                    type="number"
                    aria-label="Maximum"
                    placeholder="∞"
                    value={band.max ?? ''}
                    onChange={(event) => updateBand(index, { max: event.target.value === '' ? null : Number(event.target.value) })}
                    className="w-20"
                  />
                  <span className="text-sm text-muted-foreground">→</span>
                  <Input
                    type="number"
                    aria-label="Points"
                    min={0}
                    max={100}
                    value={band.points}
                    onChange={(event) => updateBand(index, { points: Number(event.target.value) })}
                    className="w-20"
                  />
                  <span className="text-sm text-muted-foreground">pts</span>
                  <Button variant="ghost" size="icon" className="ml-auto size-8" onClick={() => removeBand(index)} disabled={bands.length <= 1}>
                    <TrashIcon />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import type { AdminPermission, AdminRole } from '@/services/adminService'

type RoleFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  permissions: AdminPermission[]
  role?: AdminRole | null
  onSubmit: (data: { name: string; description?: string; permission_ids: number[] }) => Promise<void>
}

export function RoleFormDialog({ open, onOpenChange, permissions, role, onSubmit }: RoleFormDialogProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setName(role?.name ?? '')
      setDescription(role?.description ?? '')
      setSelected(new Set(role?.permissions.map((p) => p.id) ?? []))
      setError(null)
    }
  }, [open, role])

  const groups = Array.from(new Set(permissions.map((p) => p.group)))

  function toggle(id: number) {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  async function handleSubmit() {
    setError(null)
    setIsSubmitting(true)

    try {
      await onSubmit({ name: name.trim(), description: description.trim() || undefined, permission_ids: Array.from(selected) })
      onOpenChange(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Une erreur est survenue. Veuillez réessayer.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{role ? 'Modifier le rôle' : 'Créer un rôle'}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="role-name">Nom</Label>
            <Input id="role-name" value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="role-description">Description (optionnelle)</Label>
            <Input id="role-description" value={description} onChange={(event) => setDescription(event.target.value)} />
          </div>

          <Separator />

          <div className="flex flex-col gap-4">
            <Label>Permissions</Label>
            {groups.map((group) => (
              <div key={group} className="flex flex-col gap-2">
                <p className="text-sm font-medium text-muted-foreground">{group}</p>
                {permissions
                  .filter((p) => p.group === group)
                  .map((permission) => (
                    <label key={permission.id} className="flex items-center gap-2 text-sm">
                      <Checkbox checked={selected.has(permission.id)} onCheckedChange={() => toggle(permission.id)} />
                      {permission.label}
                    </label>
                  ))}
              </div>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={!name.trim() || isSubmitting}>
            {isSubmitting ? 'Enregistrement…' : role ? 'Enregistrer' : 'Créer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

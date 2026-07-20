import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { AdminRole, AdminUser } from '@/services/adminService'

type PersonnelFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  roles: AdminRole[]
  /** When set, the dialog edits this member (no password field); otherwise it creates a new one. */
  member?: AdminUser | null
  onSubmit: (data: { name: string; email: string; password?: string; role_id: number }) => Promise<void>
}

export function PersonnelFormDialog({ open, onOpenChange, roles, member, onSubmit }: PersonnelFormDialogProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [roleId, setRoleId] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setName(member?.name ?? '')
      setEmail(member?.email ?? '')
      setPassword('')
      setRoleId(member?.role ? String(member.role.id) : '')
      setError(null)
    }
  }, [open, member])

  const canSubmit = name.trim() && email.trim() && roleId && (member || password.length >= 8)

  async function handleSubmit() {
    setError(null)
    setIsSubmitting(true)

    try {
      await onSubmit({ name: name.trim(), email: email.trim(), password: member ? undefined : password, role_id: Number(roleId) })
      onOpenChange(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Une erreur est survenue. Veuillez réessayer.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{member ? 'Modifier le membre' : 'Ajouter un membre du personnel'}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="personnel-name">Nom</Label>
            <Input id="personnel-name" value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="personnel-email">E-mail</Label>
            <Input id="personnel-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </div>
          {!member && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="personnel-password">Mot de passe</Label>
              <Input id="personnel-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
            </div>
          )}
          <div className="flex flex-col gap-2">
            <Label htmlFor="personnel-role">Rôle</Label>
            <Select value={roleId} onValueChange={setRoleId}>
              <SelectTrigger id="personnel-role" className="w-full">
                <SelectValue placeholder="Choisir un rôle" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={String(role.id)}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || isSubmitting}>
            {isSubmitting ? 'Enregistrement…' : member ? 'Enregistrer' : 'Ajouter'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

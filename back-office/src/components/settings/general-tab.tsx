import { useEffect, useState, type FormEvent } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { adminService } from '@/services/adminService'

export function GeneralTab() {
  const [isLoading, setIsLoading] = useState(true)
  const [name, setName] = useState('')
  const [supportEmail, setSupportEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    adminService
      .getSettings()
      .then((settings) => {
        setName(settings.platform.name)
        setSupportEmail(settings.platform.support_email)
      })
      .finally(() => setIsLoading(false))
  }, [])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setIsSaving(true)

    try {
      await adminService.updateSettings({ platform: { name, support_email: supportEmail } })
      toast.success('Paramètres enregistrés.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Une erreur est survenue.')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return <Skeleton className="h-64" />
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Plateforme</CardTitle>
        <CardDescription>Informations générales affichées aux utilisateurs.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="platform-name">Nom de la plateforme</Label>
            <Input id="platform-name" value={name} onChange={(event) => setName(event.target.value)} required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="support-email">E-mail de support</Label>
            <Input id="support-email" type="email" value={supportEmail} onChange={(event) => setSupportEmail(event.target.value)} required />
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

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

  const [phone, setPhone] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [address, setAddress] = useState('')
  const [hours, setHours] = useState('')
  const [contactError, setContactError] = useState<string | null>(null)
  const [isSavingContact, setIsSavingContact] = useState(false)

  useEffect(() => {
    adminService
      .getSettings()
      .then((settings) => {
        setName(settings.platform.name)
        setSupportEmail(settings.platform.support_email)
        setPhone(settings.contact.phone ?? '')
        setWhatsapp(settings.contact.whatsapp ?? '')
        setAddress(settings.contact.address ?? '')
        setHours(settings.contact.hours ?? '')
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

  async function handleSubmitContact(event: FormEvent) {
    event.preventDefault()
    setContactError(null)
    setIsSavingContact(true)

    try {
      await adminService.updateSettings({
        contact: {
          phone: phone || null,
          whatsapp: whatsapp || null,
          address: address || null,
          hours: hours || null,
        },
      })
      toast.success('Coordonnées enregistrées.')
    } catch (e) {
      setContactError(e instanceof Error ? e.message : 'Une erreur est survenue.')
    } finally {
      setIsSavingContact(false)
    }
  }

  if (isLoading) {
    return <Skeleton className="h-64" />
  }

  return (
    <div className="flex flex-col gap-4">
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

      <Card>
        <CardHeader>
          <CardTitle>Contact</CardTitle>
          <CardDescription>
            Coordonnées affichées sur la fiche « Aide et support » de l&apos;application mobile. Laissez un champ vide
            pour qu&apos;il ne soit pas affiché.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmitContact} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="contact-phone">Téléphone</Label>
              <Input id="contact-phone" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+242 06 000 00 00" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="contact-whatsapp">WhatsApp</Label>
              <Input
                id="contact-whatsapp"
                value={whatsapp}
                onChange={(event) => setWhatsapp(event.target.value)}
                placeholder="+242 06 000 00 00"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="contact-address">Adresse</Label>
              <Input id="contact-address" value={address} onChange={(event) => setAddress(event.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="contact-hours">Horaires</Label>
              <Input
                id="contact-hours"
                value={hours}
                onChange={(event) => setHours(event.target.value)}
                placeholder="Lun-Ven, 8h-17h"
              />
            </div>
            {contactError && <p className="text-sm text-destructive">{contactError}</p>}
            <Button type="submit" className="w-fit" disabled={isSavingContact}>
              {isSavingContact ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

import { useRef, useState, type FormEvent } from 'react'
import { toast } from 'sonner'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/context/auth-context'
import { authService } from '@/services/authService'

function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function ProfilePage() {
  const { user, updateUser } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)

  const [name, setName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [infoError, setInfoError] = useState<string | null>(null)
  const [isSavingInfo, setIsSavingInfo] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newPasswordConfirmation, setNewPasswordConfirmation] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [isSavingPassword, setIsSavingPassword] = useState(false)

  if (!user) {
    return null
  }

  async function handleAvatarChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setIsUploadingAvatar(true)

    try {
      updateUser(await authService.uploadAvatar(file))
      toast.success('Avatar mis à jour.')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Une erreur est survenue.')
    } finally {
      setIsUploadingAvatar(false)
      event.target.value = ''
    }
  }

  async function handleInfoSubmit(event: FormEvent) {
    event.preventDefault()
    setInfoError(null)
    setIsSavingInfo(true)

    try {
      updateUser(await authService.updateProfile({ name, email }))
      toast.success('Profil mis à jour.')
    } catch (e) {
      setInfoError(e instanceof Error ? e.message : 'Une erreur est survenue.')
    } finally {
      setIsSavingInfo(false)
    }
  }

  async function handlePasswordSubmit(event: FormEvent) {
    event.preventDefault()
    setPasswordError(null)

    if (!user) {
      return
    }

    if (newPassword !== newPasswordConfirmation) {
      setPasswordError('Les deux mots de passe ne correspondent pas.')
      return
    }

    setIsSavingPassword(true)

    try {
      updateUser(
        await authService.updateProfile({
          name: user.name,
          email: user.email,
          current_password: currentPassword,
          password: newPassword,
          password_confirmation: newPasswordConfirmation,
        }),
      )
      setCurrentPassword('')
      setNewPassword('')
      setNewPasswordConfirmation('')
      toast.success('Mot de passe mis à jour.')
    } catch (e) {
      setPasswordError(e instanceof Error ? e.message : 'Une erreur est survenue.')
    } finally {
      setIsSavingPassword(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Mon profil</CardTitle>
          <CardDescription>Votre avatar et vos informations personnelles.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <Avatar className="size-16">
            {user.avatar_url && <AvatarImage src={user.avatar_url} alt={user.name} />}
            <AvatarFallback className="text-lg">{initials(user.name)}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-2">
            {user.role && <Badge className="w-fit">{user.role.name}</Badge>}
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isUploadingAvatar}>
              {isUploadingAvatar ? 'Envoi…' : "Changer l'avatar"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Informations</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleInfoSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="profile-name">Nom</Label>
              <Input id="profile-name" value={name} onChange={(event) => setName(event.target.value)} required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="profile-email">E-mail</Label>
              <Input id="profile-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </div>
            {infoError && <p className="text-sm text-destructive">{infoError}</p>}
            <Button type="submit" className="w-fit" disabled={isSavingInfo}>
              {isSavingInfo ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mot de passe</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="current-password">Mot de passe actuel</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="new-password">Nouveau mot de passe</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                autoComplete="new-password"
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="new-password-confirmation">Confirmer le nouveau mot de passe</Label>
              <Input
                id="new-password-confirmation"
                type="password"
                value={newPasswordConfirmation}
                onChange={(event) => setNewPasswordConfirmation(event.target.value)}
                autoComplete="new-password"
                required
              />
            </div>
            {passwordError && <p className="text-sm text-destructive">{passwordError}</p>}
            <Button type="submit" className="w-fit" disabled={isSavingPassword}>
              {isSavingPassword ? 'Enregistrement…' : 'Mettre à jour le mot de passe'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

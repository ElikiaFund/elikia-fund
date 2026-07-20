import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCompanyCategory } from '@/lib/company-categories'
import type { AdminUserDetail } from '@/services/adminService'

const currency = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 })

function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

type InformationsTabProps = {
  user: AdminUserDetail
}

export function InformationsTab({ user }: InformationsTabProps) {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Avatar className="size-12">
              {user.avatar_url && <AvatarImage src={user.avatar_url} alt={user.name} />}
              <AvatarFallback>{initials(user.name)}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <CardTitle>{user.name}</CardTitle>
              <CardDescription>{user.email}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {user.role && <Badge>{user.role.name}</Badge>}
          {user.company && (
            <Badge variant="outline">
              {user.company.name} — {formatCompanyCategory(user.company.category, user.company.other_category)}
            </Badge>
          )}
          <Badge variant="outline">Inscrit le {format(new Date(user.created_at), 'd MMM y', { locale: fr })}</Badge>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardDescription>Solde du coffre</CardDescription>
            <CardTitle className="text-2xl">{user.vault ? currency.format(Number(user.vault.balance)) : '—'}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Tontines</CardDescription>
            <CardTitle className="text-2xl">{user.groups.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>
    </div>
  )
}

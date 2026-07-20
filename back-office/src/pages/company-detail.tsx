import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { ArrowLeftIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCompanyCategory } from '@/lib/company-categories'
import { adminService, type AdminCompanyWithOwner } from '@/services/adminService'

function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function CompanyDetailPage() {
  const { id } = useParams()
  const [company, setCompany] = useState<AdminCompanyWithOwner | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setIsLoading(true)
    adminService
      .getCompany(Number(id))
      .then(setCompany)
      .finally(() => setIsLoading(false))
  }, [id])

  return (
    <div className="flex flex-col gap-4">
      <Button variant="ghost" size="sm" className="w-fit" asChild>
        <Link to="/entreprises">
          <ArrowLeftIcon />
          Retour aux entreprises
        </Link>
      </Button>

      {isLoading || !company ? (
        <Skeleton className="h-48" />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{company.name}</CardTitle>
              <CardDescription>
                <Badge variant="outline">{formatCompanyCategory(company.category, company.other_category)}</Badge>
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Créée le {format(new Date(company.created_at), 'd MMMM y', { locale: fr })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Propriétaire</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Avatar className="size-10">
                  {company.user.avatar_url && <AvatarImage src={company.user.avatar_url} alt={company.user.name} />}
                  <AvatarFallback>{initials(company.user.name)}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="font-medium">{company.user.name}</span>
                  <span className="text-sm text-muted-foreground">{company.user.email}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

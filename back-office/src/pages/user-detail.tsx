import { ArrowLeftIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { InformationsTab } from '@/components/user-detail/informations-tab'
import { SecurityTab } from '@/components/user-detail/security-tab'
import { usePageTitle } from '@/hooks/use-page-title'
import { adminService, type AdminUserDetail } from '@/services/adminService'

export function UserDetailPage() {
  const { id } = useParams()
  const [user, setUser] = useState<AdminUserDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  usePageTitle(user ? `${user.name} · Utilisateurs` : 'Utilisateurs')

  useEffect(() => {
    setIsLoading(true)
    adminService
      .getUser(Number(id))
      .then(setUser)
      .finally(() => setIsLoading(false))
  }, [id])

  return (
    <div className="flex flex-col gap-4">
      <Button variant="ghost" size="sm" className="w-fit" asChild>
        <Link to="/utilisateurs">
          <ArrowLeftIcon />
          Retour aux utilisateurs
        </Link>
      </Button>

      {isLoading || !user ? (
        <Skeleton className="h-96" />
      ) : (
        <div className="flex flex-col gap-4">
          <InformationsTab user={user} />
          <SecurityTab userId={user.id} />
        </div>
      )}
    </div>
  )
}

import { format, subDays } from 'date-fns'
import { fr } from 'date-fns/locale'
import { ArrowLeftIcon } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { DateRange } from 'react-day-picker'

import { DateRangeFilter } from '@/components/dashboard/date-range-filter'
import { filterByRange } from '@/components/dashboard/aggregations'
import type { Transaction } from '@/components/dashboard/types'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AnalyticsTab } from '@/components/user-detail/analytics-tab'
import { CashSessionsTab } from '@/components/user-detail/cash-sessions-tab'
import { CreditScoreTab } from '@/components/user-detail/credit-score-tab'
import { ProductsTab } from '@/components/user-detail/products-tab'
import { TransactionsTab } from '@/components/user-detail/transactions-tab'
import { usePageTitle } from '@/hooks/use-page-title'
import { formatCompanyCategory } from '@/lib/company-categories'
import { formatCompanyLocation } from '@/lib/company-locations'
import { adminService, type AdminCompanyDetail } from '@/services/adminService'

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
  const [company, setCompany] = useState<AdminCompanyDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  usePageTitle(company ? `${company.name} · Entreprises` : 'Entreprises')
  const [range, setRange] = useState<DateRange | undefined>({ from: subDays(new Date(), 30), to: new Date() })

  useEffect(() => {
    setIsLoading(true)
    adminService
      .getCompany(Number(id))
      .then(setCompany)
      .finally(() => setIsLoading(false))
  }, [id])

  const transactions: Transaction[] = useMemo(
    () =>
      (company?.transactions ?? []).map((t) => ({
        id: t.id,
        user: company?.name ?? '',
        type: t.type,
        category: t.category,
        amount: Number(t.amount),
        date: new Date(t.occurred_at),
      })),
    [company],
  )

  const filteredTransactions = useMemo(() => filterByRange(transactions, range), [transactions, range])

  return (
    <div className="flex flex-col gap-4">
      <Button variant="ghost" size="sm" className="w-fit" asChild>
        <Link to="/entreprises">
          <ArrowLeftIcon />
          Retour aux entreprises
        </Link>
      </Button>

      {isLoading || !company ? (
        <Skeleton className="h-96" />
      ) : (
        <Tabs defaultValue="informations">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <TabsList>
              <TabsTrigger value="informations">Informations</TabsTrigger>
              <TabsTrigger value="score">Score de crédit</TabsTrigger>
              <TabsTrigger value="transactions">Transactions</TabsTrigger>
              <TabsTrigger value="produits">Produits</TabsTrigger>
              <TabsTrigger value="sessions-caisse">Sessions de caisse</TabsTrigger>
              <TabsTrigger value="analytique">Analytique</TabsTrigger>
            </TabsList>
            <DateRangeFilter value={range} onChange={setRange} />
          </div>

          <TabsContent value="informations">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>{company.name}</CardTitle>
                  <CardDescription>
                    <Badge variant="outline">{formatCompanyCategory(company.category, company.other_category)}</Badge>
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-1 text-sm text-muted-foreground">
                  <span>Localisation : {formatCompanyLocation(company.department, company.city)}</span>
                  {company.neighborhood && <span>Quartier : {company.neighborhood}</span>}
                  {company.address && <span>Adresse : {company.address}</span>}
                  <span>Créée le {format(new Date(company.created_at), 'd MMMM y', { locale: fr })}</span>
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
          </TabsContent>

          <TabsContent value="score">
            <CreditScoreTab companyId={company.id} />
          </TabsContent>

          <TabsContent value="transactions">
            <TransactionsTab transactions={filteredTransactions} />
          </TabsContent>

          <TabsContent value="produits">
            <ProductsTab products={company.products} />
          </TabsContent>

          <TabsContent value="sessions-caisse">
            <CashSessionsTab cashSessions={company.cash_sessions} />
          </TabsContent>

          <TabsContent value="analytique">
            <AnalyticsTab transactions={filteredTransactions} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}

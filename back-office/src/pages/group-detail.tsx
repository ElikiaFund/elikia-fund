import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { ArrowLeftIcon } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'

import { TontinesChart } from '@/components/dashboard/tontines-chart'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { usePageTitle } from '@/hooks/use-page-title'
import { adminService, type AdminGroupDetail } from '@/services/adminService'

const currency = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 })
const FREQUENCY_LABELS: Record<string, string> = { weekly: 'Hebdomadaire', monthly: 'Mensuelle' }

const CONTRIBUTION_STATUS_LABELS: Record<string, string> = {
  succeeded: 'Réussie',
  processing: 'En cours',
  failed: 'Échouée',
  voided: 'Annulée',
}

const CONTRIBUTION_STATUS_VARIANTS: Record<string, 'default' | 'outline' | 'destructive' | 'secondary'> = {
  succeeded: 'default',
  processing: 'outline',
  failed: 'destructive',
  voided: 'destructive',
}

const contributionsChartConfig = {
  total: { label: 'Cotisations', color: 'var(--chart-1)' },
} satisfies ChartConfig

function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function GroupDetailPage() {
  const { id } = useParams()
  const [group, setGroup] = useState<AdminGroupDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  usePageTitle(group ? `${group.name} · Tontines` : 'Tontines')

  useEffect(() => {
    setIsLoading(true)
    adminService
      .getGroup(Number(id))
      .then(setGroup)
      .finally(() => setIsLoading(false))
  }, [id])

  const dailyContributions = useMemo(() => {
    if (!group) return []

    const byDay = new Map<string, number>()
    for (const c of group.contributions) {
      const key = format(new Date(c.paid_at), 'yyyy-MM-dd')
      byDay.set(key, (byDay.get(key) ?? 0) + Number(c.amount))
    }

    return Array.from(byDay.entries())
      .map(([date, total]) => ({ date, total }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [group])

  const memberTotals = useMemo(() => {
    if (!group) return []

    const byMember = new Map<string, number>()
    for (const c of group.contributions) {
      byMember.set(c.user.name, (byMember.get(c.user.name) ?? 0) + Number(c.amount))
    }

    return Array.from(byMember.entries())
      .map(([tontine, total]) => ({ tontine, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)
  }, [group])

  const memberRows = useMemo(() => {
    if (!group) return []

    const active = group.members.map((member) => ({
      member,
      removedAt: null as string | null,
      total: group.contributions.filter((c) => c.user_id === member.id).reduce((sum, c) => sum + Number(c.amount), 0),
    }))

    const removed = group.removed_members.map((member) => ({
      member,
      removedAt: member.pivot.removed_at,
      total: group.contributions.filter((c) => c.user_id === member.id).reduce((sum, c) => sum + Number(c.amount), 0),
    }))

    return [...active, ...removed]
  }, [group])

  return (
    <div className="flex flex-col gap-4">
      <Button variant="ghost" size="sm" className="w-fit" asChild>
        <Link to="/tontines">
          <ArrowLeftIcon />
          Retour aux tontines
        </Link>
      </Button>

      {isLoading || !group ? (
        <Skeleton className="h-96" />
      ) : (
        <Tabs defaultValue="informations">
          <TabsList>
            <TabsTrigger value="informations">Informations </TabsTrigger>
            <TabsTrigger value="membres">Membres</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="analytique">Analytique</TabsTrigger>
          </TabsList>

          <TabsContent value="informations" className="flex flex-col gap-4">
            <Card>
              <CardHeader>
                <CardTitle>{group.name}</CardTitle>
                <CardDescription className="flex flex-wrap gap-2 pt-1">
                  <Badge variant="outline" asChild>
                    <Link to={`/entreprises/${group.company.id}`}>{group.company.name}</Link>
                  </Badge>
                  <Badge variant="outline">{FREQUENCY_LABELS[group.frequency] ?? group.frequency}</Badge>
                  <Badge variant="outline">Cotisation {currency.format(Number(group.contribution_amount))}</Badge>
                  <Badge variant="outline">Code {group.invite_code}</Badge>
                  <Badge variant="outline">Tour n°{group.round_number}</Badge>
                  <Badge variant={group.round_status === 'completed' ? 'default' : 'outline'}>
                    {group.round_status === 'completed' ? 'Tour terminé' : 'Tour en cours'}
                  </Badge>
                </CardDescription>
                {group.recipient_order_updated_at && (
                  <CardDescription className="pt-1 text-xs">
                    Ordre de passage modifié le {new Date(group.recipient_order_updated_at).toLocaleDateString('fr-FR')}
                  </CardDescription>
                )}
              </CardHeader>
            </Card>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardDescription>Membres</CardDescription>
                  <CardTitle className="text-2xl">
                    {group.members_count}
                    <span className="text-lg text-muted-foreground"> / {group.max_members ?? 1000}</span>
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <CardDescription>Total cotisé (brut)</CardDescription>
                  <CardTitle className="text-2xl">{currency.format(Number(group.contributions_sum_amount ?? 0))}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <CardDescription>Propriétaire</CardDescription>
                  <CardContent className="flex items-center gap-2 p-0 pt-2">
                    <Avatar className="size-7">
                      {group.owner.avatar_url && <AvatarImage src={group.owner.avatar_url} alt={group.owner.name} />}
                      <AvatarFallback className="text-xs">{initials(group.owner.name)}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">{group.owner.name}</span>
                  </CardContent>
                </CardHeader>
              </Card>
            </div>

            {group.pending_deletion_request && (
              <Card className="border-destructive/50">
                <CardHeader>
                  <CardTitle className="text-destructive">Demande de suppression en cours</CardTitle>
                  <CardDescription>
                    Proposée par {group.pending_deletion_request.requester.name} · expire le{' '}
                    {format(new Date(group.pending_deletion_request.expires_at), 'd MMM y à HH:mm', { locale: fr })}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  {(() => {
                    const votes = group.pending_deletion_request?.votes ?? []
                    const approved = votes.filter((v) => v.decision === 'approved').length
                    const declined = votes.filter((v) => v.decision === 'declined').length
                    const pending = Math.max(group.members_count - votes.length, 0)

                    return (
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="default">{approved} approuvé(s)</Badge>
                        <Badge variant="destructive">{declined} refusé(s)</Badge>
                        <Badge variant="outline">{pending} sans réponse</Badge>
                      </div>
                    )
                  })()}
                  <p className="text-xs text-muted-foreground">
                    Sans réponse après le délai de 48h, un membre est compté comme ayant approuvé — la suppression n&apos;est
                    bloquée que si une majorité de membres refuse explicitement.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="membres">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Membre</TableHead>
                  <TableHead>Rejoint le</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Total cotisé</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {memberRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      Aucun membre.
                    </TableCell>
                  </TableRow>
                ) : (
                  memberRows.map(({ member, removedAt, total }) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="size-7">
                            {member.avatar_url && <AvatarImage src={member.avatar_url} alt={member.name} />}
                            <AvatarFallback className="text-xs">{initials(member.name)}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{member.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{format(new Date(member.pivot.joined_at), 'd MMM y', { locale: fr })}</TableCell>
                      <TableCell>
                        {removedAt ? (
                          <Badge variant="destructive">Retiré le {format(new Date(removedAt), 'd MMM y', { locale: fr })}</Badge>
                        ) : (
                          <Badge variant="outline">Actif</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{currency.format(total)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="transactions" className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-medium text-muted-foreground">Cotisations</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Membre</TableHead>
                    <TableHead>Cycle</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Payé le</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {group.contributions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        Aucune cotisation.
                      </TableCell>
                    </TableRow>
                  ) : (
                    group.contributions
                      .slice()
                      .sort((a, b) => new Date(b.paid_at).getTime() - new Date(a.paid_at).getTime())
                      .map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium">{c.user.name}</TableCell>
                          <TableCell className="text-muted-foreground">{c.cycle_period}</TableCell>
                          <TableCell>{currency.format(Number(c.amount))}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              <Badge variant={CONTRIBUTION_STATUS_VARIANTS[c.status] ?? 'outline'}>
                                {CONTRIBUTION_STATUS_LABELS[c.status] ?? c.status}
                              </Badge>
                              {c.provider === 'manual' && <Badge variant="secondary">Manuel</Badge>}
                            </div>
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">{format(new Date(c.paid_at), 'd MMM y', { locale: fr })}</TableCell>
                        </TableRow>
                      ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-medium text-muted-foreground">Versements</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bénéficiaire</TableHead>
                    <TableHead>Cycle</TableHead>
                    <TableHead>Tour</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead className="text-right">Versé le</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {group.cycle_recipients.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        Aucun versement.
                      </TableCell>
                    </TableRow>
                  ) : (
                    group.cycle_recipients
                      .slice()
                      .sort((a, b) => new Date(b.paid_out_at).getTime() - new Date(a.paid_out_at).getTime())
                      .map((payout) => (
                        <TableRow key={payout.id}>
                          <TableCell className="font-medium">{payout.user?.name ?? '—'}</TableCell>
                          <TableCell className="text-muted-foreground">{payout.cycle_period}</TableCell>
                          <TableCell className="text-muted-foreground">Tour {payout.round_number}</TableCell>
                          <TableCell>{currency.format(Number(payout.vault_movement?.amount ?? 0))}</TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {format(new Date(payout.paid_out_at), 'd MMM y', { locale: fr })}
                          </TableCell>
                        </TableRow>
                      ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="analytique" className="flex flex-col gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Cotisations dans le temps</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={contributionsChartConfig} className="aspect-auto h-[240px] w-full">
                  <AreaChart data={dailyContributions}>
                    <defs>
                      <linearGradient id="fillContrib" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-total)" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="var(--color-total)" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      minTickGap={32}
                      tickFormatter={(value: string) => format(new Date(value), 'd MMM', { locale: fr })}
                    />
                    <YAxis tickLine={false} axisLine={false} tickMargin={8} width={40} tickFormatter={(value: number) => `${value / 1000}k`} />
                    <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
                    <Area dataKey="total" type="natural" fill="url(#fillContrib)" stroke="var(--color-total)" />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Reuses the tontines chart's shape (`tontine` field repurposed to hold member names) for a ranked bar chart. */}
            <TontinesChart data={memberTotals} title="Cotisations par membre" description="Top 5 membres sur la période" />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}

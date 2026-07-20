import { useEffect, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { adminService, type CreditScore, type CreditScoreVerdict } from '@/services/adminService'

const VERDICT_LABELS: Record<CreditScoreVerdict, string> = {
  eligible: 'Éligible',
  review: 'À examiner',
  not_eligible: 'Non éligible',
}

const VERDICT_CLASSES: Record<CreditScoreVerdict, string> = {
  eligible: 'text-emerald-600 dark:text-emerald-400',
  review: 'text-amber-600 dark:text-amber-400',
  not_eligible: 'text-red-600 dark:text-red-400',
}

type CreditScoreTabProps = {
  userId: number
}

export function CreditScoreTab({ userId }: CreditScoreTabProps) {
  const [score, setScore] = useState<CreditScore | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setIsLoading(true)
    adminService
      .getCreditScore(userId)
      .then(setScore)
      .finally(() => setIsLoading(false))
  }, [userId])

  if (isLoading || !score) {
    return <Skeleton className="h-96" />
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardDescription>Score de crédit</CardDescription>
          <div className="flex items-baseline gap-3">
            <CardTitle className="text-5xl font-semibold tabular-nums">{score.score}</CardTitle>
            <span className="text-muted-foreground">/ 100</span>
            <Badge variant="outline" className={VERDICT_CLASSES[score.verdict]}>
              {VERDICT_LABELS[score.verdict]}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Détail du calcul</CardTitle>
          <CardDescription>Basé sur les critères actifs configurés dans Paramètres → Notation de crédit.</CardDescription>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Critère</TableHead>
              <TableHead>Valeur</TableHead>
              <TableHead>Points</TableHead>
              <TableHead>Poids</TableHead>
              <TableHead className="text-right">Contribution</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {score.breakdown.map((item) => (
              <TableRow key={item.key}>
                <TableCell className="font-medium">{item.label}</TableCell>
                <TableCell className="text-muted-foreground">
                  {item.value.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}
                </TableCell>
                <TableCell className="text-muted-foreground">{item.points}/100</TableCell>
                <TableCell className="text-muted-foreground">{item.weight}</TableCell>
                <TableCell className="text-right">
                  {item.weighted_points.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}

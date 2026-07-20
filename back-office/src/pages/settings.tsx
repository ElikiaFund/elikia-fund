import { CreditScoringTab } from '@/components/settings/credit-scoring-tab'
import { GeneralTab } from '@/components/settings/general-tab'
import { PaymentsTab } from '@/components/settings/payments-tab'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export function SettingsPage() {
  return (
    <Tabs defaultValue="general">
      <TabsList>
        <TabsTrigger value="general">Général</TabsTrigger>
        <TabsTrigger value="credit-scoring">Notation de crédit</TabsTrigger>
        <TabsTrigger value="payments">Paiements</TabsTrigger>
      </TabsList>

      <TabsContent value="general">
        <GeneralTab />
      </TabsContent>

      <TabsContent value="credit-scoring">
        <CreditScoringTab />
      </TabsContent>

      <TabsContent value="payments">
        <PaymentsTab />
      </TabsContent>
    </Tabs>
  )
}

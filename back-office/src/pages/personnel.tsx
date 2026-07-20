import { PersonnelTab } from '@/components/personnel/personnel-tab'
import { RolesTab } from '@/components/personnel/roles-tab'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export function PersonnelPage() {
  return (
    <Tabs defaultValue="personnels">
      <TabsList>
        <TabsTrigger value="personnels">Personnels</TabsTrigger>
        <TabsTrigger value="roles">Rôles & Permissions</TabsTrigger>
      </TabsList>

      <TabsContent value="personnels">
        <PersonnelTab />
      </TabsContent>

      <TabsContent value="roles">
        <RolesTab />
      </TabsContent>
    </Tabs>
  )
}

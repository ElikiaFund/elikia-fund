import { PencilIcon, PlusIcon, TrashIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { ConfirmDeleteDialog } from '@/components/data-table/confirm-delete-dialog'
import { RoleFormDialog } from '@/components/personnel/role-form-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { adminService, type AdminPermission, type AdminRole } from '@/services/adminService'

function RoleCard({ role, permissions, onUpdated, onDeleted }: { role: AdminRole; permissions: AdminPermission[]; onUpdated: (role: AdminRole) => void; onDeleted: (id: number) => void }) {
  const [editOpen, setEditOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  return (
    <Card>
      <CardHeader>
        <CardTitle>{role.name}</CardTitle>
        {role.description && <CardDescription>{role.description}</CardDescription>}
      </CardHeader>
      <CardContent className="flex flex-wrap gap-1">
        {role.permissions.length === 0 ? (
          <span className="text-sm text-muted-foreground">Aucune permission.</span>
        ) : (
          role.permissions.map((p) => (
            <Badge key={p.id} variant="outline">
              {p.label}
            </Badge>
          ))
        )}
      </CardContent>
      <CardFooter className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{role.users_count ?? 0} membre(s)</span>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" className="size-8" onClick={() => setEditOpen(true)}>
            <PencilIcon />
          </Button>
          <Button variant="ghost" size="icon" className="size-8" onClick={() => setConfirmOpen(true)}>
            <TrashIcon />
          </Button>
        </div>
      </CardFooter>

      <RoleFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        permissions={permissions}
        role={role}
        onSubmit={async (data) => {
          const updated = await adminService.updateRole(role.id, { name: data.name, description: data.description, permission_ids: data.permission_ids })
          onUpdated(updated)
          toast.success('Rôle mis à jour.')
        }}
      />

      <ConfirmDeleteDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Supprimer le rôle ${role.name} ?`}
        description="Les membres de ce rôle perdront leur accès au back-office. Cette action est irréversible."
        confirmValue={role.name}
        onConfirm={async () => {
          await adminService.deleteRole(role.id)
          onDeleted(role.id)
          toast.success('Rôle supprimé.')
        }}
      />
    </Card>
  )
}

export function RolesTab() {
  const [roles, setRoles] = useState<AdminRole[]>([])
  const [permissions, setPermissions] = useState<AdminPermission[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)

  useEffect(() => {
    setIsLoading(true)
    Promise.all([adminService.listRoles(), adminService.listPermissions()])
      .then(([rolesData, permissionsData]) => {
        setRoles(rolesData)
        setPermissions(permissionsData)
      })
      .finally(() => setIsLoading(false))
  }, [])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <PlusIcon />
          Créer un rôle
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {roles.map((role) => (
            <RoleCard
              key={role.id}
              role={role}
              permissions={permissions}
              onUpdated={(updated) => setRoles((current) => current.map((r) => (r.id === updated.id ? updated : r)))}
              onDeleted={(id) => setRoles((current) => current.filter((r) => r.id !== id))}
            />
          ))}
        </div>
      )}

      <RoleFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        permissions={permissions}
        onSubmit={async (data) => {
          const created = await adminService.createRole({ name: data.name, description: data.description, permission_ids: data.permission_ids })
          setRoles((current) => [...current, created])
          toast.success('Rôle créé.')
        }}
      />
    </div>
  )
}

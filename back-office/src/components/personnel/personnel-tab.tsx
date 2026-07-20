import type { ColumnDef } from '@tanstack/react-table'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { MoreHorizontalIcon, PencilIcon, PlusIcon, TrashIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { ConfirmDeleteDialog } from '@/components/data-table/confirm-delete-dialog'
import { DataTableColumnHeader } from '@/components/data-table/column-header'
import { DataTable } from '@/components/data-table/data-table'
import { createSelectColumn } from '@/components/data-table/select-column'
import { facetedFilterFn } from '@/components/data-table/types'
import { PersonnelFormDialog } from '@/components/personnel/personnel-form-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { adminService, type AdminRole, type AdminUser } from '@/services/adminService'

function RowActions({
  member,
  roles,
  onEdited,
  onDeleted,
}: {
  member: AdminUser
  roles: AdminRole[]
  onEdited: (member: AdminUser) => void
  onDeleted: (id: number) => void
}) {
  const [editOpen, setEditOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8">
            <MoreHorizontalIcon />
            <span className="sr-only">Ouvrir le menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <PencilIcon />
            Modifier
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={() => setConfirmOpen(true)}>
            <TrashIcon />
            Supprimer
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <PersonnelFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        roles={roles}
        member={member}
        onSubmit={async (data) => {
          const updated = await adminService.updatePersonnel(member.id, { name: data.name, email: data.email, role_id: data.role_id })
          onEdited(updated)
          toast.success('Membre du personnel mis à jour.')
        }}
      />

      <ConfirmDeleteDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Supprimer ${member.name} ?`}
        description="Cette action est irréversible."
        confirmValue={member.name}
        onConfirm={async () => {
          await adminService.deletePersonnel(member.id)
          onDeleted(member.id)
          toast.success('Membre du personnel supprimé.')
        }}
      />
    </>
  )
}

export function PersonnelTab() {
  const [personnel, setPersonnel] = useState<AdminUser[]>([])
  const [roles, setRoles] = useState<AdminRole[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)

  useEffect(() => {
    fetchAll()
  }, [])

  function fetchAll() {
    setIsLoading(true)
    Promise.all([adminService.listPersonnel(), adminService.listRoles()])
      .then(([personnelData, rolesData]) => {
        setPersonnel(personnelData)
        setRoles(rolesData)
      })
      .finally(() => setIsLoading(false))
  }

  const columns: ColumnDef<AdminUser>[] = [
    createSelectColumn<AdminUser>(),
    {
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Nom" />,
      meta: { label: 'Nom' },
    },
    {
      accessorKey: 'email',
      header: ({ column }) => <DataTableColumnHeader column={column} title="E-mail" />,
      meta: { label: 'E-mail' },
    },
    {
      id: 'role',
      accessorFn: (row) => row.role?.name ?? '—',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Rôle" />,
      cell: ({ row }) => <Badge variant="outline">{row.original.role?.name ?? '—'}</Badge>,
      filterFn: facetedFilterFn,
      meta: { label: 'Rôle' },
    },
    {
      accessorKey: 'created_at',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Ajouté le" />,
      cell: ({ row }) => format(new Date(row.original.created_at), 'd MMM y', { locale: fr }),
      meta: { label: 'Ajouté le' },
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <RowActions
          member={row.original}
          roles={roles}
          onEdited={(updated) => setPersonnel((current) => current.map((p) => (p.id === updated.id ? updated : p)))}
          onDeleted={(id) => setPersonnel((current) => current.filter((p) => p.id !== id))}
        />
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <PlusIcon />
          Ajouter un membre
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={personnel}
        isLoading={isLoading}
        searchPlaceholder="Rechercher un membre du personnel…"
        facetedFilters={[{ columnId: 'role', title: 'Rôle', options: roles.map((r) => ({ label: r.name, value: r.name })) }]}
      />

      <PersonnelFormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        roles={roles}
        onSubmit={async (data) => {
          const created = await adminService.createPersonnel({ name: data.name, email: data.email, password: data.password!, role_id: data.role_id })
          setPersonnel((current) => [created, ...current])
          toast.success('Membre du personnel ajouté.')
        }}
      />
    </div>
  )
}

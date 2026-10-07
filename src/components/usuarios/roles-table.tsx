'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/mock/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Plus, Pencil, Trash2, Users, Shield } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { formatDate } from '@/lib/utils'
import type { Role } from '@/lib/types'
import { RoleDialog } from './role-dialog'
import { DeleteRoleDialog } from './delete-role-dialog'

export function RolesTable() {
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [showRoleDialog, setShowRoleDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null)
  const dataClient = createClient()
  const { toast } = useToast()

  useEffect(() => {
    fetchRoles()
  }, [])

  const fetchRoles = async () => {
    setLoading(true)
    const { data, error } = await dataClient
      .from('roles')
      .select('*')
      .order('name')

    if (error) {
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los roles',
        variant: 'destructive',
      })
    } else {
      // Actualizar el contador de usuarios para cada rol
      const rolesWithCount = await Promise.all(
        (data || []).map(async (role) => {
          const { count } = await dataClient
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('role_id', role.id)

          return {
            ...role,
            user_count: count || 0,
          }
        })
      )
      setRoles(rolesWithCount)
    }
    setLoading(false)
  }

  const handleEdit = (role: Role) => {
    setSelectedRole(role)
    setShowRoleDialog(true)
  }

  const handleNew = () => {
    setSelectedRole(null)
    setShowRoleDialog(true)
  }

  const handleDelete = (role: Role) => {
    setRoleToDelete(role)
    setShowDeleteDialog(true)
  }

  const getPermissionCount = (permissions: any): number => {
    if (Array.isArray(permissions)) {
      return permissions.length
    }
    if (typeof permissions === 'object' && permissions !== null) {
      const permObj = permissions as Record<string, boolean>
      return Object.keys(permObj).filter(key => permObj[key] === true).length
    }
    return 0
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex justify-end">
          <Button onClick={handleNew}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Rol
          </Button>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rol</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Permisos</TableHead>
                <TableHead>Usuarios</TableHead>
                <TableHead>Creado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No hay roles configurados
                  </TableCell>
                </TableRow>
              ) : (
                roles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{role.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-md">
                      <p className="text-sm text-muted-foreground truncate">
                        {role.description}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {getPermissionCount(role.permissions)} permisos
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>{role.user_count}</span>
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(role.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleEdit(role)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(role)}
                            className="text-red-600"
                            disabled={role.user_count > 0}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <RoleDialog
        open={showRoleDialog}
        onOpenChange={setShowRoleDialog}
        role={selectedRole}
        onSuccess={fetchRoles}
      />

      <DeleteRoleDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        role={roleToDelete}
        onSuccess={fetchRoles}
      />
    </>
  )
}


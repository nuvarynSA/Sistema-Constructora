'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/mock/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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
import { MoreHorizontal, UserPlus, Pencil, Trash2, UserCheck, UserX, RefreshCw } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { formatDate } from '@/lib/utils'
import type { User } from '@/lib/types'
import { UserDialog } from './user-dialog'
import { DeleteUserDialog } from './delete-user-dialog'
import { SyncUserDialog } from './sync-user-dialog'

export function UsuariosTable() {
  const [usuarios, setUsuarios] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showUserDialog, setShowUserDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [userToDelete, setUserToDelete] = useState<User | null>(null)
  const [showSyncDialog, setShowSyncDialog] = useState(false)
  const [userToSync, setUserToSync] = useState<User | null>(null)
  const dataClient = createClient()
  const { toast } = useToast()

  useEffect(() => {
    fetchUsuarios()
  }, [])

  const fetchUsuarios = async () => {
    setLoading(true)
    const { data, error } = await dataClient
      .from('users')
      .select(`
        *,
        role:roles(*)
      `)
      .order('created_at', { ascending: false })

    if (error) {
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los usuarios',
        variant: 'destructive',
      })
    } else {
      setUsuarios(data || [])
    }
    setLoading(false)
  }

  const handleEdit = (user: User) => {
    setSelectedUser(user)
    setShowUserDialog(true)
  }

  const handleNew = () => {
    setSelectedUser(null)
    setShowUserDialog(true)
  }

  const handleDelete = (user: User) => {
    setUserToDelete(user)
    setShowDeleteDialog(true)
  }

  const handleSync = (user: User) => {
    setUserToSync(user)
    setShowSyncDialog(true)
  }

  const handleToggleStatus = async (user: User) => {
    const newStatus = user.status === 'Activo' ? 'Inactivo' : 'Activo'
    
    const { error } = await dataClient
      .from('users')
      .update({ status: newStatus })
      .eq('id', user.id)

    if (error) {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el estado del usuario',
        variant: 'destructive',
      })
    } else {
      toast({
        title: 'Estado actualizado',
        description: `El usuario ahora está ${newStatus}`,
      })
      fetchUsuarios()
    }
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
            <UserPlus className="mr-2 h-4 w-4" />
            Nuevo Usuario
          </Button>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuario</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Área</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Último Acceso</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usuarios.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No hay usuarios registrados
                  </TableCell>
                </TableRow>
              ) : (
                usuarios.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>{user.avatar}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{user.name}</div>
                          <div className="text-sm text-muted-foreground">{user.phone || 'Sin teléfono'}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {user.role?.name || 'Sin rol'}
                      </Badge>
                    </TableCell>
                    <TableCell>{user.area}</TableCell>
                    <TableCell>{user.position || '-'}</TableCell>
                    <TableCell>
                      <Badge
                        variant={user.status === 'Activo' ? 'default' : 'secondary'}
                      >
                        {user.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.last_login ? formatDate(user.last_login) : 'Nunca'}
                    </TableCell>
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
                          <DropdownMenuItem onClick={() => handleEdit(user)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleStatus(user)}>
                            {user.status === 'Activo' ? (
                              <>
                                <UserX className="mr-2 h-4 w-4" />
                                Desactivar
                              </>
                            ) : (
                              <>
                                <UserCheck className="mr-2 h-4 w-4" />
                                Activar
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleSync(user)}>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Sincronizar con Auth
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(user)}
                            className="text-red-600"
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

      <UserDialog
        open={showUserDialog}
        onOpenChange={setShowUserDialog}
        user={selectedUser}
        onSuccess={fetchUsuarios}
      />

      <DeleteUserDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        user={userToDelete}
        onSuccess={fetchUsuarios}
      />

      <SyncUserDialog
        open={showSyncDialog}
        onOpenChange={setShowSyncDialog}
        user={userToSync}
        onSuccess={fetchUsuarios}
      />
    </>
  )
}


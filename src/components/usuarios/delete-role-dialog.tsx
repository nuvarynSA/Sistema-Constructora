'use client'

import { useState } from 'react'
import { createClient } from '@/lib/mock/client'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/components/ui/use-toast'
import type { Role } from '@/lib/types'

interface DeleteRoleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  role: Role | null
  onSuccess: () => void
}

export function DeleteRoleDialog({ open, onOpenChange, role, onSuccess }: DeleteRoleDialogProps) {
  const [deleting, setDeleting] = useState(false)
  const dataClient = createClient()
  const { toast } = useToast()

  const handleDelete = async () => {
    if (!role) return

    // Verificar que no haya usuarios con este rol
    if (role.user_count && role.user_count > 0) {
      toast({
        title: 'No se puede eliminar',
        description: `Este rol tiene ${role.user_count} usuario(s) asignado(s). Reasigna los usuarios antes de eliminarlo.`,
        variant: 'destructive',
      })
      return
    }

    setDeleting(true)

    try {
      const { error } = await dataClient
        .from('roles')
        .delete()
        .eq('id', role.id)

      if (error) throw error

      toast({
        title: 'Rol eliminado',
        description: 'El rol se eliminó correctamente',
      })

      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo eliminar el rol',
        variant: 'destructive',
      })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción no se puede deshacer. Se eliminará permanentemente el rol{' '}
            <span className="font-semibold">{role?.name}</span> y toda su configuración de permisos.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleting}
            className="bg-red-600 hover:bg-red-700"
          >
            {deleting ? 'Eliminando...' : 'Eliminar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}


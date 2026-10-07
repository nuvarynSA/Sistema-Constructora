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
import type { User } from '@/lib/types'

interface DeleteUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: User | null
  onSuccess: () => void
}

export function DeleteUserDialog({ open, onOpenChange, user, onSuccess }: DeleteUserDialogProps) {
  const [deleting, setDeleting] = useState(false)
  const dataClient = createClient()
  const { toast } = useToast()

  const handleDelete = async () => {
    if (!user) return

    setDeleting(true)

    try {
      console.log('🗑️ Intentando eliminar usuario:', {
        id: user.id,
        email: user.email,
        name: user.name
      })
      
      // Incluir el email como query param para búsqueda alternativa
      const url = `/api/users/${user.id}${user.email ? `?email=${encodeURIComponent(user.email)}` : ''}`
      const response = await fetch(url, {
        method: 'DELETE',
        credentials: 'include',
        cache: 'no-store',
      })

      const result = await response.json()

      if (!response.ok) {
        console.error('❌ Error al eliminar:', result)
        let errorMessage = result.error || 'Error al eliminar usuario'
        
        if (result.details) {
          errorMessage += `: ${result.details}`
        }
        
        if (result.hint) {
          errorMessage += ` ${result.hint}`
        }
        
        // Si es un 404, sugerir recargar la página
        if (response.status === 404) {
          errorMessage += ' Intenta recargar la página para actualizar la lista de usuarios.'
        }
        
        throw new Error(errorMessage)
      }

      toast({
        title: 'Usuario eliminado',
        description: 'El usuario se eliminó correctamente',
      })

      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo eliminar el usuario',
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
            Esta acción no se puede deshacer. Se eliminará permanentemente el usuario{' '}
            <span className="font-semibold">{user?.name}</span> y todos sus datos asociados.
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

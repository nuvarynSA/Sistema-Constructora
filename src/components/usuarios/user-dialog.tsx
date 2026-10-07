'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/mock/client'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import type { User, Role } from '@/lib/types'

interface UserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: User | null
  onSuccess: () => void
}

const AREAS = [
  'Oficina Técnica Civil',
  'Oficina Técnica Eléctrica',
  'Oficina Administración',
  'Oficina Compras',
  'Oficina Telecom',
  'Oficina Logística',
  'Oficina Servicios',
  'Oficina Sistemas',
  'Oficina Higiene y Seguridad',
]

export function UserDialog({ open, onOpenChange, user, onSuccess }: UserDialogProps) {
  const [loading, setLoading] = useState(false)
  const [loadingRoles, setLoadingRoles] = useState(false)
  const [roles, setRoles] = useState<Role[]>([])
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    roleId: '',
    area: '',
    position: '',
    phone: '',
  })

  const dataClient = createClient()
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      fetchRoles()
      if (user) {
        setFormData({
          name: user.name,
          email: user.email,
          password: '',
          roleId: user.role_id,
          area: user.area,
          position: user.position || '',
          phone: user.phone || '',
        })
      } else {
        setFormData({
          name: '',
          email: '',
          password: '',
          roleId: '',
          area: '',
          position: '',
          phone: '',
        })
      }
    }
  }, [open, user]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchRoles = async () => {
    setLoadingRoles(true)
    try {
      console.log('🔍 Fetching roles...')
      const { data, error } = await dataClient
        .from('roles')
        .select('*')
        .order('name')
      
      if (error) {
        console.error('❌ Error fetching roles:', error)
        toast({
          title: 'Error',
          description: `No se pudieron cargar los roles: ${error.message}`,
          variant: 'destructive',
        })
        setRoles([])
      } else {
        console.log('✅ Roles loaded:', data?.length || 0, 'roles')
        setRoles(data || [])
        if (!data || data.length === 0) {
          console.warn('⚠️ No roles found in database')
          toast({
            title: 'Advertencia',
            description: 'No hay roles disponibles. Por favor, crea al menos un rol primero.',
            variant: 'destructive',
          })
        }
      }
    } catch (error) {
      console.error('❌ Unexpected error fetching roles:', error)
      toast({
        title: 'Error',
        description: 'Error inesperado al cargar los roles.',
        variant: 'destructive',
      })
      setRoles([])
    } finally {
      setLoadingRoles(false)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name || !formData.email || !formData.roleId || !formData.area) {
      toast({
        title: 'Campos requeridos',
        description: 'Por favor completa todos los campos obligatorios',
        variant: 'destructive',
      })
      return
    }

    if (!user && !formData.password) {
      toast({
        title: 'Contraseña requerida',
        description: 'La contraseña es obligatoria para usuarios nuevos',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)

    try {
      const userData = {
        name: formData.name,
        email: formData.email,
        role_id: formData.roleId,
        area: formData.area,
        position: formData.position || null,
        phone: formData.phone || null,
        avatar: getInitials(formData.name),
        ...(formData.password && { password: formData.password }),
      }

      if (user) {
        const response = await fetch('/api/users', {
          method: 'PUT',
          credentials: 'include',
          cache: 'no-store',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: user.id,
            name: formData.name,
            email: formData.email,
            roleId: formData.roleId,
            area: formData.area,
            position: formData.position || null,
            phone: formData.phone || null,
            ...(formData.password && { password: formData.password }),
          }),
        })

        let result
        try {
          result = await response.json()
        } catch (jsonError) {
          console.error('Error parsing response:', jsonError)
          throw new Error('Error al procesar la respuesta del servidor')
        }

        if (!response.ok) {
          const errorMessage = result.details 
            ? `${result.error}: ${result.details}`
            : result.error || 'Error al actualizar usuario'
          throw new Error(errorMessage)
        }

        toast({
          title: 'Usuario actualizado',
          description: 'El usuario se actualizó correctamente',
        })
      } else {
        const response = await fetch('/api/users', {
          method: 'POST',
          credentials: 'include',
          cache: 'no-store',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: formData.name,
            email: formData.email,
            password: formData.password,
            roleId: formData.roleId,
            area: formData.area,
            position: formData.position || null,
            phone: formData.phone || null,
          }),
        })

        let result
        try {
          result = await response.json()
        } catch (jsonError) {
          console.error('Error parsing response:', jsonError)
          throw new Error('Error al procesar la respuesta del servidor')
        }

        if (!response.ok) {
          const errorMessage = result.details 
            ? `${result.error}: ${result.details}`
            : result.error || 'Error al crear usuario'
          throw new Error(errorMessage)
        }

        toast({
          title: 'Usuario creado',
          description: result.message || 'El usuario se creó correctamente',
        })
      }

      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Ocurrió un error al guardar el usuario',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{user ? 'Editar Usuario' : 'Nuevo Usuario'}</DialogTitle>
          <DialogDescription>
            {user
              ? 'Modifica la información del usuario'
              : 'Completa el formulario para crear un nuevo usuario'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre Completo *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Juan Pérez"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="juan@empresa.com"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="password">
                Contraseña {!user && '*'}
              </Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder={user ? 'Dejar en blanco para no cambiar' : '********'}
                required={!user}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+54 11 1234-5678"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="role">Rol *</Label>
              <Select
                value={formData.roleId}
                onValueChange={(value) => setFormData({ ...formData, roleId: value })}
                required
                disabled={loadingRoles}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingRoles ? "Cargando roles..." : roles.length === 0 ? "No hay roles disponibles" : "Selecciona un rol"} />
                </SelectTrigger>
                <SelectContent>
                  {loadingRoles ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      Cargando roles...
                    </div>
                  ) : roles.length === 0 ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      No hay roles disponibles
                    </div>
                  ) : (
                    roles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {roles.length === 0 && !loadingRoles && (
                <p className="text-sm text-muted-foreground">
                  Ve a la sección de Roles para crear uno primero.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="area">Área *</Label>
              <Select
                value={formData.area}
                onValueChange={(value) => setFormData({ ...formData, area: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un área" />
                </SelectTrigger>
                <SelectContent>
                  {AREAS.map((area) => (
                    <SelectItem key={area} value={area}>
                      {area}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="position">Cargo</Label>
            <Input
              id="position"
              value={formData.position}
              onChange={(e) => setFormData({ ...formData, position: e.target.value })}
              placeholder="Ej: Jefe de Área, Analista, etc."
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Guardando...' : user ? 'Actualizar' : 'Crear Usuario'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

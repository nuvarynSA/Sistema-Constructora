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
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/components/ui/use-toast'
import type { Role } from '@/lib/types'
import { Checkbox } from '@/components/ui/checkbox'

interface RoleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  role: Role | null
  onSuccess: () => void
}

const AVAILABLE_PERMISSIONS = [
  { id: 'usuarios_ver', label: 'Ver usuarios', category: 'Usuarios' },
  { id: 'usuarios_crear', label: 'Crear usuarios', category: 'Usuarios' },
  { id: 'usuarios_editar', label: 'Editar usuarios', category: 'Usuarios' },
  { id: 'usuarios_eliminar', label: 'Eliminar usuarios', category: 'Usuarios' },
  
  { id: 'roles_ver', label: 'Ver roles', category: 'Roles' },
  { id: 'roles_crear', label: 'Crear roles', category: 'Roles' },
  { id: 'roles_editar', label: 'Editar roles', category: 'Roles' },
  { id: 'roles_eliminar', label: 'Eliminar roles', category: 'Roles' },
  
  { id: 'pedidos_ver', label: 'Ver pedidos', category: 'Pedidos' },
  { id: 'pedidos_crear', label: 'Crear pedidos', category: 'Pedidos' },
  { id: 'pedidos_editar', label: 'Editar pedidos', category: 'Pedidos' },
  { id: 'pedidos_eliminar', label: 'Eliminar pedidos', category: 'Pedidos' },
  { id: 'pedidos_derivar', label: 'Derivar pedidos', category: 'Pedidos' },
  
  { id: 'licitaciones_ver', label: 'Ver licitaciones', category: 'Licitaciones' },
  { id: 'licitaciones_crear', label: 'Crear licitaciones', category: 'Licitaciones' },
  { id: 'licitaciones_editar', label: 'Editar licitaciones', category: 'Licitaciones' },
  { id: 'licitaciones_eliminar', label: 'Eliminar licitaciones', category: 'Licitaciones' },
  { id: 'licitaciones_derivar', label: 'Derivar licitaciones', category: 'Licitaciones' },
  
  { id: 'documentos_ver', label: 'Ver documentos', category: 'Documentos' },
  { id: 'documentos_subir', label: 'Subir documentos', category: 'Documentos' },
  { id: 'documentos_eliminar', label: 'Eliminar documentos', category: 'Documentos' },
  
  { id: 'comentarios_ver', label: 'Ver comentarios', category: 'Comentarios' },
  { id: 'comentarios_crear', label: 'Crear comentarios', category: 'Comentarios' },
  { id: 'comentarios_eliminar', label: 'Eliminar comentarios', category: 'Comentarios' },
]

export function RoleDialog({ open, onOpenChange, role, onSuccess }: RoleDialogProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  })
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([])

  const dataClient = createClient()
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      if (role) {
        setFormData({
          name: role.name,
          description: role.description,
        })
        
        // Convertir permisos a array
        let perms: string[] = []
        if (Array.isArray(role.permissions)) {
          perms = role.permissions
        } else if (role.permissions && typeof role.permissions === 'object') {
          const permObj = role.permissions as Record<string, boolean>
          perms = Object.keys(permObj).filter(key => permObj[key])
        }
        
        setSelectedPermissions(perms)
      } else {
        setFormData({
          name: '',
          description: '',
        })
        setSelectedPermissions([])
      }
    }
  }, [open, role])

  const handlePermissionToggle = (permissionId: string) => {
    setSelectedPermissions(prev => 
      prev.includes(permissionId)
        ? prev.filter(p => p !== permissionId)
        : [...prev, permissionId]
    )
  }

  const handleSelectAll = (category: string) => {
    const categoryPermissions = AVAILABLE_PERMISSIONS
      .filter(p => p.category === category)
      .map(p => p.id)
    
    const allSelected = categoryPermissions.every(p => selectedPermissions.includes(p))
    
    if (allSelected) {
      setSelectedPermissions(prev => prev.filter(p => !categoryPermissions.includes(p)))
    } else {
      setSelectedPermissions(prev => [...new Set([...prev, ...categoryPermissions])])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name || !formData.description) {
      toast({
        title: 'Campos requeridos',
        description: 'Por favor completa todos los campos',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)

    try {
      const roleData = {
        name: formData.name,
        description: formData.description,
        permissions: selectedPermissions,
        user_count: 0,
      }

      if (role) {
        const { error } = await dataClient
          .from('roles')
          .update(roleData)
          .eq('id', role.id)

        if (error) throw error

        toast({
          title: 'Rol actualizado',
          description: 'El rol se actualizó correctamente',
        })
      } else {
        const { error } = await dataClient
          .from('roles')
          .insert([roleData])

        if (error) throw error

        toast({
          title: 'Rol creado',
          description: 'El rol se creó correctamente',
        })
      }

      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Ocurrió un error al guardar el rol',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const categories = [...new Set(AVAILABLE_PERMISSIONS.map(p => p.category))]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{role ? 'Editar Rol' : 'Nuevo Rol'}</DialogTitle>
          <DialogDescription>
            {role
              ? 'Modifica el rol y sus permisos asociados'
              : 'Crea un nuevo rol y asigna los permisos correspondientes'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre del Rol *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Supervisor, Gerente, etc."
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripción *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe las responsabilidades de este rol"
                rows={3}
                required
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base">Permisos del Rol</Label>
              <span className="text-sm text-muted-foreground">
                {selectedPermissions.length} de {AVAILABLE_PERMISSIONS.length} seleccionados
              </span>
            </div>

            <div className="space-y-4">
              {categories.map((category) => {
                const categoryPerms = AVAILABLE_PERMISSIONS.filter(p => p.category === category)
                const allSelected = categoryPerms.every(p => selectedPermissions.includes(p.id))

                return (
                  <div key={category} className="space-y-3 p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{category}</h4>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleSelectAll(category)}
                      >
                        {allSelected ? 'Deseleccionar todos' : 'Seleccionar todos'}
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      {categoryPerms.map((permission) => (
                        <div key={permission.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={permission.id}
                            checked={selectedPermissions.includes(permission.id)}
                            onCheckedChange={() => handlePermissionToggle(permission.id)}
                          />
                          <label
                            htmlFor={permission.id}
                            className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            {permission.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
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
              {loading ? 'Guardando...' : role ? 'Actualizar' : 'Crear Rol'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}


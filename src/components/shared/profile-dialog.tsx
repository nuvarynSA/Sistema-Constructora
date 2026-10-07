'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/components/ui/use-toast'
import { User, Mail, Phone, Briefcase, Building2, Calendar, Save, Lock } from 'lucide-react'
import { formatDate } from '@/lib/utils'

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

interface ProfileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ProfileDialog({ open, onOpenChange }: ProfileDialogProps) {
  const { userData } = useAuth()
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: userData?.name || '',
    email: userData?.email || '',
    password: '',
    phone: userData?.phone || '',
    position: userData?.position || '',
    area: userData?.area || '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const dataClient = createClient()
  const { toast } = useToast()

  const handleEdit = () => {
    setFormData({
      name: userData?.name || '',
      email: userData?.email || '',
      password: '',
      phone: userData?.phone || '',
      position: userData?.position || '',
      area: userData?.area || '',
    })
    setEditing(true)
  }

  const handleCancel = () => {
    setEditing(false)
    setFormData({
      name: userData?.name || '',
      email: userData?.email || '',
      password: '',
      phone: userData?.phone || '',
      position: userData?.position || '',
      area: userData?.area || '',
    })
    setShowPassword(false)
  }

  const handleSave = async () => {
    if (!userData) return

    if (formData.password && formData.password.length < 6) {
      toast({
        title: 'Error',
        description: 'La contraseña debe tener al menos 6 caracteres',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password || undefined,
          phone: formData.phone?.trim() || null,
          position: formData.position?.trim() || null,
          area: formData.area || null,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Error al actualizar el perfil')
      }

      toast({
        title: 'Perfil actualizado',
        description: 'Tus datos se actualizaron correctamente',
      })

      setEditing(false)
      setFormData({
        ...formData,
        password: '',
      })
      setShowPassword(false)
      window.location.reload()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo actualizar el perfil',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  if (!userData) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Mi Perfil</DialogTitle>
          <DialogDescription>
            Información personal y configuración de tu cuenta
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Avatar y info básica */}
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarFallback className="text-2xl bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                {userData.avatar}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="text-2xl font-semibold">{userData.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline">{userData.role?.name}</Badge>
                <Badge variant="secondary" className={userData.status === 'Activo' ? 'bg-green-100 text-green-800' : ''}>
                  {userData.status}
                </Badge>
              </div>
            </div>
          </div>

          <Separator />

          {/* Información editable */}
          {editing ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre Completo</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="pl-10"
                    placeholder="usuario@empresa.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Nueva Contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="pl-10"
                    placeholder="Dejar en blanco para no cambiar"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Deja en blanco si no deseas cambiar la contraseña. Mínimo 6 caracteres.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="pl-10"
                    placeholder="+54 11 1234-5678"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="position">Cargo</Label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="position"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    className="pl-10"
                    placeholder="Ej: Jefe de Área"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="area">Área</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                  <Select
                    value={formData.area}
                    onValueChange={(value) => setFormData({ ...formData, area: value })}
                  >
                    <SelectTrigger className="pl-10">
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

              <div className="flex gap-2 pt-2">
                <Button onClick={handleSave} disabled={loading} className="flex-1">
                  <Save className="mr-2 h-4 w-4" />
                  {loading ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
                <Button onClick={handleCancel} variant="outline" disabled={loading}>
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span>Email</span>
                  </div>
                  <p className="font-medium">{userData.email}</p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span>Teléfono</span>
                  </div>
                  <p className="font-medium">{userData.phone || 'No especificado'}</p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Building2 className="h-4 w-4" />
                    <span>Área</span>
                  </div>
                  <p className="font-medium">{userData.area}</p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Briefcase className="h-4 w-4" />
                    <span>Cargo</span>
                  </div>
                  <p className="font-medium">{userData.position || 'No especificado'}</p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Miembro desde</span>
                  </div>
                  <p className="font-medium">{formatDate(userData.created_at)}</p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Último acceso</span>
                  </div>
                  <p className="font-medium">
                    {userData.last_login ? formatDate(userData.last_login) : 'Nunca'}
                  </p>
                </div>
              </div>

              <Button onClick={handleEdit} className="w-full">
                Editar Perfil
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}


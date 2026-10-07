'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useTheme } from 'next-themes'
import { createClient } from '@/lib/mock/client'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { 
  Bell, 
  Moon, 
  Sun, 
  Monitor,
  Eye,
  Layout,
  Globe,
  Save,
  RefreshCw
} from 'lucide-react'

interface UserPreferences {
  theme: 'light' | 'dark' | 'system'
  notifications: {
    email: boolean
    push: boolean
    orders: boolean
    licitaciones: boolean
  }
  view: {
    defaultView: 'kanban' | 'table'
    itemsPerPage: number
  }
  language: string
}

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { userData } = useAuth()
  const { theme, setTheme } = useTheme()
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [preferences, setPreferences] = useState<UserPreferences>({
    theme: 'system',
    notifications: {
      email: true,
      push: true,
      orders: true,
      licitaciones: true,
    },
    view: {
      defaultView: 'kanban',
      itemsPerPage: 20,
    },
    language: 'es',
  })
  const dataClient = createClient()
  const { toast } = useToast()

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (open && userData) {
      loadPreferences()
    }
  }, [open, userData])

  const loadPreferences = async () => {
    if (!userData) return

    try {
      const { data, error } = await dataClient
        .from('configurations')
        .select('*')
        .eq('key', `user_preferences_${userData.id}`)
        .single()

      if (data && !error) {
        setPreferences(data.value as UserPreferences)
      }
    } catch (error) {
      // Si no existe configuración, usa valores por defecto
      console.log('No hay configuración previa, usando valores por defecto')
    }
  }

  const handleSave = async () => {
    if (!userData) return

    setLoading(true)
    try {
      // Aplicar tema
      if (mounted) {
        setTheme(preferences.theme)
      }

      // Guardar preferencias en base de datos
      const { error } = await dataClient
        .from('configurations')
        .upsert({
          key: `user_preferences_${userData.id}`,
          value: preferences,
        })

      if (error) throw error

      toast({
        title: 'Configuración guardada',
        description: 'Tus preferencias se guardaron correctamente',
      })

      onOpenChange(false)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo guardar la configuración',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async () => {
    if (!userData) return

    try {
      const { error } = await dataClient.auth.resetPasswordForEmail(userData.email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })

      if (error) throw error

      toast({
        title: 'Email enviado',
        description: 'Revisa tu correo para restablecer tu contraseña',
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo enviar el email',
        variant: 'destructive',
      })
    }
  }

  if (!userData) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configuración</DialogTitle>
          <DialogDescription>
            Personaliza tu experiencia en NEXORA
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Tema */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Moon className="h-5 w-5" />
              <h3 className="text-lg font-semibold">Apariencia</h3>
            </div>
            <Separator />
            
            <div className="space-y-3">
              <Label>Tema de la aplicación</Label>
              <div className="grid grid-cols-3 gap-3">
                <Button
                  variant={preferences.theme === 'light' ? 'default' : 'outline'}
                  className="flex flex-col h-auto py-3"
                  onClick={() => setPreferences({ ...preferences, theme: 'light' })}
                >
                  <Sun className="h-5 w-5 mb-1" />
                  <span className="text-sm">Claro</span>
                </Button>
                <Button
                  variant={preferences.theme === 'dark' ? 'default' : 'outline'}
                  className="flex flex-col h-auto py-3"
                  onClick={() => setPreferences({ ...preferences, theme: 'dark' })}
                >
                  <Moon className="h-5 w-5 mb-1" />
                  <span className="text-sm">Oscuro</span>
                </Button>
                <Button
                  variant={preferences.theme === 'system' ? 'default' : 'outline'}
                  className="flex flex-col h-auto py-3"
                  onClick={() => setPreferences({ ...preferences, theme: 'system' })}
                >
                  <Monitor className="h-5 w-5 mb-1" />
                  <span className="text-sm">Sistema</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Notificaciones */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              <h3 className="text-lg font-semibold">Notificaciones</h3>
            </div>
            <Separator />
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notificaciones por email</Label>
                  <p className="text-sm text-muted-foreground">
                    Recibe actualizaciones en tu correo
                  </p>
                </div>
                <Switch
                  checked={preferences.notifications.email}
                  onCheckedChange={(checked) =>
                    setPreferences({
                      ...preferences,
                      notifications: { ...preferences.notifications, email: checked },
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notificaciones push</Label>
                  <p className="text-sm text-muted-foreground">
                    Recibe notificaciones en tiempo real
                  </p>
                </div>
                <Switch
                  checked={preferences.notifications.push}
                  onCheckedChange={(checked) =>
                    setPreferences({
                      ...preferences,
                      notifications: { ...preferences.notifications, push: checked },
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notificaciones de pedidos</Label>
                  <p className="text-sm text-muted-foreground">
                    Avisos sobre pedidos derivados a tu área
                  </p>
                </div>
                <Switch
                  checked={preferences.notifications.orders}
                  onCheckedChange={(checked) =>
                    setPreferences({
                      ...preferences,
                      notifications: { ...preferences.notifications, orders: checked },
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notificaciones de licitaciones</Label>
                  <p className="text-sm text-muted-foreground">
                    Avisos sobre licitaciones derivadas a tu área
                  </p>
                </div>
                <Switch
                  checked={preferences.notifications.licitaciones}
                  onCheckedChange={(checked) =>
                    setPreferences({
                      ...preferences,
                      notifications: { ...preferences.notifications, licitaciones: checked },
                    })
                  }
                />
              </div>
            </div>
          </div>

          {/* Vista */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Layout className="h-5 w-5" />
              <h3 className="text-lg font-semibold">Vista predeterminada</h3>
            </div>
            <Separator />
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Modo de visualización</Label>
                <Select
                  value={preferences.view.defaultView}
                  onValueChange={(value: 'kanban' | 'table') =>
                    setPreferences({
                      ...preferences,
                      view: { ...preferences.view, defaultView: value },
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kanban">
                      <div className="flex items-center gap-2">
                        <Layout className="h-4 w-4" />
                        <span>Kanban (Tablero)</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="table">
                      <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        <span>Tabla</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Elementos por página</Label>
                <Select
                  value={preferences.view.itemsPerPage.toString()}
                  onValueChange={(value) =>
                    setPreferences({
                      ...preferences,
                      view: { ...preferences.view, itemsPerPage: parseInt(value) },
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 elementos</SelectItem>
                    <SelectItem value="20">20 elementos</SelectItem>
                    <SelectItem value="50">50 elementos</SelectItem>
                    <SelectItem value="100">100 elementos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Idioma */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              <h3 className="text-lg font-semibold">Idioma</h3>
            </div>
            <Separator />
            
            <div className="space-y-2">
              <Label>Idioma de la interfaz</Label>
              <Select
                value={preferences.language}
                onValueChange={(value) =>
                  setPreferences({ ...preferences, language: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="es">🇦🇷 Español</SelectItem>
                  <SelectItem value="en">🇺🇸 English</SelectItem>
                  <SelectItem value="pt">🇧🇷 Português</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Seguridad */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              <h3 className="text-lg font-semibold">Seguridad</h3>
            </div>
            <Separator />
            
            <Button onClick={handleResetPassword} variant="outline" className="w-full">
              <RefreshCw className="mr-2 h-4 w-4" />
              Cambiar Contraseña
            </Button>
          </div>

          {/* Botones de acción */}
          <div className="flex gap-2 pt-4">
            <Button onClick={handleSave} disabled={loading} className="flex-1">
              <Save className="mr-2 h-4 w-4" />
              {loading ? 'Guardando...' : 'Guardar Configuración'}
            </Button>
            <Button onClick={() => onOpenChange(false)} variant="outline">
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}


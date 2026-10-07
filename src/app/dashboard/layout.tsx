'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/mock/client'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LogOut, User, Settings, Package, FileText, Users, Building2, BarChart3, Truck, Calendar, ClipboardList, Boxes, CalendarRange } from 'lucide-react'
import { ThemeToggle } from '@/components/shared/theme-toggle'
import { ProfileDialog } from '@/components/shared/profile-dialog'
import { SettingsDialog } from '@/components/shared/settings-dialog'
import { MobileNav } from '@/components/shared/mobile-nav'
import type { User as UserType } from '@/lib/types'
import { isAdminRoleName } from '@/lib/permissions'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const dataClient = createClient()
  const [user, setUser] = useState<UserType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showProfileDialog, setShowProfileDialog] = useState(false)
  const [showSettingsDialog, setShowSettingsDialog] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'ok' | 'down' | 'checking'>('checking')
  const isLogisticaOnly = user?.role?.name === 'Logística'

  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    console.log('[DashboardLayout] mount')

    // Timeout extendido: le damos 20s para que el refresh de token también entre
    // dentro del tiempo disponible (token refresh + carga del usuario).
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current)
    }
    loadingTimeoutRef.current = setTimeout(() => {
      console.warn('[DashboardLayout] session timeout')
      setError('No se pudo validar la sesión a tiempo. Intentá recargar.')
      setLoading(false)
    }, 20000)

    const getUser = async () => {
      try {
        console.log('[DashboardLayout] Verificando sesión...')

        // Usamos getUser() (valida con el servidor y refresca el token si hace falta)
        // en lugar de getSession() que sólo lee caché local y puede devolver tokens vencidos.
        const { data: { user: authUser }, error: authError } = await dataClient.auth.getUser()

        console.log('[DashboardLayout] Auth user:', authUser?.email || 'No user')

        if (authError || !authUser) {
          // Si el token venció, intentamos un refresh explícito antes de rendirse
          console.warn('[DashboardLayout] getUser falló, intentando refresh...')
          const { data: refreshData, error: refreshError } = await dataClient.auth.refreshSession()
          if (refreshError || !refreshData.session) {
            console.warn('[DashboardLayout] Sin sesión válida, redirigiendo a login')
            setLoading(false)
            if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current)
            router.push('/auth/login')
            return
          }
          // Refresh exitoso — continuamos con el email del nuevo token
        }

        // Volvemos a obtener el user después del posible refresh
        const { data: { user: freshUser } } = await dataClient.auth.getUser()
        const userEmail = freshUser?.email
        if (!userEmail) {
          setError('Error al cargar datos del usuario')
          setLoading(false)
          if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current)
          return
        }

        console.log('[DashboardLayout] Sesión válida, cargando usuario...')

        const { data: userData, error: userError } = await dataClient
          .from('users')
          .select(`
            *,
            role:roles(*)
          `)
          .eq('email', userEmail as string)
          .single()

        const typedUserData = userData as unknown as UserType | null
        if (userError || !typedUserData) {
          console.error('❌ Dashboard - Error al cargar usuario:', userError)
          setError('Error al cargar datos del usuario')
          setLoading(false)
          if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current)
          return
        }

        console.log('[DashboardLayout] Usuario cargado')
        setUser(typedUserData)
        setLoading(false)
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current)
          loadingTimeoutRef.current = null
        }
      } catch (error) {
        console.error('[DashboardLayout] Error inesperado:', error)
        setError('Error al cargar datos del usuario')
        setLoading(false)
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current)
          loadingTimeoutRef.current = null
        }
      }
    }

    getUser()
  }, [router, dataClient])


  useEffect(() => {
    const { data: authSubscription } = dataClient.auth.onAuthStateChange((event, session) => {
      // Solo redirigir al login cuando el usuario se desconecta explícitamente.
      // Ignorar eventos intermedios (TOKEN_REFRESHED, INITIAL_SESSION, etc.) para
      // no cortar la sesión mientras el token se está renovando en segundo plano.
      if (event === 'SIGNED_OUT') {
        setUser(null)
        setError('Tu sesión expiró. Inicia sesión nuevamente.')
        setLoading(false)
        router.push('/auth/login')
      }
    })

    return () => {
      authSubscription?.subscription?.unsubscribe()
    }
  }, [dataClient, router])

  // Cuando el usuario vuelve al tab después de inactividad, refrescar el token
  // proactivamente (siempre, no sólo si ya expiró) para que cualquier acción
  // inmediata tenga un token vigente — evita el freeze/traba post-inactividad.
  useEffect(() => {
    let refreshing = false

    const handleResume = async () => {
      if (refreshing) return
      refreshing = true
      try {
        // refreshSession() usa el refresh token para obtener un access token nuevo.
        // Si la sesión es válida renueva silenciosamente; si expiró del todo, falla.
        const { data, error } = await dataClient.auth.refreshSession()
        if (error || !data.session) {
          console.warn('[DashboardLayout] Refresh falló al volver al tab, redirigiendo')
          router.push('/auth/login')
        }
      } catch {
        // Si hay un error de red temporal lo ignoramos; el onAuthStateChange lo maneja
      } finally {
        refreshing = false
      }
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') handleResume()
    }

    window.addEventListener('focus', handleResume)
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      window.removeEventListener('focus', handleResume)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [dataClient, router])

  useEffect(() => {
    let mounted = true
    let inflight = false

    const ping = async () => {
      if (!mounted || inflight) return
      inflight = true
      try {
        // Keep-alive del token del browser: getUser() valida con el servidor
        // y refresca el access token si está vencido o por vencer.
        // Esto evita que el token expire silenciosamente en tabs en segundo plano
        // o ventanas minimizadas donde el autoRefreshToken puede ser throttleado.
        await dataClient.auth.getUser()

        const res = await fetch('/api/health', { cache: 'no-store' })
        if (!mounted) return
        setConnectionStatus(res.ok ? 'ok' : 'down')
      } catch {
        if (!mounted) return
        setConnectionStatus('down')
      } finally {
        inflight = false
      }
    }

    ping()
    const interval = window.setInterval(ping, 2 * 60 * 1000)

    return () => {
      mounted = false
      window.clearInterval(interval)
    }
  }, [])

  const handleLogout = async () => {
    await dataClient.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="max-w-md text-center space-y-4">
          <h2 className="text-xl font-semibold">No se pudo cargar la sesión</h2>
          <p className="text-sm text-muted-foreground">{error}</p>
          <div className="flex items-center justify-center gap-3">
            <Button onClick={() => window.location.reload()}>Reintentar</Button>
            <Button variant="outline" onClick={handleLogout}>Salir</Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Mobile Menu + Logo */}
            <div className="flex items-center gap-3">
              <MobileNav user={user} />
              <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                NEXORA
              </h1>
            </div>

            {/* Navigation Desktop */}
            <nav className="hidden md:flex items-center space-x-1">
              <Button
                variant={pathname?.includes('/pedidos') ? 'default' : 'ghost'}
                onClick={() => router.push('/dashboard/pedidos')}
                className="gap-2 transition-all duration-200 hover:scale-105 active:scale-95"
              >
                <Package className="h-4 w-4" />
                Pedidos
              </Button>
              {!isLogisticaOnly && (
                <>
                  <Button
                    variant={pathname?.includes('/licitaciones') ? 'default' : 'ghost'}
                    onClick={() => router.push('/dashboard/licitaciones')}
                    className="gap-2 transition-all duration-200 hover:scale-105 active:scale-95"
                  >
                    <FileText className="h-4 w-4" />
                    Licitaciones
                  </Button>
                  <Button
                    variant={pathname?.includes('/obras') ? 'default' : 'ghost'}
                    onClick={() => router.push('/dashboard/obras')}
                    className="gap-2 transition-all duration-200 hover:scale-105 active:scale-95"
                  >
                    <Building2 className="h-4 w-4" />
                    Obras
                  </Button>
                  <Button
                    variant={pathname?.includes('/reportes') ? 'default' : 'ghost'}
                    onClick={() => router.push('/dashboard/reportes')}
                    className="gap-2 transition-all duration-200 hover:scale-105 active:scale-95"
                  >
                    <BarChart3 className="h-4 w-4" />
                    Reportes
                  </Button>
                </>
              )}
              {/* Logística */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant={pathname?.includes('/logistica') ? 'default' : 'ghost'}
                    className="gap-2 transition-all duration-200 hover:scale-105 active:scale-95"
                  >
                    <Truck className="h-4 w-4" />
                    Logística
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuLabel>Logística</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push('/dashboard/logistica/stock')}>
                    <CalendarRange className="mr-2 h-4 w-4" />
                    Reserva de vehículo
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push('/dashboard/logistica/tareas')}>
                    <ClipboardList className="mr-2 h-4 w-4" />
                    Tareas
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push('/dashboard/logistica/calendario')}>
                    <Calendar className="mr-2 h-4 w-4" />
                    Calendario
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {isAdminRoleName(user?.role?.name) && (
                <Button
                  variant={pathname?.includes('/usuarios') ? 'default' : 'ghost'}
                  onClick={() => router.push('/dashboard/usuarios')}
                  className="gap-2 transition-all duration-200 hover:scale-105 active:scale-95 animate-in slide-in-from-bottom-2"
                >
                  <Users className="h-4 w-4" />
                  Usuarios
                </Button>
              )}
            </nav>

            {/* Right section */}
            <div className="flex items-center space-x-1 sm:space-x-2">
              <div
                className={`text-xs px-2 py-1 rounded-full border ${
                  connectionStatus === 'ok'
                    ? 'bg-green-50 text-green-700 border-green-200'
                    : connectionStatus === 'down'
                      ? 'bg-red-50 text-red-700 border-red-200'
                      : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                }`}
                title="Estado de conexión"
              >
                {connectionStatus === 'ok' ? 'Online' : connectionStatus === 'down' ? 'Reconectando...' : 'Chequeando...'}
              </div>
              {/* Theme Toggle */}
              <ThemeToggle />

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-1 sm:gap-2 px-2 sm:px-3">
                    <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
                      <AvatarFallback className="bg-blue-500 text-white text-xs sm:text-sm">
                        {user?.avatar || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden lg:block text-left">
                      <div className="text-sm font-medium">{user?.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {user?.role?.name}
                      </div>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onSelect={(e) => {
                      e.preventDefault()
                      setShowProfileDialog(true)
                    }}
                  >
                    <User className="mr-2 h-4 w-4" />
                    Perfil
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onSelect={(e) => {
                      e.preventDefault()
                      setShowSettingsDialog(true)
                    }}
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    Configuración
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onSelect={(e) => {
                      e.preventDefault()
                      handleLogout()
                    }} 
                    className="text-red-600"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Cerrar Sesión
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="max-w-none mx-auto">
          {children}
        </div>
      </main>

      {/* Modals */}
      <ProfileDialog open={showProfileDialog} onOpenChange={setShowProfileDialog} />
      <SettingsDialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog} />
    </div>
  )
}

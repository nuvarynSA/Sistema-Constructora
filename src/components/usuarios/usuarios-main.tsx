'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { isAdminRoleName } from '@/lib/permissions'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Shield } from 'lucide-react'
import { UsuariosTable } from './usuarios-table'
import { RolesTable } from './roles-table'
import { AuditoriaTable } from './auditoria-table'

export function UsuariosMain() {
  const { userData, loading } = useAuth()
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    console.log('[UsuariosMain] mount', { loading, hasUser: !!userData })
    if (!loading) {
      if (!userData) {
        router.push('/auth/login')
        return
      }

      const adminCheck = isAdminRoleName(userData.role?.name)
      setIsAdmin(adminCheck)

      if (!adminCheck) {
        router.push('/dashboard/pedidos')
      }
    }
  }, [userData, loading, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            No tienes permisos para acceder a esta sección. Solo los administradores pueden gestionar usuarios y roles.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 animate-in slide-in-from-left-4 duration-500">
            Gestión de Usuarios y Roles
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Administra usuarios, roles y permisos del sistema
          </p>
        </div>
      </div>

      <Tabs defaultValue="usuarios" className="w-full">
        <TabsList className="grid w-full max-w-2xl grid-cols-3">
          <TabsTrigger value="usuarios">Usuarios</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="auditoria">Auditoría</TabsTrigger>
        </TabsList>

        <TabsContent value="usuarios" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Usuarios del Sistema</CardTitle>
              <CardDescription>
                Gestiona los usuarios, sus roles y permisos de acceso
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UsuariosTable />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Roles y Permisos</CardTitle>
              <CardDescription>
                Define roles y configura los permisos asociados a cada uno
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RolesTable />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="auditoria" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Registro de Auditoría</CardTitle>
              <CardDescription>
                Historial completo de todas las acciones realizadas en el sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AuditoriaTable />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

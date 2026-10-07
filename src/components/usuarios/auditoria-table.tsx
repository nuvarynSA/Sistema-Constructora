'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/mock/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Search, RefreshCw, FileText, Package, Users, Shield } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { formatDate } from '@/lib/utils'
import type { AuditLog } from '@/lib/types'

export function AuditoriaTable() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterEntity, setFilterEntity] = useState<string>('all')
  const [filterAction, setFilterAction] = useState<string>('all')
  const dataClient = createClient()
  const { toast } = useToast()

  useEffect(() => {
    fetchLogs()
  }, [])

  useEffect(() => {
    filterAuditLogs()
  }, [logs, searchTerm, filterEntity, filterAction])

  const fetchLogs = async () => {
    setLoading(true)
    const { data, error } = await dataClient
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500) // Últimos 500 registros

    if (error) {
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los registros de auditoría',
        variant: 'destructive',
      })
    } else {
      setLogs(data || [])
    }
    setLoading(false)
  }

  const filterAuditLogs = () => {
    let filtered = [...logs]

    // Filtrar por término de búsqueda
    if (searchTerm) {
      filtered = filtered.filter(
        (log) =>
          log.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          log.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          log.entity_name?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filtrar por entidad
    if (filterEntity !== 'all') {
      filtered = filtered.filter((log) => log.entity === filterEntity)
    }

    // Filtrar por acción
    if (filterAction !== 'all') {
      filtered = filtered.filter((log) => log.action === filterAction)
    }

    setFilteredLogs(filtered)
  }

  const getEntityIcon = (entity: string) => {
    switch (entity) {
      case 'order':
        return <Package className="h-4 w-4" />
      case 'licitacion':
        return <FileText className="h-4 w-4" />
      case 'user':
        return <Users className="h-4 w-4" />
      case 'role':
        return <Shield className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  const getEntityLabel = (entity: string) => {
    switch (entity) {
      case 'order':
        return 'Pedido'
      case 'licitacion':
        return 'Licitación'
      case 'user':
        return 'Usuario'
      case 'role':
        return 'Rol'
      case 'document':
        return 'Documento'
      case 'comment':
        return 'Comentario'
      default:
        return entity
    }
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case 'crear':
        return 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700'
      case 'editar':
        return 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700'
      case 'eliminar':
        return 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700'
      case 'derivar':
        return 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-700'
      case 'activar':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-700'
      case 'desactivar':
        return 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600'
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
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por usuario, descripción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Select value={filterEntity} onValueChange={setFilterEntity}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Entidad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las entidades</SelectItem>
            <SelectItem value="order">Pedidos</SelectItem>
            <SelectItem value="licitacion">Licitaciones</SelectItem>
            <SelectItem value="user">Usuarios</SelectItem>
            <SelectItem value="role">Roles</SelectItem>
            <SelectItem value="document">Documentos</SelectItem>
            <SelectItem value="comment">Comentarios</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterAction} onValueChange={setFilterAction}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Acción" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las acciones</SelectItem>
            <SelectItem value="crear">Crear</SelectItem>
            <SelectItem value="editar">Editar</SelectItem>
            <SelectItem value="eliminar">Eliminar</SelectItem>
            <SelectItem value="derivar">Derivar</SelectItem>
            <SelectItem value="activar">Activar</SelectItem>
            <SelectItem value="desactivar">Desactivar</SelectItem>
          </SelectContent>
        </Select>

        <Button onClick={fetchLogs} variant="outline" size="icon">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border p-4">
          <div className="text-sm text-muted-foreground">Total Registros</div>
          <div className="text-2xl font-bold">{filteredLogs.length}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border p-4">
          <div className="text-sm text-muted-foreground">Acciones Hoy</div>
          <div className="text-2xl font-bold">
            {
              filteredLogs.filter((log) => {
                const logDate = new Date(log.created_at)
                const today = new Date()
                return logDate.toDateString() === today.toDateString()
              }).length
            }
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border p-4">
          <div className="text-sm text-muted-foreground">Usuarios Únicos</div>
          <div className="text-2xl font-bold">
            {new Set(filteredLogs.map((log) => log.user_id)).size}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border p-4">
          <div className="text-sm text-muted-foreground">Última Actividad</div>
          <div className="text-sm font-medium">
            {filteredLogs[0] ? formatDate(filteredLogs[0].created_at) : 'N/A'}
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="rounded-md border bg-white dark:bg-gray-800">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuario</TableHead>
              <TableHead>Acción</TableHead>
              <TableHead>Entidad</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Fecha</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No hay registros de auditoría
                </TableCell>
              </TableRow>
            ) : (
              filteredLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {log.user_name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .toUpperCase()
                            .slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-sm">{log.user_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {log.user_role}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`${getActionColor(log.action)} capitalize`}
                    >
                      {log.action}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getEntityIcon(log.entity)}
                      <div>
                        <div className="text-sm font-medium">
                          {getEntityLabel(log.entity)}
                        </div>
                        {log.entity_name && (
                          <div className="text-xs text-muted-foreground">
                            {log.entity_name}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-md">
                    <p className="text-sm truncate">{log.description}</p>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {formatDate(log.created_at)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}


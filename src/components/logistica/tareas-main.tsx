'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Clock, User, Truck, Calendar, AlertCircle, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/mock/client'
import type { TareaLogistica, User as AppUser } from '@/lib/types'
import { NewTaskDialog } from './new-task-dialog'
import { useToast } from '@/components/ui/use-toast'
import { usePermissions } from '@/hooks/use-permissions'
import { useAuth } from '@/hooks/use-auth'
import { TareaDetailDialog } from './tarea-detail-dialog'

interface AuditComment {
  id: string
  description: string
  created_at: string
  user_name?: string
  user_role?: string
  metadata?: {
    attachments?: {
      id: string
      name: string
      url: string
      size?: string
    }[]
  }
}

const parseTaskDateForMath = (value?: string | null) => {
  if (!value) return null
  const normalized = value.includes('T') ? value : `${value}T00:00:00`
  const parsed = new Date(normalized)
  if (Number.isNaN(parsed.getTime())) return null
  parsed.setHours(0, 0, 0, 0)
  return parsed
}

const formatTaskDate = (value?: string | null) => {
  if (!value) return '-'
  const normalized = value.includes('T') ? value : `${value}T00:00:00`
  const parsed = new Date(normalized)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString('es-AR')
}

const formatTaskTime = (value?: string | null) => {
  if (!value || !value.includes('T')) return null
  const match = value.match(/T(\d{2}):(\d{2})/)
  if (!match) return null
  const hour = match[1]
  const minute = match[2]
  if (hour === '00' && minute === '00') return null
  return `${hour}:${minute}`
}

export function TareasMain() {
  const [tareas, setTareas] = useState<TareaLogistica[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [filtroTitulo, setFiltroTitulo] = useState('')
  const [comentarios, setComentarios] = useState<Record<string, AuditComment[]>>({})
  const [nuevoComentario, setNuevoComentario] = useState<Record<string, string>>({})
  const [comentarioFiles, setComentarioFiles] = useState<Record<string, File[]>>({})
  const [usuarios, setUsuarios] = useState<AppUser[]>([])
  const [selectedTarea, setSelectedTarea] = useState<TareaLogistica | null>(null)
  const [showDetailDialog, setShowDetailDialog] = useState(false)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null)
  const taskIdsRef = useRef<string[]>([])
  const hasLoadedRef = useRef(false)
  const dataClient = createClient()
  const { toast } = useToast()
  const { isAdmin } = usePermissions()
  const { userData } = useAuth()
  const canDeleteAll = isAdmin()

  const shouldBeProgramada = (tarea: TareaLogistica) => {
    if (!tarea.fecha) return false
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const start = parseTaskDateForMath(tarea.fecha)
    if (!start) return false
    const diffFromToday = Math.ceil((start.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    if (diffFromToday >= 3) return true
    if (tarea.fecha_limite) {
      const end = parseTaskDateForMath(tarea.fecha_limite)
      if (!end) return false
      const duration = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
      if (duration > 2) return true
    }
    return false
  }

  const fetchComentarios = useCallback(async (taskIds: string[]) => {
    if (!taskIds.length) return
    const { data } = await dataClient
      .from('audit_logs')
      .select('id, description, created_at, user_name, user_role, entity_id, metadata')
      .in('entity_id', taskIds)
      .eq('entity', 'tarea')
      .eq('action', 'comment')
      .order('created_at', { ascending: false })

    if (!data) return
    const grouped: Record<string, AuditComment[]> = {}
    const seenByTask: Record<string, Set<string>> = {}
    data.forEach((row) => {
      const key = (row as any).entity_id as string
      if (!grouped[key]) grouped[key] = []
      if (!seenByTask[key]) seenByTask[key] = new Set<string>()
      const createdAtMs = Date.parse(row.created_at)
      const dedupeBucket = Number.isNaN(createdAtMs) ? row.created_at : Math.floor(createdAtMs / 1000)
      const dedupeKey = [
        row.id,
        row.description?.trim() || '',
        (row as any).user_name || '',
        dedupeBucket,
      ].join('|')
      if (seenByTask[key].has(dedupeKey)) return
      seenByTask[key].add(dedupeKey)
      grouped[key].push({
        id: row.id,
        description: row.description,
        created_at: row.created_at,
        user_name: (row as any).user_name,
        user_role: (row as any).user_role,
        metadata: (row as any).metadata || undefined,
      })
    })
    setComentarios(grouped)
  }, [dataClient])

  const fetchTareas = useCallback(async () => {
    if (!hasLoadedRef.current) {
      setLoading(true)
    }
    try {
      // Primero obtener las tareas sin relaciones (excluir reservas de vehículos RV%)
      const { data: tareasData, error: tareasError } = await dataClient
        .from('tareas_logistica')
        .select('*')
        .or('tln.is.null,tln.not.ilike.RV%')
        .order('created_at', { ascending: false })

      if (tareasError) {
        console.error('Error fetching tareas:', tareasError)
        throw tareasError
      }

      if (!tareasData || tareasData.length === 0) {
        setTareas([])
        setLoading(false)
        return
      }

      // Obtener IDs únicos de usuarios
      const userIds = new Set<string>()
      tareasData.forEach(tarea => {
        if (tarea.solicitante_id) userIds.add(tarea.solicitante_id)
        if (tarea.asignado_id) userIds.add(tarea.asignado_id)
        if (tarea.creador_id) userIds.add(tarea.creador_id)
      })

      // Cargar todos los usuarios de una vez (solo si hay IDs)
      let usuariosMap = new Map()
      if (userIds.size > 0) {
        const { data: usuariosData } = await dataClient
          .from('users')
          .select('id, name, email, area')
          .in('id', Array.from(userIds))

        usuariosMap = new Map((usuariosData || []).map(u => [u.id, u]))
      }

      // Auto-programar tareas que cumplen criterio
      const tareasParaProgramar = tareasData.filter((tarea) => {
        if (tarea.estado === 'finalizado' || tarea.estado === 'programada') return false
        return shouldBeProgramada(tarea as TareaLogistica)
      })
      if (tareasParaProgramar.length > 0) {
        await Promise.all(
          tareasParaProgramar.map((tarea) =>
            dataClient.from('tareas_logistica').update({ estado: 'programada' }).eq('id', tarea.id)
          )
        )
        const { data: refreshed } = await dataClient
          .from('tareas_logistica')
          .select('*')
          .or('tln.is.null,tln.not.ilike.RV%')
          .order('created_at', { ascending: false })
        if (refreshed) {
          tareasData.splice(0, tareasData.length, ...refreshed)
        }
      }

      // Combinar tareas con usuarios
      const tareasConUsuarios = tareasData.map(tarea => ({
        ...tarea,
        solicitante: tarea.solicitante_id ? usuariosMap.get(tarea.solicitante_id) : null,
        asignado: tarea.asignado_id ? usuariosMap.get(tarea.asignado_id) : null,
        creador: tarea.creador_id ? usuariosMap.get(tarea.creador_id) : null,
      }))

      console.log('Tareas cargadas:', tareasConUsuarios.length)
      setTareas(tareasConUsuarios)
      taskIdsRef.current = tareasConUsuarios.map(t => t.id)
      hasLoadedRef.current = true
      await fetchComentarios(tareasConUsuarios.map(t => t.id))
    } catch (error) {
      console.error('Error fetching tareas:', error)
    } finally {
      setLoading(false)
    }
  }, [dataClient, fetchComentarios])

  const tareasByEstado = (estado: string) => tareas.filter(t => t.estado === estado)
  const tareasByEstadoFiltradas = (estado: string) => {
    const filtered = tareasByEstado(estado)
    if (!filtroTitulo.trim()) return filtered
    const term = filtroTitulo.toLowerCase()
    return filtered.filter((t) => (t.titulo || t.descripcion || '').toLowerCase().includes(term))
  }

  const insertMention = (tareaId: string, userName: string) => {
    const clean = userName.replace(/\s+/g, '')
    setNuevoComentario((prev) => {
      const current = prev[tareaId] || ''
      const replaced = current.replace(/@[\wñáéíóúÁÉÍÓÚüÜ]*$/, `@${clean} `)
      const nextValue = current.match(/@[\wñáéíóúÁÉÍÓÚüÜ]*$/) ? replaced : `${current}@${clean} `
      return { ...prev, [tareaId]: nextValue }
    })
  }

  const openDetailForCard = (tarea: TareaLogistica) => {
    setSelectedTarea(tarea)
    setShowDetailDialog(true)
  }

  const getNextEstado = (estado: string): string | null => {
    const flow: Record<string, string | null> = {
      solicitud: 'en_curso',
      en_curso: 'programada',
      programada: 'finalizado',
      finalizado: null,
    }
    return flow[estado]
  }

  const canProgramar = (tarea: TareaLogistica) => {
    return shouldBeProgramada(tarea)
  }

  const handleDerivar = async (tarea: TareaLogistica) => {
    const next = getNextEstado(tarea.estado)
    if (!next) return
    const { error } = await dataClient
      .from('tareas_logistica')
      .update({ estado: next, updated_at: new Date().toISOString() })
      .eq('id', tarea.id)
    if (error) {
      toast({
        title: 'Error al actualizar',
        description: error.message || 'No se pudo actualizar la tarea.',
        variant: 'destructive',
      })
      return
    }
    await fetchTareas()
  }

  const handleDrop = async (estado: string, tareaId: string) => {
    const tarea = tareas.find((t) => t.id === tareaId)
    if (!tarea || tarea.estado === estado) return
    const { error } = await dataClient
      .from('tareas_logistica')
      .update({ estado, updated_at: new Date().toISOString() })
      .eq('id', tareaId)
    if (error) {
      toast({
        title: 'Error al actualizar',
        description: error.message || 'No se pudo actualizar la tarea.',
        variant: 'destructive',
      })
      return
    }
    await fetchTareas()
  }

  const handleDelete = async (tarea: TareaLogistica) => {
    // Solo permitir borrar si está en estado solicitud
    if (!canDeleteAll && tarea.estado !== 'solicitud') {
      toast({
        title: 'Sin permisos',
        description: 'Solo los administradores pueden eliminar tareas fuera del estado solicitud.',
        variant: 'destructive',
      })
      return
    }

    if (!confirm('¿Estás seguro de que deseas eliminar esta tarea?')) {
      return
    }

    const { error } = await dataClient
      .from('tareas_logistica')
      .delete()
      .eq('id', tarea.id)

    if (error) {
      console.error('Error deleting task:', error)
      alert('Error al eliminar la tarea')
    } else {
      fetchTareas()
    }
  }

  const fetchUsuarios = useCallback(async () => {
    const { data } = await dataClient
      .from('users')
      .select('id, name, email, area')
      .eq('status', 'Activo')
      .order('name')
    setUsuarios(data as any || [])
  }, [dataClient])

  useEffect(() => {
    fetchTareas()
    fetchUsuarios()
    // Realtime updates for tasks
    const channel = dataClient
      .channel('tareas-logistica-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tareas_logistica' }, () => {
        fetchTareas()
      })
      .subscribe()

    const commentsChannel = dataClient
      .channel('tareas-logistica-comments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'audit_logs', filter: 'entity=eq.tarea' }, () => {
        const taskIds = taskIdsRef.current
        if (taskIds.length > 0) {
          fetchComentarios(taskIds)
        }
      })
      .subscribe()

    return () => {
      dataClient.removeChannel(channel)
      dataClient.removeChannel(commentsChannel)
    }
  }, [fetchTareas, fetchUsuarios, fetchComentarios, dataClient])

  const handleGuardarComentario = async (tarea: TareaLogistica) => {
    const texto = (nuevoComentario[tarea.id] || '').trim()
    const files = comentarioFiles[tarea.id] || []
    if (!texto && files.length === 0) return

    if (!userData) {
      toast({ title: 'Inicia sesión', description: 'Necesitas estar autenticado.', variant: 'destructive' })
      return
    }

    try {
      const formData = new FormData()
      formData.append('content', texto)
      files.forEach((file) => formData.append('file', file))

      const response = await fetch(`/api/tareas/${tarea.id}/comentario`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al guardar comentario')
      }
      const responseData = await response.json()

      const { notifyMentionedUsers } = await import('@/lib/notifications')
      await notifyMentionedUsers({
        commentContent: texto,
        commentAuthorId: userData.id,
        commentAuthorName: userData.name || 'Usuario',
        referenceId: tarea.id,
        referenceType: 'tarea',
      })

      if (responseData?.comment) {
        setComentarios((prev) => {
          const current = prev[tarea.id] || []
          return { ...prev, [tarea.id]: [responseData.comment, ...current] }
        })
      } else {
        await fetchComentarios([tarea.id])
      }
      setNuevoComentario((prev) => ({ ...prev, [tarea.id]: '' }))
      setComentarioFiles((prev) => ({ ...prev, [tarea.id]: [] }))
      await fetchTareas()
      toast({ title: 'Comentario guardado', description: 'Se registró en el sistema.' })
    } catch (error) {
      console.error('Error saving comment:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo guardar el comentario.',
        variant: 'destructive',
      })
    }
  }

  const handleDeleteComentarioFile = async (tareaId: string, commentId: string, attachmentId: string) => {
    try {
      const response = await fetch(`/api/tareas/${tareaId}/comentario?commentId=${commentId}&attachmentId=${attachmentId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al eliminar archivo')
      }

      await fetchComentarios([tareaId])
      toast({ title: 'Archivo eliminado', description: 'El archivo fue eliminado correctamente.' })
    } catch (error) {
      console.error('Error deleting task comment file:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo eliminar el archivo.',
        variant: 'destructive',
      })
    }
  }

  const handleDeleteComentario = async (tareaId: string, commentId: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este comentario?')) {
      return
    }
    try {
      const response = await fetch(`/api/tareas/${tareaId}/comentario?commentId=${commentId}&deleteComment=true`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al eliminar comentario')
      }

      setComentarios((prev) => {
        const current = prev[tareaId] || []
        return { ...prev, [tareaId]: current.filter((c) => c.id !== commentId) }
      })
      await fetchComentarios([tareaId])
      await fetchTareas()
      toast({ title: 'Comentario eliminado', description: 'El comentario fue eliminado correctamente.' })
    } catch (error) {
      console.error('Error deleting task comment:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo eliminar el comentario.',
        variant: 'destructive',
      })
    }
  }

  const handleAddComentarioFiles = (tareaId: string, files: File[]) => {
    const validFiles = files.filter(file => {
      const extension = '.' + file.name.split('.').pop()?.toLowerCase()
      const allowedExtensions = ['.xlsx', '.xls', '.pdf', '.csv', '.png', '.jpg', '.jpeg', '.doc', '.docx']
      if (!allowedExtensions.includes(extension)) {
        toast({
          title: 'Error',
          description: `El archivo ${file.name} no es un tipo permitido. Solo se permiten: PDF, Excel, CSV, PNG, JPG, DOC, DOCX`,
          variant: 'destructive',
        })
        return false
      }
      if (file.size > 50 * 1024 * 1024) {
        toast({
          title: 'Error',
          description: `El archivo ${file.name} es demasiado grande (máximo 50MB)`,
          variant: 'destructive',
        })
        return false
      }
      return true
    })

    if (validFiles.length === 0) return

    setComentarioFiles((prev) => ({ ...prev, [tareaId]: [...(prev[tareaId] || []), ...validFiles] }))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Tareas</h1>
          <p className="text-sm text-muted-foreground">Gestión de tareas de logística</p>
        </div>
        <Button onClick={() => setShowDialog(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nueva Tarea
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Filtrar por título</span>
            <input
              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Ej: Reserva de vehículo"
              value={filtroTitulo}
              onChange={(e) => setFiltroTitulo(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8 xl:gap-10">
          <div className="space-y-3 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Solicitud</h3>
              <Badge variant="secondary">{tareasByEstado('solicitud').length}</Badge>
            </div>
            <div
              className={`rounded-lg ${dragOverColumn === 'solicitud' ? 'ring-2 ring-primary/60 bg-primary/5' : ''}`}
              onDragOver={(event) => event.preventDefault()}
              onDragEnter={() => setDragOverColumn('solicitud')}
              onDragLeave={() => setDragOverColumn(null)}
              onDrop={(event) => {
                event.preventDefault()
                setDragOverColumn(null)
                const tareaId = event.dataTransfer.getData('text/plain')
                if (tareaId) handleDrop('solicitud', tareaId)
              }}
            >
              <TareasList
                tareas={tareasByEstadoFiltradas('solicitud')}
                loading={loading}
                onDerivar={handleDerivar}
                onDelete={handleDelete}
                canDeleteAll={canDeleteAll}
                onOpenDetail={openDetailForCard}
                canProgramar={canProgramar}
                onDragStart={(id) => setDraggingId(id)}
                onDragEnd={() => setDraggingId(null)}
                draggingId={draggingId}
              />
            </div>
          </div>
          <div className="space-y-3 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">En curso</h3>
              <Badge variant="secondary">{tareasByEstado('en_curso').length}</Badge>
            </div>
            <div
              className={`rounded-lg ${dragOverColumn === 'en_curso' ? 'ring-2 ring-primary/60 bg-primary/5' : ''}`}
              onDragOver={(event) => event.preventDefault()}
              onDragEnter={() => setDragOverColumn('en_curso')}
              onDragLeave={() => setDragOverColumn(null)}
              onDrop={(event) => {
                event.preventDefault()
                setDragOverColumn(null)
                const tareaId = event.dataTransfer.getData('text/plain')
                if (tareaId) handleDrop('en_curso', tareaId)
              }}
            >
              <TareasList
              tareas={tareasByEstadoFiltradas('en_curso')}
              loading={loading}
              onDerivar={handleDerivar}
              onDelete={handleDelete}
              canDeleteAll={canDeleteAll}
              onOpenDetail={openDetailForCard}
              canProgramar={canProgramar}
              onDragStart={(id) => setDraggingId(id)}
              onDragEnd={() => setDraggingId(null)}
              draggingId={draggingId}
            />
            </div>
          </div>
          <div className="space-y-3 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Programadas</h3>
              <Badge variant="secondary">{tareasByEstado('programada').length}</Badge>
            </div>
            <div
              className={`rounded-lg ${dragOverColumn === 'programada' ? 'ring-2 ring-primary/60 bg-primary/5' : ''}`}
              onDragOver={(event) => event.preventDefault()}
              onDragEnter={() => setDragOverColumn('programada')}
              onDragLeave={() => setDragOverColumn(null)}
              onDrop={(event) => {
                event.preventDefault()
                setDragOverColumn(null)
                const tareaId = event.dataTransfer.getData('text/plain')
                if (tareaId) handleDrop('programada', tareaId)
              }}
            >
              <TareasList
              tareas={tareasByEstadoFiltradas('programada')}
              loading={loading}
              onDerivar={handleDerivar}
              onDelete={handleDelete}
              canDeleteAll={canDeleteAll}
              onOpenDetail={openDetailForCard}
              canProgramar={canProgramar}
              onDragStart={(id) => setDraggingId(id)}
              onDragEnd={() => setDraggingId(null)}
              draggingId={draggingId}
            />
            </div>
          </div>
          <div className="space-y-3 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Finalizado</h3>
              <Badge variant="secondary">{tareasByEstado('finalizado').length}</Badge>
            </div>
            <div
              className={`rounded-lg ${dragOverColumn === 'finalizado' ? 'ring-2 ring-primary/60 bg-primary/5' : ''}`}
              onDragOver={(event) => event.preventDefault()}
              onDragEnter={() => setDragOverColumn('finalizado')}
              onDragLeave={() => setDragOverColumn(null)}
              onDrop={(event) => {
                event.preventDefault()
                setDragOverColumn(null)
                const tareaId = event.dataTransfer.getData('text/plain')
                if (tareaId) handleDrop('finalizado', tareaId)
              }}
            >
              <TareasList
              tareas={tareasByEstadoFiltradas('finalizado')}
              loading={loading}
              onDerivar={handleDerivar}
              onDelete={handleDelete}
              canDeleteAll={canDeleteAll}
              onOpenDetail={openDetailForCard}
              canProgramar={canProgramar}
              onDragStart={(id) => setDraggingId(id)}
              onDragEnd={() => setDraggingId(null)}
              draggingId={draggingId}
            />
            </div>
          </div>
        </div>
      </div>

      <NewTaskDialog open={showDialog} onOpenChange={setShowDialog} onSuccess={fetchTareas} />
      <TareaDetailDialog
        tarea={selectedTarea}
        open={showDetailDialog}
        onOpenChange={(open) => {
          setShowDetailDialog(open)
          if (!open) setSelectedTarea(null)
        }}
        comentarios={comentarios}
        nuevoComentario={nuevoComentario}
        onComentarioChange={(id, val) => setNuevoComentario((prev) => ({ ...prev, [id]: val }))}
        usuarios={usuarios}
        onSelectUsuario={(id, u) => insertMention(id, u)}
        onGuardarComentario={handleGuardarComentario}
        comentarioFiles={comentarioFiles}
        onAddComentarioFiles={handleAddComentarioFiles}
        onRemoveComentarioFile={(id, index) =>
          setComentarioFiles((prev) => ({
            ...prev,
            [id]: (prev[id] || []).filter((_, i) => i !== index),
          }))
        }
        onDeleteComentarioFile={handleDeleteComentarioFile}
        onDeleteComentario={handleDeleteComentario}
        canDeleteComments={canDeleteAll}
        onUpdate={fetchTareas}
      />
    </div>
  )
}

function TareasList({
  tareas,
  loading,
  onDerivar,
  onDelete,
  canDeleteAll,
  onOpenDetail,
  canProgramar,
  onDragStart,
  onDragEnd,
  draggingId,
}: {
  tareas: TareaLogistica[]
  loading: boolean
  onDerivar: (t: TareaLogistica) => void
  onDelete?: (t: TareaLogistica) => void
  canDeleteAll: boolean
  onOpenDetail: (tarea: TareaLogistica) => void
  canProgramar: (tarea: TareaLogistica) => boolean
  onDragStart: (id: string) => void
  onDragEnd: () => void
  draggingId: string | null
}) {
  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'solicitud': return 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-500/25 dark:text-yellow-400 dark:border-yellow-500/70'
      case 'en_curso': return 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-500/25 dark:text-blue-400 dark:border-blue-500/70'
      case 'programada': return 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-500/25 dark:text-indigo-400 dark:border-indigo-500/70'
      case 'finalizado': return 'bg-green-100 text-green-800 border-green-300 dark:bg-green-500/25 dark:text-green-400 dark:border-green-500/70'
      default: return 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-500/25 dark:text-gray-400 dark:border-gray-500/70'
    }
  }

  const getPrioridadColor = (prioridad: string) => {
    switch (prioridad) {
      case 'Alta': return 'bg-red-100 text-red-800 dark:bg-red-500/25 dark:text-red-400'
      case 'Media': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/25 dark:text-yellow-400'
      case 'Baja': return 'bg-green-100 text-green-800 dark:bg-green-500/25 dark:text-green-400'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-500/25 dark:text-gray-400'
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[200px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  )
  
  if (!tareas.length) return (
    <div className="text-center py-8 text-muted-foreground">
      <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
      <p>No hay tareas en este estado</p>
    </div>
  )
  
  return (
    <div className="grid gap-4 min-h-[120px]">
      {tareas.map(t => (
        <Card
          key={t.id}
          className={`w-full max-w-full min-w-0 hover:shadow-md transition-shadow cursor-pointer ${draggingId === t.id ? 'opacity-60' : ''}`}
          onClick={() => onOpenDetail(t)}
          role="button"
          tabIndex={0}
          draggable
          onDragStart={(event) => {
            onDragStart(t.id)
            event.dataTransfer.setData('text/plain', t.id)
            event.dataTransfer.effectAllowed = 'move'
          }}
          onDragEnd={onDragEnd}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              onOpenDetail(t)
            }
          }}
        >
          <CardHeader className="pb-3 min-w-0">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge className={getEstadoColor(t.estado)}>
                  {t.estado.replace('_', ' ')}
                </Badge>
                <Badge className={getPrioridadColor(t.prioridad)}>
                  {t.prioridad}
                </Badge>
              </div>
              <div className="space-y-1 flex-1 min-w-0">
                <CardTitle className="text-lg break-words min-w-0">{t.titulo || t.tln}</CardTitle>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="pt-0 min-w-0">
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 min-w-0 flex-wrap">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Solicitante</span>
                <span className="break-words">&quot;{t.solicitante?.name || 'No asignado'}&quot;</span>
              </div>
              <div className="flex items-center gap-2 min-w-0 flex-wrap">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Fecha:</span>
                <span className="break-words">&quot;{formatTaskDate(t.fecha)}&quot;</span>
                {formatTaskTime(t.fecha) && (
                  <>
                    <span className="text-muted-foreground">-</span>
                    <span className="break-words">Hora: &quot;{formatTaskTime(t.fecha)}&quot;</span>
                  </>
                )}
                {t.fecha_limite && (
                  <>
                    <span className="text-muted-foreground">-</span>
                    <span className="break-words">&quot;{formatTaskDate(t.fecha_limite)}&quot;</span>
                  </>
                )}
                <span className="text-muted-foreground">-</span>
                <span className="font-medium">TLN:</span>
                <span className="font-mono break-words">&quot;{t.tln}&quot;</span>
              </div>
              <div className="flex items-center gap-2 min-w-0 flex-wrap">
                <Truck className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Vehiculo:</span>
                <span className="break-words">&quot;{t.vehiculo || 'No asignado'}&quot;</span>
              </div>
            </div>
            
            {t.tipo && (
              <div className="mt-3 pt-3 border-t">
                <span className="text-sm font-medium">Tipo: </span>
                <span className="text-sm">{t.tipo}</span>
              </div>
            )}

            <div className="mt-4 flex justify-end gap-2">
                  {onDelete && (canDeleteAll || t.estado === 'solicitud') && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={(event) => {
                    event.stopPropagation()
                    onDelete(t)
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Eliminar
                </Button>
              )}
              {t.estado !== 'finalizado' && (
                <Button
                  size="sm"
                  onClick={(event) => {
                    event.stopPropagation()
                    onDerivar(t)
                  }}
                  title={t.estado === 'en_curso' && !canProgramar(t) ? 'Fecha menor a 2 días. Se puede forzar.' : undefined}
                >
                  {t.estado === 'solicitud' ? 'Iniciar' : t.estado === 'en_curso' ? 'Programar' : 'Finalizar'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

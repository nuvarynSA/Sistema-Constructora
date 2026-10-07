'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Clock, User, Truck, Calendar, CheckCircle2, Flag, X, Trash2, Pencil } from 'lucide-react'
import { createClient } from '@/lib/mock/client'
import type { TareaLogistica } from '@/lib/types'
import { NewReservaDialog } from './new-reserva-dialog'
import { useToast } from '@/components/ui/use-toast'
import { usePermissions } from '@/hooks/use-permissions'

/* ─── helpers de fecha ─── */
const formatDate = (value?: string | null) => {
  if (!value) return '-'
  const normalized = value.includes('T') ? value : `${value}T00:00:00`
  const parsed = new Date(normalized)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString('es-AR')
}

const formatTime = (value?: string | null) => {
  if (!value || !value.includes('T')) return null
  const match = value.match(/T(\d{2}):(\d{2})/)
  if (!match) return null
  const [, h, m] = match
  if (h === '00' && m === '00') return null
  return `${h}:${m}`
}

/* ─── columnas del Kanban ─── */
const COLUMNS = [
  {
    id: 'pendiente',
    label: 'Pendiente',
    badgeClass: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-500/25 dark:text-yellow-400 dark:border-yellow-500/70',
  },
  {
    id: 'confirmado',
    label: 'Confirmado',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-500/25 dark:text-blue-400 dark:border-blue-500/70',
  },
  {
    id: 'finalizado',
    label: 'Finalizado',
    badgeClass: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-500/25 dark:text-green-400 dark:border-green-500/70',
  },
]

export function ReservasMain() {
  const [reservas, setReservas] = useState<TareaLogistica[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [editingReserva, setEditingReserva] = useState<TareaLogistica | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null)
  const dataClient = createClient()
  const { toast } = useToast()
  const { isAdmin } = usePermissions()
  const canDeleteAll = isAdmin()

  /* ─── fetch ─── */
  const fetchReservas = useCallback(async () => {
    try {
      const { data, error } = await dataClient
        .from('tareas_logistica')
        .select('*')
        .ilike('tln', 'RV%')
        .order('created_at', { ascending: false })

      if (error) throw error
      if (!data?.length) { setReservas([]); return }

      // Cargar usuarios
      const userIds = new Set<string>()
      data.forEach(r => {
        if (r.solicitante_id) userIds.add(r.solicitante_id)
        if (r.creador_id) userIds.add(r.creador_id)
      })

      let usuariosMap = new Map<string, any>()
      if (userIds.size > 0) {
        const { data: usuariosData } = await dataClient
          .from('users')
          .select('id, name, email, area')
          .in('id', Array.from(userIds))
        usuariosMap = new Map((usuariosData || []).map(u => [u.id, u]))
      }

      setReservas(data.map(r => ({
        ...r,
        solicitante: r.solicitante_id ? usuariosMap.get(r.solicitante_id) : null,
      })))
    } catch (err) {
      console.error('Error fetching reservas:', err)
    } finally {
      setLoading(false)
    }
  }, [dataClient])

  useEffect(() => {
    fetchReservas()
    const channel = dataClient
      .channel('reservas-vehicle-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tareas_logistica' }, fetchReservas)
      .subscribe()
    return () => { dataClient.removeChannel(channel) }
  }, [fetchReservas, dataClient])

  /* ─── acciones ─── */
  const handleChangeEstado = async (reserva: TareaLogistica, newEstado: string) => {
    const { error } = await dataClient
      .from('tareas_logistica')
      .update({ estado: newEstado, updated_at: new Date().toISOString() })
      .eq('id', reserva.id)
    if (error) {
      toast({ title: 'Error al actualizar', description: error.message, variant: 'destructive' })
      return
    }
    await fetchReservas()
    toast({ title: `Reserva ${newEstado}`, description: `${reserva.tln} pasó a ${newEstado}.` })
  }

  const handleDelete = async (reserva: TareaLogistica) => {
    if (!confirm(`¿Eliminar la reserva ${reserva.tln}?`)) return
    const { error } = await dataClient
      .from('tareas_logistica')
      .delete()
      .eq('id', reserva.id)
    if (error) {
      toast({ title: 'Error al eliminar', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Reserva eliminada', description: `${reserva.tln} fue eliminada.` })
      await fetchReservas()
    }
  }

  const handleDrop = async (estado: string, reservaId: string) => {
    const reserva = reservas.find(r => r.id === reservaId)
    if (!reserva || reserva.estado === estado) return
    await handleChangeEstado(reserva, estado)
  }

  const byEstado = (estado: string) => reservas.filter(r => r.estado === estado)

  /* ─── render ─── */
  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Reserva de Vehículos</h1>
          <p className="text-sm text-muted-foreground">Gestión de reservas de vehículos para obras</p>
        </div>
        <Button onClick={() => setShowDialog(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nueva Reserva
        </Button>
      </div>

      {/* Kanban */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {COLUMNS.map(col => (
          <div key={col.id} className="space-y-3">
            {/* Encabezado columna */}
            <div className="flex items-center justify-between">
              <span className={`inline-flex items-center rounded-full px-3 py-0.5 text-xs font-semibold border ${col.badgeClass}`}>
                {col.label}
              </span>
              <Badge variant="secondary">{byEstado(col.id).length}</Badge>
            </div>

            {/* Drop zone */}
            <div
              className={`rounded-lg min-h-[120px] transition-colors ${
                dragOverColumn === col.id ? 'ring-2 ring-primary/60 bg-primary/5' : ''
              }`}
              onDragOver={e => e.preventDefault()}
              onDragEnter={() => setDragOverColumn(col.id)}
              onDragLeave={() => setDragOverColumn(null)}
              onDrop={e => {
                e.preventDefault()
                setDragOverColumn(null)
                const id = e.dataTransfer.getData('text/plain')
                if (id) handleDrop(col.id, id)
              }}
            >
              {byEstado(col.id).length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <Clock className="h-8 w-8 mx-auto mb-2 opacity-35" />
                  <p className="text-sm">Sin reservas</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {byEstado(col.id).map(r => (
                    <ReservaCard
                      key={r.id}
                      reserva={r}
                      col={col}
                      isDragging={draggingId === r.id}
                      canDeleteAll={canDeleteAll}
                      onChangeEstado={handleChangeEstado}
                      onDelete={handleDelete}
                      onEdit={r => setEditingReserva(r)}
                      onDragStart={id => setDraggingId(id)}
                      onDragEnd={() => setDraggingId(null)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <NewReservaDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        onSuccess={fetchReservas}
      />

      <NewReservaDialog
        open={!!editingReserva}
        onOpenChange={v => { if (!v) setEditingReserva(null) }}
        onSuccess={fetchReservas}
        reservaToEdit={editingReserva}
      />
    </div>
  )
}

/* ─── Tarjeta individual ─── */
function ReservaCard({
  reserva,
  col,
  isDragging,
  canDeleteAll,
  onChangeEstado,
  onDelete,
  onEdit,
  onDragStart,
  onDragEnd,
}: {
  reserva: TareaLogistica
  col: (typeof COLUMNS)[number]
  isDragging: boolean
  canDeleteAll: boolean
  onChangeEstado: (r: TareaLogistica, estado: string) => void
  onDelete: (r: TareaLogistica) => void
  onEdit: (r: TareaLogistica) => void
  onDragStart: (id: string) => void
  onDragEnd: () => void
}) {
  return (
    <Card
      className={`hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing ${isDragging ? 'opacity-50' : ''}`}
      draggable
      onDragStart={e => { onDragStart(reserva.id); e.dataTransfer.setData('text/plain', reserva.id) }}
      onDragEnd={onDragEnd}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-mono text-primary font-bold tracking-wide">{reserva.tln}</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${col.badgeClass}`}>
            {col.label}
          </span>
        </div>
        {reserva.titulo && (
          <CardTitle className="text-sm leading-snug mt-1">{reserva.titulo}</CardTitle>
        )}
        {reserva.descripcion && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{reserva.descripcion}</p>
        )}
      </CardHeader>

      <CardContent className="pt-0 space-y-1.5">
        {/* Solicitante */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <User className="h-3.5 w-3.5 flex-shrink-0" />
          <span>{(reserva as any).solicitante?.name || 'Sin solicitante'}</span>
        </div>

        {/* Fechas */}
        <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <Calendar className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
          <span>
            {formatDate(reserva.fecha)}
            {formatTime(reserva.fecha) ? ` · ${formatTime(reserva.fecha)}` : ''}
            {reserva.fecha_limite ? ` → ${formatDate(reserva.fecha_limite)}` : ''}
          </span>
        </div>

        {/* Vehículo */}
        {reserva.vehiculo && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Truck className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="font-medium text-foreground/80">{reserva.vehiculo}</span>
          </div>
        )}

        {/* Acciones */}
        <div className="flex flex-wrap gap-1.5 pt-2">
          {col.id === 'pendiente' && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1 border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-600 dark:text-blue-400 dark:hover:bg-blue-950"
                onClick={() => onChangeEstado(reserva, 'confirmado')}
              >
                <CheckCircle2 className="h-3 w-3" />
                Confirmar Reserva
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1"
                onClick={() => onEdit(reserva)}
              >
                <Pencil className="h-3 w-3" />
                Editar Reserva
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs gap-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => onDelete(reserva)}
              >
                <Trash2 className="h-3 w-3" />
                Borrar Reserva
              </Button>
            </>
          )}

          {col.id === 'confirmado' && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1 border-green-300 text-green-700 hover:bg-green-50 dark:border-green-600 dark:text-green-400 dark:hover:bg-green-950"
                onClick={() => onChangeEstado(reserva, 'finalizado')}
              >
                <Flag className="h-3 w-3" />
                Finalizar Reserva
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1"
                onClick={() => onEdit(reserva)}
              >
                <Pencil className="h-3 w-3" />
                Editar Reserva
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs gap-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => onDelete(reserva)}
              >
                <X className="h-3 w-3" />
                Eliminar Reserva
              </Button>
            </>
          )}

          {col.id === 'finalizado' && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs gap-1 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => onDelete(reserva)}
            >
              <Trash2 className="h-3 w-3" />
              Borrar Reserva
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

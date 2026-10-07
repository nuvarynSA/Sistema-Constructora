'use client'

import { useState, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createClient } from '@/lib/mock/client'
import { useToast } from '@/components/ui/use-toast'
import { useUser } from '@/hooks/use-user'
import type { TareaVehiculo, TareaLogistica, User } from '@/lib/types'

const VEHICULOS: TareaVehiculo[] = [
  'SAVEIRO OOQ334',
  'KANGOO AF873XB',
  'KANGOO AF873WW',
  'KANGOO AE255GY',
  'OROCH AC698OV',
  'ALASKAN AE889PT',
  'MASTER AE255GZ',
]

/* Disponibilidad de vehículos para el período seleccionado */
type VehiculoStatus = 'disponible' | 'reservado' | 'en_uso'

const STATUS_LABELS: Record<VehiculoStatus, string> = {
  disponible: 'Disponible',
  reservado:  'Reservado (pendiente)',
  en_uso:     'En uso (confirmado)',
}

const STATUS_DOT: Record<VehiculoStatus, string> = {
  disponible: 'bg-green-500',
  reservado:  'bg-yellow-400',
  en_uso:     'bg-red-500',
}

/* ─── Selector de hora con pasos de 15 min ─── */
const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const MINUTES = ['00', '15', '30', '45']

function TimeSelect({
  id,
  value,
  onChange,
}: {
  id: string
  value: string
  onChange: (v: string) => void
}) {
  const parts = value ? value.split(':') : ['', '']
  const h = parts[0] || ''
  const m = parts[1] || ''

  return (
    <div className="flex gap-2">
      <Select
        value={h}
        onValueChange={newH => onChange(`${newH}:${m || '00'}`)}
      >
        <SelectTrigger id={id} className="flex-1">
          <SelectValue placeholder="Hora" />
        </SelectTrigger>
        <SelectContent className="max-h-60">
          {HOURS.map(hr => (
            <SelectItem key={hr} value={hr}>{hr}:00 hs</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={m}
        onValueChange={newM => onChange(`${h || '08'}:${newM}`)}
      >
        <SelectTrigger className="w-28">
          <SelectValue placeholder="Min" />
        </SelectTrigger>
        <SelectContent>
          {MINUTES.map(min => (
            <SelectItem key={min} value={min}>:{min} min</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

/* ─── Helpers de tiempo ─── */
const toMinutes = (time: string): number => {
  const [h, m] = time.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

const extractTimeFromDatetime = (datetime?: string | null): string => {
  if (!datetime || !datetime.includes('T')) return ''
  const match = datetime.match(/T(\d{2}):(\d{2})/)
  if (!match) return ''
  const [, h, min] = match
  if (h === '00' && min === '00') return ''
  return `${h}:${min}`
}

/* ─── Props ─── */
interface NewReservaDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSuccess: () => void
  /** Si se pasa, el dialog opera en modo edición */
  reservaToEdit?: TareaLogistica | null
}

export function NewReservaDialog({
  open,
  onOpenChange,
  onSuccess,
  reservaToEdit,
}: NewReservaDialogProps) {
  const dataClient = createClient()
  const { user } = useUser()
  const { toast } = useToast()

  const isEditMode = !!reservaToEdit

  const [saving, setSaving] = useState(false)
  const [solicitanteId, setSolicitanteId] = useState('')
  const [fechaInicio, setFechaInicio] = useState('')
  const [horarioInicio, setHorarioInicio] = useState('')
  const [fechaFinal, setFechaFinal] = useState('')
  const [horarioFinal, setHorarioFinal] = useState('')
  const [vehiculo, setVehiculo] = useState<TareaVehiculo | ''>('')
  const [titulo, setTitulo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [usuarios, setUsuarios] = useState<User[]>([])
  const [loadingUsuarios, setLoadingUsuarios] = useState(false)
  const [vehiculoStatus, setVehiculoStatus] = useState<Record<TareaVehiculo, VehiculoStatus>>(
    Object.fromEntries(VEHICULOS.map(v => [v, 'disponible'])) as Record<TareaVehiculo, VehiculoStatus>
  )

  // Horario obligatorio + solicitante + fechas requeridos; descripcion opcional
  const disabled =
    !solicitanteId ||
    !fechaInicio ||
    !horarioInicio ||
    !fechaFinal ||
    !horarioFinal

  /* ─── Pre-llenar en modo edición ─── */
  useEffect(() => {
    if (open && reservaToEdit) {
      setSolicitanteId(reservaToEdit.solicitante_id || '')
      const sd = reservaToEdit.fecha?.split('T')[0] || ''
      const ed = reservaToEdit.fecha_limite
        ? (reservaToEdit.fecha_limite.includes('T') ? reservaToEdit.fecha_limite.split('T')[0] : reservaToEdit.fecha_limite)
        : sd
      setFechaInicio(sd)
      setFechaFinal(ed)
      const si = extractTimeFromDatetime(reservaToEdit.fecha)
      const sf = extractTimeFromDatetime(reservaToEdit.fecha_limite)
      setHorarioInicio(si || '08:00')
      setHorarioFinal(sf || '17:00')
      setVehiculo((reservaToEdit.vehiculo as TareaVehiculo) || '')
      setTitulo(reservaToEdit.titulo || '')
      setDescripcion(reservaToEdit.descripcion || '')
    }
  }, [open, reservaToEdit])

  /* ─── cargar usuarios ─── */
  const fetchUsuarios = useCallback(async () => {
    setLoadingUsuarios(true)
    try {
      const { data, error } = await dataClient
        .from('users')
        .select('id, name, email, area, role_id, avatar, status, created_at, updated_at')
        .eq('status', 'Activo')
        .order('name')
      if (error) throw error
      setUsuarios((data || []) as User[])
    } catch {
      toast({ title: 'Error', description: 'No se pudieron cargar los usuarios', variant: 'destructive' })
    } finally {
      setLoadingUsuarios(false)
    }
  }, [dataClient, toast])

  useEffect(() => {
    if (open) fetchUsuarios()
  }, [open, fetchUsuarios])

  /* ─── calcular disponibilidad con buffer de 15 min ─── */
  const checkVehiculoAvailability = useCallback(async () => {
    if (!fechaInicio || !horarioInicio || !fechaFinal || !horarioFinal) {
      setVehiculoStatus(Object.fromEntries(VEHICULOS.map(v => [v, 'disponible'])) as Record<TareaVehiculo, VehiculoStatus>)
      return
    }

    try {
      const BUFFER_MS = 15 * 60 * 1000 // 15 min en milisegundos
      const newStart = new Date(`${fechaInicio}T${horarioInicio}:00`)
      const newEnd   = new Date(`${fechaFinal}T${horarioFinal}:00`)

      const { data } = await dataClient
        .from('tareas_logistica')
        .select('id, vehiculo, estado, fecha, fecha_limite')
        .ilike('tln', 'RV%')
        .in('estado', ['pendiente', 'confirmado'])

      const confirmedSet = new Set<string>()
      const pendienteSet = new Set<string>()

      ;(data || []).forEach(r => {
        // En modo edición, saltar la propia reserva
        if (isEditMode && reservaToEdit && r.id === reservaToEdit.id) return
        if (!r.vehiculo || !r.fecha) return

        const existStart = new Date(r.fecha)
        const existEnd   = r.fecha_limite
          ? (r.fecha_limite.includes('T') ? new Date(r.fecha_limite) : new Date(`${r.fecha_limite}T23:59:59`))
          : new Date(existStart.getTime() + 2 * 60 * 60 * 1000)

        // Aplicar buffer de 15 min a los límites existentes
        const bufferedStart = new Date(existStart.getTime() - BUFFER_MS)
        const bufferedEnd   = new Date(existEnd.getTime()   + BUFFER_MS)

        // Verificar solapamiento
        if (newStart < bufferedEnd && newEnd > bufferedStart) {
          if (r.estado === 'confirmado') confirmedSet.add(r.vehiculo)
          else if (r.estado === 'pendiente') pendienteSet.add(r.vehiculo)
        }
      })

      const next: Record<TareaVehiculo, VehiculoStatus> = {} as Record<TareaVehiculo, VehiculoStatus>
      VEHICULOS.forEach(v => {
        if (confirmedSet.has(v))  next[v] = 'en_uso'
        else if (pendienteSet.has(v)) next[v] = 'reservado'
        else next[v] = 'disponible'
      })
      setVehiculoStatus(next)
    } catch {
      // silencioso
    }
  }, [dataClient, fechaInicio, horarioInicio, fechaFinal, horarioFinal, isEditMode, reservaToEdit])

  useEffect(() => {
    checkVehiculoAvailability()
  }, [checkVehiculoAvailability])

  /* ─── generar número de RV ─── */
  const generateNextRV = async (): Promise<string> => {
    const { data } = await dataClient
      .from('tareas_logistica')
      .select('tln')
      .ilike('tln', 'RV%')
      .order('created_at', { ascending: false })
      .limit(1)
    const last    = (data?.[0]?.tln as string) || ''
    const lastNum = parseInt(last.replace(/[^0-9]/g, '')) || 0
    return `RVNº${String(lastNum + 1).padStart(2, '0')}`
  }

  /* ─── verificar conflicto con reservas CONFIRMADAS + buffer 15 min ─── */
  const checkConflict = async (vehiculoSelected: string): Promise<{ conflict: boolean; rvConflict?: string }> => {
    if (!vehiculoSelected || !fechaInicio || !fechaFinal || !horarioInicio || !horarioFinal)
      return { conflict: false }

    const BUFFER_MS = 15 * 60 * 1000
    const newStart  = new Date(`${fechaInicio}T${horarioInicio}:00`)
    const newEnd    = new Date(`${fechaFinal}T${horarioFinal}:00`)

    const { data } = await dataClient
      .from('tareas_logistica')
      .select('id, tln, fecha, fecha_limite')
      .ilike('tln', 'RV%')
      .eq('estado', 'confirmado')
      .eq('vehiculo', vehiculoSelected)

    const conflicting = (data || []).find(r => {
      // En modo edición, saltar la propia reserva
      if (isEditMode && reservaToEdit && r.id === reservaToEdit.id) return false
      if (!r.fecha) return false

      const existStart = new Date(r.fecha)
      const existEnd   = r.fecha_limite
        ? (r.fecha_limite.includes('T') ? new Date(r.fecha_limite) : new Date(`${r.fecha_limite}T23:59:59`))
        : new Date(existStart.getTime() + 2 * 60 * 60 * 1000)

      const bufferedStart = new Date(existStart.getTime() - BUFFER_MS)
      const bufferedEnd   = new Date(existEnd.getTime()   + BUFFER_MS)

      return newStart < bufferedEnd && newEnd > bufferedStart
    })

    return { conflict: !!conflicting, rvConflict: conflicting?.tln }
  }

  /* ─── guardar ─── */
  const handleSave = async () => {
    if (disabled) return
    setSaving(true)
    try {
      if (vehiculo) {
        const { conflict, rvConflict } = await checkConflict(vehiculo)
        if (conflict) {
          toast({
            title: 'Conflicto de disponibilidad',
            description: `El vehículo ${vehiculo} tiene una reserva confirmada (${rvConflict}) en ese horario (incluyendo 15 min de margen). Elegí otro vehículo o cambiá el horario.`,
            variant: 'destructive',
          })
          setSaving(false)
          return
        }
      }

      const fechaDB        = `${fechaInicio}T${horarioInicio}:00`
      const fechaLimiteDB  = `${fechaFinal}T${horarioFinal}:00`

      if (isEditMode && reservaToEdit) {
        /* ── EDICIÓN ── */
        const { error } = await dataClient
          .from('tareas_logistica')
          .update({
            titulo:         titulo || null,
            descripcion:    descripcion || '',
            solicitante_id: solicitanteId,
            fecha:          fechaDB,
            fecha_limite:   fechaLimiteDB,
            vehiculo:       vehiculo || null,
            updated_at:     new Date().toISOString(),
          })
          .eq('id', reservaToEdit.id)
        if (error) throw error
        toast({ title: 'Reserva actualizada', description: `${reservaToEdit.tln} actualizada correctamente.` })
      } else {
        /* ── CREACIÓN ── */
        const rv     = await generateNextRV()
        const now    = new Date().toISOString()
        const taskId = crypto.randomUUID()

        const { error } = await dataClient.from('tareas_logistica').insert({
          id:             taskId,
          tln:            rv,
          titulo:         titulo || null,
          tipo:           'RESERVA',
          descripcion:    descripcion || '',
          solicitante_id: solicitanteId,
          creador_id:     user?.id || null,
          fecha:          fechaDB,
          fecha_limite:   fechaLimiteDB,
          vehiculo:       vehiculo || null,
          estado:         'pendiente',
          prioridad:      'Media',
          created_at:     now,
          updated_at:     now,
        })
        if (error) throw error

        // Notificar área de logística
        try {
          const { notifyLogisticaArea } = await import('@/lib/notifications')
          await notifyLogisticaArea({
            title:         'Nueva reserva de vehículo',
            message:       `Se creó la reserva ${rv}${vehiculo ? ` para el vehículo ${vehiculo}` : ''}.`,
            type:          'new_task',
            referenceId:   taskId,
            referenceType: 'tarea',
            excludeUserId: user?.id,
          })
        } catch { /* silencioso */ }

        // Subir archivos si hay
        if (files.length > 0) {
          for (const file of files) {
            try {
              const fd = new FormData()
              fd.append('content', '')
              fd.append('file', file)
              await fetch(`/api/tareas/${taskId}/comentario`, { method: 'POST', body: fd })
            } catch { /* silencioso */ }
          }
        }

        toast({ title: 'Reserva creada', description: `${rv} creada correctamente.` })
      }

      resetForm()
      onOpenChange(false)
      onSuccess()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido'
      toast({ title: isEditMode ? 'Error al editar' : 'Error al crear reserva', description: msg, variant: 'destructive' })
    }
    setSaving(false)
  }

  const resetForm = () => {
    setSolicitanteId('')
    setFechaInicio('')
    setHorarioInicio('')
    setFechaFinal('')
    setHorarioFinal('')
    setVehiculo('')
    setTitulo('')
    setDescripcion('')
    setFiles([])
  }

  const handleAddFiles = (selected: File[]) => {
    const allowed = ['.xlsx', '.xls', '.pdf', '.csv', '.png', '.jpg', '.jpeg', '.doc', '.docx']
    const valid = selected.filter(f => {
      const ext = '.' + f.name.split('.').pop()?.toLowerCase()
      if (!allowed.includes(ext)) {
        toast({ title: 'Tipo no permitido', description: `${f.name} no está permitido.`, variant: 'destructive' })
        return false
      }
      if (f.size > 50 * 1024 * 1024) {
        toast({ title: 'Archivo grande', description: `${f.name} supera 50 MB.`, variant: 'destructive' })
        return false
      }
      return true
    })
    if (valid.length) setFiles(prev => [...prev, ...valid])
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) resetForm(); onOpenChange(v) }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditMode ? `Editar Reserva — ${reservaToEdit?.tln}` : 'Nueva Reserva'}</DialogTitle>
        </DialogHeader>

        <form className="grid gap-4" onSubmit={e => { e.preventDefault(); handleSave() }}>

          {/* Solicitante */}
          <div>
            <Label htmlFor="rv-solicitante">Nombre del Solicitante *</Label>
            <Select value={solicitanteId} onValueChange={setSolicitanteId}>
              <SelectTrigger id="rv-solicitante">
                <SelectValue placeholder="Selecciona un solicitante" />
              </SelectTrigger>
              <SelectContent>
                {loadingUsuarios && <div className="px-3 py-2 text-sm text-muted-foreground">Cargando...</div>}
                {!loadingUsuarios && usuarios.length === 0 && (
                  <div className="px-3 py-2 text-sm text-muted-foreground">No hay usuarios disponibles.</div>
                )}
                {usuarios.map(u => (
                  <SelectItem key={u.id} value={u.id}>{u.name} — {u.area}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Fecha Inicio */}
          <div>
            <Label htmlFor="rv-fecha-inicio">Fecha Inicio *</Label>
            <Input
              id="rv-fecha-inicio"
              type="date"
              value={fechaInicio}
              onChange={e => setFechaInicio(e.target.value)}
            />
          </div>

          {/* Horario Inicio */}
          <div>
            <Label htmlFor="rv-horario-inicio">Horario Inicio *</Label>
            <TimeSelect id="rv-horario-inicio" value={horarioInicio} onChange={setHorarioInicio} />
          </div>

          {/* Fecha Final */}
          <div>
            <Label htmlFor="rv-fecha-final">Fecha Final *</Label>
            <Input
              id="rv-fecha-final"
              type="date"
              value={fechaFinal}
              onChange={e => setFechaFinal(e.target.value)}
              min={fechaInicio}
            />
          </div>

          {/* Horario Final */}
          <div>
            <Label htmlFor="rv-horario-final">Horario Final *</Label>
            <TimeSelect id="rv-horario-final" value={horarioFinal} onChange={setHorarioFinal} />
          </div>

          {/* Vehículo con indicadores de disponibilidad */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label htmlFor="rv-vehiculo">Vehículo a Elegir</Label>
              {(fechaInicio && horarioInicio && fechaFinal && horarioFinal) && (
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-green-500 inline-block" />Disponible
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-yellow-400 inline-block" />Pendiente
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-red-500 inline-block" />En uso
                  </span>
                </div>
              )}
            </div>
            <Select value={vehiculo} onValueChange={v => setVehiculo(v as TareaVehiculo)}>
              <SelectTrigger id="rv-vehiculo">
                <SelectValue placeholder="Selecciona un vehículo (opcional)" />
              </SelectTrigger>
              <SelectContent>
                {VEHICULOS.map(v => {
                  const status  = vehiculoStatus[v] ?? 'disponible'
                  const [tipo, patente] = v.split(' ')
                  return (
                    <SelectItem
                      key={v}
                      value={v}
                      disabled={status === 'en_uso'}
                    >
                      <span className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full flex-shrink-0 ${STATUS_DOT[status]}`} />
                        <span className="font-medium">{tipo}</span>
                        <span className="text-muted-foreground text-xs">— {patente}</span>
                        {status !== 'disponible' && (
                          <span className="text-xs text-muted-foreground ml-1">({STATUS_LABELS[status]})</span>
                        )}
                      </span>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
            {vehiculo && vehiculoStatus[vehiculo as TareaVehiculo] === 'reservado' && (
              <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                ⚠ Este vehículo tiene una reserva pendiente en ese horario. Podés confirmar igual, pero entrará en conflicto si la otra reserva se confirma primero.
              </p>
            )}
          </div>

          {/* Título */}
          <div>
            <Label htmlFor="rv-titulo">Título</Label>
            <Input
              id="rv-titulo"
              value={titulo}
              onChange={e => setTitulo(e.target.value)}
              placeholder="Título de la reserva (opcional)"
            />
          </div>

          {/* Descripción (opcional) */}
          <div>
            <Label htmlFor="rv-descripcion">Descripción</Label>
            <Input
              id="rv-descripcion"
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
              placeholder="Descripción del motivo de la reserva (opcional)"
            />
          </div>

          {/* Archivos (solo en modo creación) */}
          {!isEditMode && (
            <div>
              <Label htmlFor="rv-archivos">Archivos adjuntos</Label>
              <Input
                id="rv-archivos"
                type="file"
                multiple
                accept=".xlsx,.xls,.pdf,.csv,.png,.jpg,.jpeg,.doc,.docx"
                onChange={e => handleAddFiles(Array.from(e.target.files || []))}
              />
              {files.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {files.map((file, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 bg-background border rounded-md text-sm">
                      <span className="truncate max-w-[200px]">{file.name}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        type="button"
                        onClick={() => setFiles(files.filter((_, i) => i !== idx))}
                      >
                        Quitar
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Acciones */}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => { resetForm(); onOpenChange(false) }}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving || disabled}>
              {saving
                ? (isEditMode ? 'Guardando...' : 'Creando...')
                : (isEditMode ? 'Guardar cambios' : 'Crear Reserva')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

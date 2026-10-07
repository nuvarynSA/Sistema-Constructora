'use client'

import { useState, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createClient } from '@/lib/mock/client'
import { useToast } from '@/components/ui/use-toast'
import { useUser } from '@/hooks/use-user'
import type { TareaVehiculo, User } from '@/lib/types'
import { useFormCache } from '@/hooks/use-form-cache'

function traducirErrorRed(error: unknown): string {
  if (!(error instanceof Error)) return 'Error desconocido'
  const msg = error.message.toLowerCase()
  if (error.name === 'AbortError') return 'La subida fue cancelada'
  if (msg.includes('failed to fetch') || msg.includes('network request failed') || msg.includes('networkerror')) {
    return 'Sin conexión al servidor. Verificá tu conexión a internet.'
  }
  if (msg.includes('timeout') || msg.includes('timed out')) {
    return 'La conexión tardó demasiado. Intentá de nuevo.'
  }
  return 'No se pudo conectar al servidor'
}

const usuariosCacheKey = 'nexora:usuarios:cache:activos:v1'
const usuariosCacheTtlMs = 1000 * 60 * 30

const readUsuariosCache = () => {
  if (typeof window === 'undefined') return null
  const cached = window.localStorage.getItem(usuariosCacheKey)
  if (!cached) return null
  try {
    const parsed = JSON.parse(cached) as { data?: User[]; timestamp?: number }
    if (!Array.isArray(parsed?.data)) return null
    const age = parsed.timestamp ? Date.now() - parsed.timestamp : Number.POSITIVE_INFINITY
    return { data: parsed.data, isStale: age > usuariosCacheTtlMs }
  } catch {
    return null
  }
}

const writeUsuariosCache = (data: User[]) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(
    usuariosCacheKey,
    JSON.stringify({ data, timestamp: Date.now() })
  )
}

interface NewTaskDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSuccess: () => void
}

const composeFechaConHorario = (fecha: string, horario?: string) => {
  if (!horario) return `${fecha}T00:00:00`
  return `${fecha}T${horario}:00`
}

export function NewTaskDialog({ open, onOpenChange, onSuccess }: NewTaskDialogProps) {
  const dataClient = createClient()
  const { user } = useUser()
  const [saving, setSaving] = useState(false)
  const [solicitanteId, setSolicitanteId] = useState('')
  const [fechaInicio, setFechaInicio] = useState('')
  const [horario, setHorario] = useState('')
  const [fechaFinal, setFechaFinal] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [titulo, setTitulo] = useState('')
  const [tipo, setTipo] = useState('')
  const [prioridad, setPrioridad] = useState('Media')
  const [vehiculo, setVehiculo] = useState<TareaVehiculo | ''>('')
  const [files, setFiles] = useState<File[]>([])
  const [uploadingFiles, setUploadingFiles] = useState(false)
  const [usuarios, setUsuarios] = useState<User[]>([])
  const [loadingUsuarios, setLoadingUsuarios] = useState(false)
  const { toast } = useToast()

  const fetchUsuarios = useCallback(async () => {
    setLoadingUsuarios(true)
    try {
      const { data, error } = await dataClient
        .from('users')
        .select('id, name, email, area, role_id, avatar, status, created_at, updated_at')
        .eq('status', 'Activo')
        .order('name')

      if (error) throw error
      const next = (data || []) as User[]
      setUsuarios(next)
      writeUsuariosCache(next)
    } catch (error) {
      console.error('Error fetching usuarios:', error)
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los usuarios',
        variant: 'destructive'
      })
    } finally {
      setLoadingUsuarios(false)
    }
  }, [dataClient, toast])

  useEffect(() => {
    if (!open) return

    const cached = readUsuariosCache()
    if (cached?.data?.length) {
      setUsuarios(cached.data)
    }
    if (!cached?.data?.length || cached.isStale) {
      fetchUsuarios()
    }
  }, [open, fetchUsuarios])

  const draftKey = `nexora:logistica:tarea:nueva:${user?.id || 'anon'}`
  const { clear: clearDraft } = useFormCache({
    key: draftKey,
    value: { solicitanteId, fechaInicio, horario, fechaFinal, descripcion, titulo, tipo, prioridad, vehiculo },
    setValue: (next) => {
      const value = typeof next === 'function' ? next({
        solicitanteId,
        fechaInicio,
        horario,
        fechaFinal,
        descripcion,
        titulo,
        tipo,
        prioridad,
        vehiculo,
      }) : next
      if (!value) return
      setSolicitanteId(value.solicitanteId || '')
      setFechaInicio(value.fechaInicio || '')
      setHorario(value.horario || '')
      setFechaFinal(value.fechaFinal || '')
      setDescripcion(value.descripcion || '')
      setTitulo(value.titulo || '')
      setTipo(value.tipo || '')
      setPrioridad(value.prioridad || 'Media')
      setVehiculo((value.vehiculo as TareaVehiculo) || '')
    },
    enabled: open,
  })

  const disabled = !solicitanteId || !fechaInicio || !fechaFinal || !descripcion

  const shouldBeProgramada = () => {
    if (!fechaInicio) return false
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const start = new Date(fechaInicio)
    start.setHours(0, 0, 0, 0)
    const diffFromToday = Math.ceil((start.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    if (diffFromToday >= 3) return true
    if (fechaFinal) {
      const end = new Date(fechaFinal)
      end.setHours(0, 0, 0, 0)
      const duration = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
      if (duration > 2) return true
    }
    return false
  }

  const generateNextTLN = async (): Promise<string> => {
    const { data } = await dataClient
      .from('tareas_logistica')
      .select('tln')
      .order('created_at', { ascending: false })
      .limit(1)
    const last = (data?.[0]?.tln as string) || ''
    const lastNum = parseInt(last.replace(/[^0-9]/g, '')) || 0
    const next = lastNum + 1
    return `TLNº${String(next).padStart(2, '0')}`
  }

  const handleSave = async () => {
    if (disabled) return
    setSaving(true)
    try {
      const tln = await generateNextTLN()
      const now = new Date().toISOString()
      const taskId = crypto.randomUUID()
      const { error } = await dataClient.from('tareas_logistica').insert({
        id: taskId,
        tln,
        titulo: titulo || null,
        tipo: tipo || null,
        descripcion,
        solicitante_id: solicitanteId,
        creador_id: user?.id || null,
        fecha: composeFechaConHorario(fechaInicio, horario),
        fecha_limite: fechaFinal || null,
        vehiculo: vehiculo || null,
        estado: shouldBeProgramada() ? 'programada' : 'solicitud',
        prioridad: prioridad,
        created_at: now,
        updated_at: now,
      })
      if (error) throw error

      // Notificar al área de logística sobre nueva tarea
      const { notifyLogisticaArea } = await import('@/lib/notifications')
      await notifyLogisticaArea({
        title: 'Nueva tarea en Logística',
        message: `Tenés una nueva tarea asignada en el módulo de Logística.`,
        type: 'new_task',
        referenceId: taskId,
        referenceType: 'tarea',
        excludeUserId: user?.id,
      })

      if (files.length > 0) {
        setUploadingFiles(true)
        const uploadErrors: string[] = []
        try {
          for (const file of files) {
            try {
              const fileFormData = new FormData()
              fileFormData.append('content', '')
              fileFormData.append('file', file)

              const response = await fetch(`/api/tareas/${taskId}/comentario`, {
                method: 'POST',
                body: fileFormData,
              })

              if (!response.ok) {
                let errorMsg = 'Error al subir archivo'
                try {
                  const errData = await response.json()
                  errorMsg = errData.error || errData.details || errorMsg
                } catch {}
                uploadErrors.push(`${file.name}: ${errorMsg}`)
              }
            } catch (fileErr) {
              uploadErrors.push(`${file.name}: ${traducirErrorRed(fileErr)}`)
              console.error(`Error subiendo ${file.name}:`, fileErr)
            }
          }
        } finally {
          setUploadingFiles(false)
        }

        if (uploadErrors.length > 0) {
          toast({
            title: 'Archivos no subidos',
            description: `La tarea se creó pero ${uploadErrors.length} archivo(s) no se pudieron subir: ${uploadErrors.join('; ')}`,
            variant: 'destructive',
          })
        }
      }

      toast({ title: 'Tarea creada', description: `${tln} creada correctamente` })
      
      // Limpiar formulario
      setSolicitanteId('')
      setFechaInicio('')
      setHorario('')
      setFechaFinal('')
      setDescripcion('')
      setTitulo('')
      setTipo('')
      setPrioridad('Media')
      setVehiculo('')
      setFiles([])
      clearDraft()
      
      // Cerrar diálogo y refrescar lista
      onOpenChange(false)
      onSuccess()
    } catch (err: any) {
      toast({ title: 'Error al crear tarea', description: err?.message || 'Revisa permisos y estructura de tabla', variant: 'destructive' })
    }
    setSaving(false)
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    event.stopPropagation()
    handleSave()
  }

  const handleAddFiles = (selected: File[]) => {
    const validFiles = selected.filter((file) => {
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
    setFiles((prev) => [...prev, ...validFiles])
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva Tarea</DialogTitle>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div>
            <Label htmlFor="new-task-solicitante">Nombre del Solicitante *</Label>
            <Select value={solicitanteId} onValueChange={setSolicitanteId}>
              <SelectTrigger id="new-task-solicitante">
                <SelectValue placeholder="Selecciona un solicitante" />
              </SelectTrigger>
              <SelectContent>
                {loadingUsuarios && usuarios.length === 0 && (
                  <div className="px-3 py-2 text-sm text-muted-foreground">Cargando solicitantes...</div>
                )}
                {loadingUsuarios && usuarios.length > 0 && (
                  <div className="px-3 py-2 text-sm text-muted-foreground">Actualizando solicitantes...</div>
                )}
                {!loadingUsuarios && usuarios.length === 0 && (
                  <div className="px-3 py-2 text-sm text-muted-foreground">No hay solicitantes disponibles.</div>
                )}
                {usuarios.map((usuario) => (
                  <SelectItem key={usuario.id} value={usuario.id}>
                    {usuario.name} - {usuario.area}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="new-task-fecha-inicio">Fecha Inicio *</Label>
            <Input
              id="new-task-fecha-inicio"
              name="fechaInicio"
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="new-task-horario">Horario (Opcional)</Label>
            <Input
              id="new-task-horario"
              name="horario"
              type="time"
              value={horario}
              onChange={(e) => setHorario(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="new-task-fecha-final">Fecha Final *</Label>
            <Input
              id="new-task-fecha-final"
              name="fechaFinal"
              type="date"
              value={fechaFinal}
              onChange={(e) => setFechaFinal(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="new-task-vehiculo">Vehículo a Elegir</Label>
            <Select value={vehiculo} onValueChange={(v) => setVehiculo(v as TareaVehiculo)}>
              <SelectTrigger id="new-task-vehiculo">
                <SelectValue placeholder="Selecciona un vehículo (opcional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SAVEIRO OOQ334">SAVEIRO — OOQ334</SelectItem>
                <SelectItem value="KANGOO AF873XB">KANGOO — AF873XB</SelectItem>
                <SelectItem value="KANGOO AF873WW">KANGOO — AF873WW</SelectItem>
                <SelectItem value="KANGOO AE255GY">KANGOO — AE255GY</SelectItem>
                <SelectItem value="OROCH AC698OV">OROCH — AC698OV</SelectItem>
                <SelectItem value="ALASKAN AE889PT">ALASKAN — AE889PT</SelectItem>
                <SelectItem value="MASTER AE255GZ">MASTER — AE255GZ</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="new-task-titulo">Título</Label>
            <Input
              id="new-task-titulo"
              name="titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Título de la tarea (opcional)"
            />
          </div>
          <div>
            <Label htmlFor="new-task-prioridad">Prioridad *</Label>
            <Select value={prioridad} onValueChange={setPrioridad}>
              <SelectTrigger id="new-task-prioridad">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Alta">Alta</SelectItem>
                <SelectItem value="Media">Media</SelectItem>
                <SelectItem value="Baja">Baja</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="new-task-descripcion">Descripción *</Label>
            <Input
              id="new-task-descripcion"
              name="descripcion"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Describe la tarea..."
            />
          </div>
          <div>
            <Label htmlFor="new-task-archivos">Archivos adjuntos</Label>
            <Input
              id="new-task-archivos"
              name="archivos"
              type="file"
              multiple
              accept=".xlsx,.xls,.pdf,.csv,.png,.jpg,.jpeg,.doc,.docx"
              onChange={(event) => handleAddFiles(Array.from(event.target.files || []))}
            />
            {files.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {files.map((file, index) => (
                  <div key={`${file.name}-${index}`} className="flex items-center gap-2 p-2 bg-background border rounded-md text-sm">
                    <span className="truncate max-w-[200px]">{file.name}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setFiles(files.filter((_, i) => i !== index))}
                    >
                      Quitar
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving || uploadingFiles}>Cancelar</Button>
            <Button type="submit" onClick={handleSubmit} disabled={saving || uploadingFiles || disabled}>
              {saving || uploadingFiles ? 'Guardando...' : 'Crear Tarea'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

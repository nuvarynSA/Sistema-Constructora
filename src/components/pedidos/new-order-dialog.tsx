'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/mock/client'
import { useAuth } from '@/hooks/use-auth'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, X, FileText } from 'lucide-react'
import { useFormCache } from '@/hooks/use-form-cache'

interface NewOrderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

const RQI_MAX_INSERT_RETRIES = 8

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

export function NewOrderDialog({ open, onOpenChange, onSuccess }: NewOrderDialogProps) {
  const { userData, ensureUserData } = useAuth()
  const { toast } = useToast()
  const dataClient = createClient()
  const [loading, setLoading] = useState(false)
  const [obras, setObras] = useState<any[]>([])
  const [materialFiles, setMaterialFiles] = useState<File[]>([])
  const [uploadingFiles, setUploadingFiles] = useState(false)
  const obrasCacheKey = 'nexora:obras:cache'
  const obrasCacheTtlMs = 1000 * 60 * 30

  const [formData, setFormData] = useState({
    montoEstimado: '',
    fechaNecesidad: '',
    prioridad: 'Media',
    areaSolicitud: userData?.area || '',
    detalleMateriales: '',
  })
  const [obraRows, setObraRows] = useState<Array<{
    id: string
    obraId: string
    obra: string
    imputacion: string
    subrubro: string
  }>>([{ id: 'row-1', obraId: '', obra: '', imputacion: '001', subrubro: '' }])

  const draftKey = `nexora:pedidos:nuevo:${userData?.id || 'anon'}`
  const { clear: clearDraft } = useFormCache({
    key: draftKey,
    value: { ...formData, obraRows },
    setValue: (next) => {
      const value = typeof next === 'function' ? next({ ...formData, obraRows }) : next
      if (!value) return
      setFormData({
        montoEstimado: value.montoEstimado || '',
        fechaNecesidad: value.fechaNecesidad || '',
        prioridad: value.prioridad || 'Media',
        areaSolicitud: value.areaSolicitud || userData?.area || '',
        detalleMateriales: value.detalleMateriales || '',
      })
      if (Array.isArray(value.obraRows) && value.obraRows.length > 0) {
        setObraRows(value.obraRows.map((row: any, index: number) => ({
          id: row.id || `row-${index + 1}`,
          obraId: row.obraId || '',
          obra: row.obra || '',
          imputacion: '001',
          subrubro: row.subrubro || '',
        })))
      }
    },
    enabled: open,
  })

  const obraOptions = useMemo(() => obras, [obras])

  const readObrasCache = () => {
    if (typeof window === 'undefined') return null
    const cached = window.localStorage.getItem(obrasCacheKey)
    if (!cached) return null
    try {
      const parsed = JSON.parse(cached) as { data?: any[]; timestamp?: number }
      if (!Array.isArray(parsed?.data)) return null
      const age = parsed.timestamp ? Date.now() - parsed.timestamp : Number.POSITIVE_INFINITY
      return {
        data: parsed.data,
        isStale: age > obrasCacheTtlMs,
      }
    } catch {
      return null
    }
  }

  const writeObrasCache = (data: any[]) => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(
      obrasCacheKey,
      JSON.stringify({ data, timestamp: Date.now() })
    )
  }

  useEffect(() => {
    if (!open) return
    const cached = readObrasCache()
    if (cached?.data?.length) {
      setObras(cached.data)
    }
    if (!cached?.data?.length || cached.isStale) {
      fetchObras()
    }
  }, [open])

  useEffect(() => {
    if (open && !userData) {
      ensureUserData()
    }
  }, [open, userData, ensureUserData])

  const fetchObras = async () => {
    const { data, error } = await dataClient
      .from('obras')
      .select('*')
      .order('nombre')

    if (error) {
      console.error('Error fetching obras:', error)
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las obras disponibles.',
        variant: 'destructive',
      })
      return
    }

    const next = data || []
    setObras(next)
    writeObrasCache(next)
  }

  const generateRQI = async () => {
    // Generate RQI in format RQI-YYYY-XXX based on max numeric suffix for the current year.
    const year = new Date().getFullYear()
    const prefix = `RQI-${year}-`
    const { data, error } = await dataClient
      .from('orders')
      .select('rqi')
      .ilike('rqi', `${prefix}%`)

    if (error) throw error

    const nextNumber = ((data || []).reduce((max, order) => {
      if (!order?.rqi || typeof order.rqi !== 'string' || !order.rqi.startsWith(prefix)) {
        return max
      }

      const parsed = Number.parseInt(order.rqi.slice(prefix.length), 10)
      if (Number.isNaN(parsed)) return max
      return Math.max(max, parsed)
    }, 0) + 1)

    return `${prefix}${nextNumber.toString().padStart(3, '0')}`
  }

  const isRQIConflictError = (error: unknown) => {
    if (!error || typeof error !== 'object') return false
    const pgError = error as { code?: string; message?: string }

    return pgError.code === '23505' && (pgError.message?.includes('orders_rqi_key') ?? false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    let activeUser = userData
    if (!activeUser) {
      activeUser = await ensureUserData()
    }
    if (!activeUser) {
      toast({
        title: 'Sesión no disponible',
        description: 'Tu sesión expiró o no se pudo validar. Recargá la página e intentá de nuevo.',
        variant: 'destructive',
      })
      return
    }
    if (
      !obraRows.length ||
      (!obraRows[0].obraId && !obraRows[0].obra) ||
      (obraRows[0].obraId === 'otra' && !obraRows[0].obra.trim())
    ) {
      toast({
        title: 'Campos requeridos',
        description: 'Seleccioná al menos una obra/proyecto',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)

    try {
      const now = new Date().toISOString()
      const orderId = crypto.randomUUID()
      const primaryRow = obraRows[0]
      const primaryObraId = primaryRow?.obraId === 'otra' ? '' : primaryRow?.obraId || ''
      const primaryObraName = primaryRow?.obraId === 'otra' ? primaryRow?.obra : (obras.find(o => o.id === primaryRow?.obraId)?.nombre || '')
      const obraProyectos = obraRows.map((row) => ({
        obraId: row.obraId === 'otra' ? null : row.obraId,
        obra: row.obraId === 'otra' ? row.obra : (obras.find(o => o.id === row.obraId)?.nombre || row.obra),
        imputacion: '001',
        subrubro: row.subrubro || '',
      }))

      const baseOrderPayload = {
        id: orderId,
        obra: primaryObraName || primaryRow?.obraId || '',
        obra_id: primaryObraId || null,
        obra_proyecto1: primaryRow?.imputacion || '001',
        obra_proyecto2: primaryRow?.subrubro || null,
        obra_proyectos: obraProyectos,
        monto_estimado: formData.montoEstimado ? parseFloat(formData.montoEstimado) : null,
        tipo_entrega: 'Recibir',
        solicitante_id: activeUser.id,
        fecha_necesidad: formData.fechaNecesidad,
        prioridad: formData.prioridad,
        area_solicitud: formData.areaSolicitud,
        lugar_entrega: '',
        detalle_materiales: formData.detalleMateriales,
        estado: 'Pendiente',
        estado_detallado: 'Pendiente',
        estado_entrega: 'Pendiente',
        current_area: 'solicitados',
        created_at: now,
        updated_at: now,
      }

      let rqi = ''
      let insertError: unknown = null

      for (let attempt = 1; attempt <= RQI_MAX_INSERT_RETRIES; attempt += 1) {
        rqi = await generateRQI()
        const { error } = await dataClient.from('orders').insert({
          ...baseOrderPayload,
          rqi,
        })

        if (!error) {
          insertError = null
          break
        }

        if (isRQIConflictError(error) && attempt < RQI_MAX_INSERT_RETRIES) {
          await new Promise((resolve) => setTimeout(resolve, 75 * attempt))
          continue
        }

        insertError = error
        break
      }

      if (insertError) throw insertError

      // Create initial history entry
      await dataClient.from('order_histories').insert({
        order_id: orderId,
        usuario_id: activeUser.id,
        accion: `${activeUser.name} creó el pedido`,
        tipo: 'creacion',
      })

      // Notificar al área de compras y al creador
      const { notifyComprasArea, notifyOrderCreatorEvent } = await import('@/lib/notifications')
      await Promise.all([
        notifyComprasArea({
          title: 'Nueva RQI disponible',
          message: `Nueva RQI disponible en Solicitados. Ya podés avanzar con el proceso de compras.`,
          type: 'new_rqi',
          referenceId: orderId,
          referenceType: 'order',
          excludeUserId: activeUser.id,
        }),
        notifyOrderCreatorEvent({
          orderId,
          solicitanteId: activeUser.id,
          actorId: activeUser.id,
          title: 'RQI creada',
          message: `El pedido ${rqi} fue creado. Te avisaremos de los cambios.`,
          type: 'order_created',
          referenceType: 'order',
          skipIfActorIsCreator: false,
        }),
      ])

      // Verificar si esta RQI está próxima a su fecha estimada
      const { checkRQIApproachingDate } = await import('@/lib/notifications/check-dates')
      await checkRQIApproachingDate(orderId)

      toast({
        title: '¡Pedido creado!',
        description: `El pedido ${rqi} ha sido creado exitosamente.`,
      })

      // Upload material files if any
      if (materialFiles.length > 0) {
        setUploadingFiles(true)
        const uploadErrors: string[] = []
        try {
          for (const file of materialFiles) {
            try {
              const fileFormData = new FormData()
              fileFormData.append('file', file)

              const response = await fetch(`/api/orders/${orderId}/descripcion`, {
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
            description: `El pedido se creó pero ${uploadErrors.length} archivo(s) no se pudieron subir: ${uploadErrors.join('; ')}`,
            variant: 'destructive',
          })
        }
      }

      onSuccess()
      
      // Reset form
      setFormData({
        montoEstimado: '',
        fechaNecesidad: '',
        prioridad: 'Media',
        areaSolicitud: activeUser?.area || '',
        detalleMateriales: '',
      })
      setObraRows([{ id: 'row-1', obraId: '', obra: '', imputacion: '001', subrubro: '' }])
      setMaterialFiles([])
      clearDraft()
    } catch (error) {
      console.error('Error creating order:', error)
      const isConflict = isRQIConflictError(error)
      toast({
        title: 'Error',
        description: isConflict
          ? 'Hubo un conflicto al generar el número de RQI. Intentá nuevamente.'
          : 'No se pudo crear el pedido. Por favor, intenta nuevamente.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuevo Pedido (RQI)</DialogTitle>
          <DialogDescription>
            Completa el formulario para crear un nuevo pedido de compra
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-3">
              <Label>Obra/Proyecto *</Label>
              {obraRows.map((row, index) => (
                <div key={row.id} className="space-y-2">
                  <div className="grid grid-cols-[1fr_auto] gap-2 items-start">
                    <div className="grid grid-cols-3 gap-2">
                      <Select
                        value={row.obraId}
                        onValueChange={(value) => {
                          const obraSeleccionada = obraOptions.find(o => o.id === value)
                          setObraRows((prev) => prev.map((r) => r.id === row.id ? {
                            ...r,
                            obraId: value,
                            obra: obraSeleccionada?.nombre || r.obra,
                          } : r))
                        }}
                        required={index === 0}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona una obra" />
                        </SelectTrigger>
                        <SelectContent>
                          {obraOptions.map((obra) => (
                            <SelectItem key={obra.id} value={obra.id}>
                              {obra.nombre} - {obra.imputacion}
                            </SelectItem>
                          ))}
                          <SelectItem value="otra">Otra (escribir manualmente)</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input value="001" disabled />
                      <Input
                        value={row.subrubro}
                        onChange={(e) => setObraRows((prev) => prev.map((r) => r.id === row.id ? { ...r, subrubro: e.target.value } : r))}
                        placeholder="Subrubro"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      {index === obraRows.length - 1 ? (
                        <Button
                          type="button"
                          variant="outline"
                          className="h-10 w-10 p-0"
                          onClick={() => {
                            setObraRows((prev) => [
                              ...prev,
                              { id: `row-${prev.length + 1}`, obraId: '', obra: '', imputacion: '001', subrubro: '' },
                            ])
                          }}
                          title="Agregar fila"
                        >
                          +
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-10 w-10 p-0"
                          onClick={() => setObraRows((prev) => prev.filter((r) => r.id !== row.id))}
                          title="Quitar fila"
                        >
                          X
                        </Button>
                      )}
                    </div>
                  </div>
                  {row.obraId === 'otra' && (
                    <Input
                      value={row.obra}
                      onChange={(e) => setObraRows((prev) => prev.map((r) => r.id === row.id ? { ...r, obra: e.target.value } : r))}
                      placeholder="Nombre de la obra"
                      required
                    />
                  )}
                </div>
              ))}
            </div>

            <div className="col-span-2">
              <Label htmlFor="montoEstimado">Monto Estimado (Opcional)</Label>
              <Input
                id="montoEstimado"
                type="number"
                step="0.01"
                value={formData.montoEstimado}
                onChange={(e) => setFormData({ ...formData, montoEstimado: e.target.value })}
                placeholder="0.00"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Cuánto estimas que costará este pedido
              </p>
            </div>

            <div>
              <Label htmlFor="fechaNecesidad">Fecha de Necesidad *</Label>
              <Input
                id="fechaNecesidad"
                type="date"
                value={formData.fechaNecesidad}
                onChange={(e) => setFormData({ ...formData, fechaNecesidad: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="prioridad">Prioridad *</Label>
              <Select
                value={formData.prioridad}
                onValueChange={(value) => setFormData({ ...formData, prioridad: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Alta">Alta</SelectItem>
                  <SelectItem value="Media">Media</SelectItem>
                  <SelectItem value="Baja">Baja</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2">
              <Label htmlFor="areaSolicitud">Área de Solicitud *</Label>
              <Input
                id="areaSolicitud"
                value={formData.areaSolicitud}
                onChange={(e) => setFormData({ ...formData, areaSolicitud: e.target.value })}
                placeholder="Área Civil"
                required
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="detalleMateriales">Detalle de Materiales *</Label>
              <Textarea
                id="detalleMateriales"
                value={formData.detalleMateriales}
                onChange={(e) => setFormData({ ...formData, detalleMateriales: e.target.value })}
                placeholder="Cemento Portland tipo I: 50 bolsas de 50kg..."
                rows={4}
                required
              />
              <div className="mt-2 space-y-2">
                <Label className="text-sm font-normal text-muted-foreground">Archivos adjuntos (opcional)</Label>
                <Input
                  type="file"
                  multiple
                  accept=".jpg,.jpeg,.png,.pdf,.xlsx,.xls,.doc,.docx"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || [])
                    const validFiles = files.filter(file => {
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
                    setMaterialFiles([...materialFiles, ...validFiles])
                  }}
                  className="text-sm"
                />
                {materialFiles.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {materialFiles.map((file, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-background border rounded-md text-sm">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="truncate max-w-[200px]">{file.name}</span>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setMaterialFiles(materialFiles.filter((_, i) => i !== index))
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || uploadingFiles}>
              {loading || uploadingFiles ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {loading ? 'Creando...' : 'Subiendo archivos...'}
                </>
              ) : (
                'Crear Pedido'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

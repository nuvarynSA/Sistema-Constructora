'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/mock/client'
import { useAuth } from '@/hooks/use-auth'
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
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { formatMoney, formatDateTime } from '@/lib/utils'
import { Building2, DollarSign, Calendar, User as UserIcon, Image as ImageIcon, Plus, History } from 'lucide-react'
import Image from 'next/image'
import type { Obra, ObraMonto, User } from '@/lib/types'
import { useFormCache } from '@/hooks/use-form-cache'

interface ObraDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  obra: Obra | null
  onSuccess: () => Promise<void> | void
}

const isValidUrl = (value: string) => {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

const validatedPreviewSource = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) return null
  return isValidUrl(trimmed) ? trimmed : null
}

const getTodayDateInputValue = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const toIsoFromDateInput = (dateValue: string) => {
  if (!dateValue) return null
  const parsedDate = new Date(`${dateValue}T00:00:00`)
  if (Number.isNaN(parsedDate.getTime())) return null
  return parsedDate.toISOString()
}

export function ObraDialog({ open, onOpenChange, obra, onSuccess }: ObraDialogProps) {
  const [loading, setLoading] = useState(false)
  const [usuarios, setUsuarios] = useState<User[]>([])
  const [montoHistory, setMontoHistory] = useState<ObraMonto[]>([])
  const [newMontoValue, setNewMontoValue] = useState('')
  const [newMontoNota, setNewMontoNota] = useState('')
  const [newMontoFecha, setNewMontoFecha] = useState(getTodayDateInputValue())
  const [savingMonto, setSavingMonto] = useState(false)
  const [formData, setFormData] = useState({
    nombre: '',
    imputacion: '',
    montoEstimado: '',
    montoEstimadoFecha: getTodayDateInputValue(),
    montoManoObraFinalizada: '',
    descripcion: '',
    responsableId: '',
    fechaInicio: '',
    fechaFinEstimada: '',
    imagenUrl: '',
  })

  const dataClient = createClient()
  const { toast } = useToast()
  const { userData } = useAuth()

  useEffect(() => {
    if (open) {
      fetchUsuarios()
      if (obra) {
        setFormData({
          nombre: obra.nombre,
          imputacion: obra.imputacion,
          montoEstimado: obra.monto_estimado.toString(),
          montoEstimadoFecha: getTodayDateInputValue(),
          montoManoObraFinalizada: obra.monto_mano_obra_finalizada?.toString() || '',
          descripcion: obra.descripcion || '',
          responsableId: obra.responsable_id || '',
          fechaInicio: obra.fecha_inicio?.split('T')[0] || '',
          fechaFinEstimada: obra.fecha_fin_estimada?.split('T')[0] || '',
          imagenUrl: obra.imagen_url || '',
        })
        fetchMontoHistory(obra.id)
      } else {
        setFormData({
          nombre: '',
          imputacion: '',
          montoEstimado: '',
          montoEstimadoFecha: getTodayDateInputValue(),
          montoManoObraFinalizada: '',
          descripcion: '',
          responsableId: '',
          fechaInicio: '',
          fechaFinEstimada: '',
          imagenUrl: '',
        })
        setMontoHistory([])
      }
      setNewMontoValue('')
      setNewMontoNota('')
      setNewMontoFecha(getTodayDateInputValue())
    }
  }, [open, obra])

  const draftKey = `nexora:obras:${obra?.id ? `edit:${obra.id}` : 'nueva'}:${userData?.id || 'anon'}`
  const { clear: clearDraft } = useFormCache({
    key: draftKey,
    value: formData,
    setValue: setFormData,
    enabled: open,
  })

  const fetchUsuarios = async () => {
    const { data } = await dataClient
      .from('users')
      .select('*')
      .eq('status', 'Activo')
      .order('name')

    setUsuarios(data || [])
  }

  const fetchMontoHistory = async (obraId: string) => {
    const { data } = await dataClient
      .from('obra_montos')
      .select('*, usuario:users(name)')
      .eq('obra_id', obraId)
      .order('created_at', { ascending: false })
    setMontoHistory((data as ObraMonto[]) || [])
  }

  const handleAddMonto = async () => {
    const montoNum = parseFloat(newMontoValue.replace(',', '.'))
    if (isNaN(montoNum) || montoNum <= 0) {
      toast({
        title: 'Monto inválido',
        description: 'Ingresá un valor numérico mayor a cero.',
        variant: 'destructive',
      })
      return
    }

    const montoFechaIso = toIsoFromDateInput(newMontoFecha)
    if (!montoFechaIso) {
      toast({
        title: 'Fecha inválida',
        description: 'Seleccioná una fecha válida para el monto.',
        variant: 'destructive',
      })
      return
    }

    setSavingMonto(true)
    try {
      const { error: insertError } = await dataClient.from('obra_montos').insert({
        id: crypto.randomUUID(),
        obra_id: obra!.id,
        monto: montoNum,
        nota: newMontoNota.trim() || null,
        usuario_id: userData?.id || null,
        created_at: montoFechaIso,
      })
      if (insertError) throw insertError

      // Mantener monto_estimado sincronizado con el último valor
      const { error: updateError } = await dataClient
        .from('obras')
        .update({ monto_estimado: montoNum })
        .eq('id', obra!.id)
      if (updateError) throw updateError

      setNewMontoValue('')
      setNewMontoNota('')
      await fetchMontoHistory(obra!.id)
      setFormData(prev => ({ ...prev, montoEstimado: montoNum.toString() }))

      toast({
        title: 'Monto registrado',
        description: `Nuevo Monto de Obra Adjudicado: ${formatMoney(montoNum)}`,
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo registrar el monto.',
        variant: 'destructive',
      })
    } finally {
      setSavingMonto(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.nombre || !formData.imputacion) {
      toast({
        title: 'Campos requeridos',
        description: 'El nombre y la imputación son obligatorios',
        variant: 'destructive',
      })
      return
    }

    const sanitizedUrl = formData.imagenUrl.trim()
    let validatedUrl: string | null = null

    if (sanitizedUrl) {
      if (isValidUrl(sanitizedUrl)) {
        validatedUrl = sanitizedUrl
      } else {
        toast({
          title: 'URL inválida',
          description: 'Ingresá una URL válida (ej: https://sitio.com/imagen.png)',
          variant: 'destructive',
        })
        return
      }
    }

    setLoading(true)

    try {
      const obraData: Record<string, any> = {
        nombre: formData.nombre.trim(),
        imputacion: formData.imputacion.trim(),
        monto_estimado: parseFloat(formData.montoEstimado) || 0,
      }

      // Evitar enviar columnas opcionales vacías para no romper en entornos con esquema desfasado.
      if (formData.montoManoObraFinalizada.trim() !== '') {
        obraData.monto_mano_obra_finalizada = parseFloat(formData.montoManoObraFinalizada) || 0
      }
      if (formData.descripcion.trim()) obraData.descripcion = formData.descripcion.trim()
      if (formData.responsableId) obraData.responsable_id = formData.responsableId
      if (formData.fechaInicio) obraData.fecha_inicio = formData.fechaInicio
      if (formData.fechaFinEstimada) obraData.fecha_fin_estimada = formData.fechaFinEstimada
      if (validatedUrl) obraData.imagen_url = validatedUrl

      let obraId: string | undefined

      if (obra) {
        obraId = obra.id
        const { error } = await dataClient
          .from('obras')
          .update(obraData)
          .eq('id', obra.id)

        if (error) throw error

        toast({
          title: 'Obra actualizada',
          description: 'La obra se actualizó correctamente',
        })
      } else {
        const montoInicial = parseFloat(formData.montoEstimado) || 0
        const now = new Date().toISOString()
        const newObraId = crypto.randomUUID()
        const montoInicialFechaIso = toIsoFromDateInput(formData.montoEstimadoFecha)
        if (montoInicial > 0 && !montoInicialFechaIso) {
          toast({
            title: 'Fecha inválida',
            description: 'Seleccioná una fecha válida para el monto inicial.',
            variant: 'destructive',
          })
          return
        }
        const obraDataToInsert = {
          ...obraData,
          id: newObraId,
          created_at: now,
          updated_at: now,
        }

        const { data, error } = await dataClient
          .from('obras')
          .insert([obraDataToInsert])
          .select('id')
          .single()

        if (error) throw error
        obraId = data.id

        // Registrar el monto inicial en el historial si se ingresó uno
        if (montoInicial > 0) {
          await dataClient.from('obra_montos').insert({
            id: crypto.randomUUID(),
            obra_id: obraId,
            monto: montoInicial,
            nota: 'Monto inicial',
            usuario_id: userData?.id || null,
            created_at: montoInicialFechaIso || now,
          })
        }

        toast({
          title: 'Obra creada',
          description: 'La obra se creó correctamente',
        })
      }

      // Verificar si esta obra está próxima a su fecha de finalización
      if (obraId && formData.fechaFinEstimada) {
        const { checkObrasApproachingEnd } = await import('@/lib/notifications/check-dates')
        await checkObrasApproachingEnd(obraId)
      }

      await onSuccess()
      onOpenChange(false)
      clearDraft()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Ocurrió un error al guardar la obra',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const latestMonto = montoHistory.length > 0 ? montoHistory[0] : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{obra ? 'Editar Obra' : 'Nueva Obra'}</DialogTitle>
          <DialogDescription>
            {obra ? 'Modifica los datos de la obra' : 'Crea una nueva obra o proyecto'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre de la Obra *</Label>
              <Input
                id="nombre"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                placeholder="Ej: Edificio Central"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="imputacion">Código de Obra/Proyecto *</Label>
              <Input
                id="imputacion"
                value={formData.imputacion}
                onChange={(e) => setFormData({ ...formData, imputacion: e.target.value })}
                placeholder="Ej: IMP-2024-001"
                required
              />
            </div>
          </div>

          {/* Sección de Monto de Obra Adjudicado */}
          {obra ? (
            // Modo edición: mostrar historial y formulario para agregar nuevo
            <div className="space-y-3 rounded-lg border p-4 bg-muted/30">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-muted-foreground" />
                <Label className="text-base font-semibold">Monto de Obra Adjudicado</Label>
              </div>

              {/* Valor actual */}
              {latestMonto && (
                <div className="text-sm text-muted-foreground">
                  Valor actual:{' '}
                  <span className="font-semibold text-foreground text-base">
                    {formatMoney(latestMonto.monto)}
                  </span>
                </div>
              )}

              {/* Historial */}
              {montoHistory.length > 0 ? (
                <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                  {montoHistory.map((entry, idx) => (
                    <div
                      key={entry.id}
                      className={`flex items-start justify-between gap-2 rounded-md px-3 py-2 text-sm ${
                        idx === 0
                          ? 'bg-primary/10 border border-primary/20'
                          : 'bg-background border'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="font-medium">{formatMoney(entry.monto)}</div>
                        {entry.nota && (
                          <div className="text-xs text-muted-foreground">{entry.nota}</div>
                        )}
                        {(entry.usuario as any)?.name && (
                          <div className="text-xs text-muted-foreground">
                            Cargado por {(entry.usuario as any).name}
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDateTime(entry.created_at)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Sin registros de montos aún.</p>
              )}

              {/* Formulario para agregar nuevo monto */}
              <div className="space-y-2 pt-2 border-t">
                <Label className="text-sm font-medium">Agregar nuevo monto</Label>
                <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_190px_auto]">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Nuevo monto..."
                    value={newMontoValue}
                    onChange={(e) => setNewMontoValue(e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    id="newMontoFecha"
                    type="date"
                    value={newMontoFecha}
                    onChange={(e) => setNewMontoFecha(e.target.value)}
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddMonto}
                    disabled={savingMonto || !newMontoValue || !newMontoFecha}
                    className="gap-1"
                  >
                    <Plus className="h-4 w-4" />
                    {savingMonto ? 'Guardando...' : 'Registrar'}
                  </Button>
                </div>
                <Input
                  placeholder="Observación (opcional)"
                  value={newMontoNota}
                  onChange={(e) => setNewMontoNota(e.target.value)}
                  className="text-sm"
                />
              </div>
            </div>
          ) : (
            // Modo creación: campo simple
            <div className="space-y-2">
              <Label htmlFor="montoEstimado">Monto de Obra Adjudicado</Label>
              <Input
                id="montoEstimado"
                type="number"
                step="0.01"
                value={formData.montoEstimado}
                onChange={(e) => setFormData({ ...formData, montoEstimado: e.target.value })}
                placeholder="0.00"
              />
              <p className="text-xs text-muted-foreground">
                Se registrará como el monto inicial de la obra
              </p>
              <div className="space-y-1">
                <Label htmlFor="montoEstimadoFecha" className="text-xs text-muted-foreground">
                  Fecha del monto inicial
                </Label>
                <Input
                  id="montoEstimadoFecha"
                  type="date"
                  value={formData.montoEstimadoFecha}
                  onChange={(e) => setFormData({ ...formData, montoEstimadoFecha: e.target.value })}
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="montoManoObraFinalizada">Monto de Mano de Obra Finalizada</Label>
            <Input
              id="montoManoObraFinalizada"
              type="number"
              step="0.01"
              value={formData.montoManoObraFinalizada}
              onChange={(e) => setFormData({ ...formData, montoManoObraFinalizada: e.target.value })}
              placeholder="0.00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="descripcion">Descripción</Label>
            <Textarea
              id="descripcion"
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              placeholder="Detalles adicionales de la obra..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="imagenUrl">URL de Imagen</Label>
            <Input
              id="imagenUrl"
              type="url"
              value={formData.imagenUrl}
              onChange={(e) => setFormData({ ...formData, imagenUrl: e.target.value })}
              placeholder="https://ejemplo.com/imagen.jpg"
            />
            {formData.imagenUrl && (
              <div className="mt-2">
                <p className="text-xs text-muted-foreground mb-2">Vista previa:</p>
                {validatedPreviewSource(formData.imagenUrl) ? (
                  <Image
                    src={validatedPreviewSource(formData.imagenUrl)!}
                    alt="Vista previa de la obra"
                    width={80}
                    height={80}
                    className="object-cover rounded border"
                    unoptimized
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                ) : null}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              URL de una imagen para mostrar en el sidebar (opcional)
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fechaInicio">Fecha de Inicio</Label>
              <Input
                id="fechaInicio"
                type="date"
                value={formData.fechaInicio}
                onChange={(e) => setFormData({ ...formData, fechaInicio: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fechaFinEstimada">Fecha Fin Estimada</Label>
              <Input
                id="fechaFinEstimada"
                type="date"
                value={formData.fechaFinEstimada}
                onChange={(e) => setFormData({ ...formData, fechaFinEstimada: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="responsable">Responsable</Label>
            <Select
              value={formData.responsableId}
              onValueChange={(value) => setFormData({ ...formData, responsableId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un responsable" />
              </SelectTrigger>
              <SelectContent>
                {usuarios.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name} - {user.area}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Guardando...' : obra ? 'Actualizar' : 'Crear Obra'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

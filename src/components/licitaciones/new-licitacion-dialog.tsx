'use client'

import { useState, useEffect } from 'react'
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
import { Loader2, Upload, X, FileText } from 'lucide-react'
import { useFormCache } from '@/hooks/use-form-cache'

interface NewLicitacionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function NewLicitacionDialog({ open, onOpenChange, onSuccess }: NewLicitacionDialogProps) {
  const { userData, ensureUserData } = useAuth()
  const { toast } = useToast()
  const dataClient = createClient()
  const [loading, setLoading] = useState(false)
  const [areas, setAreas] = useState<string[]>([])
  const [files, setFiles] = useState<File[]>([])
  const [uploadingFiles, setUploadingFiles] = useState(false)
  
  const [formData, setFormData] = useState({
    empresa: '',
    obra: '',
    monto: '',
    prioridad: 'Media',
    areaSolicitud: userData?.area || '',
    lugarEntrega: '',
    detalleItems: '',
  })

  useEffect(() => {
    if (open) {
      fetchAreas()
    }
  }, [open])

  useEffect(() => {
    if (open && !userData) {
      ensureUserData()
    }
  }, [open, userData, ensureUserData])

  const draftKey = `nexora:licitaciones:nueva:${userData?.id || 'anon'}`
  const { clear: clearDraft } = useFormCache({
    key: draftKey,
    value: formData,
    setValue: setFormData,
    enabled: open,
  })

  const fetchAreas = async () => {
    try {
      const { data, error } = await dataClient
        .from('users')
        .select('area')
        .eq('status', 'Activo')
        .not('area', 'is', null)

      if (error) throw error

      const uniqueAreas = Array.from(new Set((data || []).map((u: any) => u.area).filter(Boolean))) as string[]
      setAreas(uniqueAreas.sort())
    } catch (error) {
      console.error('Error fetching areas:', error)
    }
  }

  const generateOPL = async () => {
    const year = new Date().getFullYear()
    const prefix = `OPL-${year}-`

    const { data } = await dataClient
      .from('licitaciones')
      .select('opl')
      .ilike('opl', `${prefix}%`)
      .order('opl', { ascending: false })
      .limit(1)

    let nextNumber = 1
    if (data && data.length > 0) {
      const lastOpl = data[0].opl as string
      const lastNum = parseInt(lastOpl.replace(prefix, ''), 10)
      if (!isNaN(lastNum)) nextNumber = lastNum + 1
    }

    return `${prefix}${nextNumber.toString().padStart(3, '0')}`
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

    const montoValue = formData.monto ? Number(formData.monto) : 0
    if (formData.monto && Number.isNaN(montoValue)) {
      toast({
        title: 'Monto inválido',
        description: 'Ingresá un monto válido para crear la licitación.',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)

    try {
      const opl = await generateOPL()
      const now = new Date().toISOString()
      
      // Generar UUID para la licitación
      const licitacionId = crypto.randomUUID()

      const { error } = await dataClient.from('licitaciones').insert({
        id: licitacionId,
        opl,
        empresa: formData.empresa,
        obra: formData.obra,
        monto: montoValue,
        prioridad: formData.prioridad,
        area_solicitud: formData.areaSolicitud,
        lugar_entrega: formData.lugarEntrega,
        detalle_items: formData.detalleItems,
        creador_id: activeUser.id,
        estado: 'Abierta',
        estado_detallado: 'Pendiente de Aprobación',
        current_process: 'solicitud',
        created_at: now,
        updated_at: now,
      })

      if (error) throw error

      // Create initial history entry
      await dataClient.from('licitacion_histories').insert({
        licitacion_id: licitacionId,
        usuario_id: activeUser.id,
        accion: `${activeUser.name} creó la licitación`,
        tipo: 'creacion',
      })

      // Subir archivos si hay alguno
      if (files.length > 0) {
        setUploadingFiles(true)
        const uploadErrors: string[] = []
        
        try {
          for (const file of files) {
            try {
              const fileFormData = new FormData()
              fileFormData.append('file', file)
              fileFormData.append('tipo', 'General')

              const response = await fetch(`/api/licitaciones/${licitacionId}/archivos`, {
                method: 'POST',
                body: fileFormData,
              })

              if (!response.ok) {
                const errorData = await response.json()
                const errorMessage = errorData.error || errorData.details || 'Error al subir archivo'
                uploadErrors.push(`${file.name}: ${errorMessage}`)
                console.error(`Error subiendo ${file.name}:`, errorData)
              }
            } catch (fileError) {
              const errorMessage = fileError instanceof Error ? fileError.message : 'Error desconocido'
              uploadErrors.push(`${file.name}: ${errorMessage}`)
              console.error(`Error subiendo ${file.name}:`, fileError)
            }
          }

          if (uploadErrors.length > 0) {
            toast({
              title: 'Advertencia',
              description: `La licitación se creó pero ${uploadErrors.length} archivo(s) no se pudieron subir: ${uploadErrors.join(', ')}`,
              variant: 'destructive',
            })
          } else {
            toast({
              title: 'Archivos subidos',
              description: `${files.length} archivo(s) subido(s) correctamente`,
            })
          }
        } catch (error) {
          console.error('Error uploading files:', error)
          toast({
            title: 'Advertencia',
            description: 'La licitación se creó pero algunos archivos no se pudieron subir.',
            variant: 'destructive',
          })
        } finally {
          setUploadingFiles(false)
        }
      }

      // Notificar al área de compras sobre nueva OPL
      const { notifyComprasArea } = await import('@/lib/notifications')
      await notifyComprasArea({
        title: 'Nueva OPL disponible',
        message: `Se agregó una nueva OPL en Solicitados. Revisala cuando puedas.`,
        type: 'new_opl',
        referenceId: licitacionId,
        referenceType: 'licitacion',
        excludeUserId: activeUser.id,
      })

      toast({
        title: '¡Licitación creada!',
        description: `La licitación ${opl} ha sido creada exitosamente.`,
      })

      onSuccess()
      
      // Reset form
      setFormData({
        empresa: '',
        obra: '',
        monto: '',
        prioridad: 'Media',
        areaSolicitud: userData?.area || '',
        lugarEntrega: '',
        detalleItems: '',
      })
      setFiles([])
      clearDraft()
    } catch (error: unknown) {
      console.error('Error creating licitacion:', error)
      const pgError = error as { code?: string }
      const isDuplicate = pgError?.code === '23505'
      toast({
        title: 'Error',
        description: isDuplicate
          ? 'Se generó un número de OPL duplicado. Por favor, intentá nuevamente.'
          : 'No se pudo crear la licitación. Por favor, intenta nuevamente.',
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
          <DialogTitle>Nueva Licitación (OPL)</DialogTitle>
          <DialogDescription>
            Completa el formulario para crear una nueva licitación
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="empresa">Proveedor *</Label>
              <Input
                id="empresa"
                value={formData.empresa}
                onChange={(e) => setFormData({ ...formData, empresa: e.target.value })}
                placeholder="Proveedor Alfa"
                required
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="obra">Proyecto en Estudio *</Label>
              <Input
                id="obra"
                value={formData.obra}
                onChange={(e) => setFormData({ ...formData, obra: e.target.value })}
                placeholder="Proyecto Central"
                required
              />
            </div>

            <div>
              <Label htmlFor="monto">Monto Estimado (Opcional)</Label>
              <Input
                id="monto"
                type="number"
                step="0.01"
                value={formData.monto}
                onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
                placeholder="150000"
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

            <div>
              <Label htmlFor="areaSolicitud">Área de Solicitud *</Label>
              <Select
                value={formData.areaSolicitud}
                onValueChange={(value) => setFormData({ ...formData, areaSolicitud: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un área" />
                </SelectTrigger>
                <SelectContent>
                  {areas.map((area) => (
                    <SelectItem key={area} value={area}>
                      {area}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="lugarEntrega">Ubicación de Obra *</Label>
              <Input
                id="lugarEntrega"
                value={formData.lugarEntrega}
                onChange={(e) => setFormData({ ...formData, lugarEntrega: e.target.value })}
                placeholder="Obra Edificio Central, Piso 10"
                required
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="detalleItems">Detalle de Ítems *</Label>
              <Textarea
                id="detalleItems"
                value={formData.detalleItems}
                onChange={(e) => setFormData({ ...formData, detalleItems: e.target.value })}
                placeholder="1000 sacos de cemento, 500 varillas de acero..."
                rows={4}
                required
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="archivos">Archivos adjuntos</Label>
              <Input
                id="archivos"
                type="file"
                multiple
                accept=".xlsx,.xls,.pdf,.csv,.png,.jpg,.jpeg"
                onChange={(e) => {
                  const selectedFiles = Array.from(e.target.files || [])
                  const validFiles = selectedFiles.filter(file => {
                    const extension = '.' + file.name.split('.').pop()?.toLowerCase()
                    const allowedExtensions = ['.xlsx', '.xls', '.pdf', '.csv', '.png', '.jpg', '.jpeg']
                    if (!allowedExtensions.includes(extension)) {
                      toast({
                        title: 'Error',
                        description: `El archivo ${file.name} no es un tipo permitido. Solo se permiten: PDF, Excel, CSV, PNG, JPG`,
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
                  setFiles(validFiles)
                }}
                className="text-sm"
              />
              {files.length > 0 && (
                <div className="mt-2 space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {files.map((file, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-muted border rounded-md text-sm">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="truncate max-w-[200px]">{file.name}</span>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setFiles(files.filter((_, i) => i !== index))
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
                  {uploadingFiles ? 'Subiendo archivos...' : 'Creando...'}
                </>
              ) : (
                'Crear Licitación'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

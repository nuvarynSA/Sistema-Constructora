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
import { useToast } from '@/components/ui/use-toast'
import { CheckCircle2, AlertCircle } from 'lucide-react'
import { logOrderAction } from '@/lib/audit'
import { notifyAreaUsers, notifyOrderCreatorEvent } from '@/lib/notifications'
import type { Order } from '@/lib/types'

interface FinalizarPedidoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  order: Order
  onSuccess: () => void
}

export function FinalizarPedidoDialog({ open, onOpenChange, order, onSuccess }: FinalizarPedidoDialogProps) {
  const { userData, ensureUserData } = useAuth()
  const [loading, setLoading] = useState(false)
  const [tipoFinalizacion, setTipoFinalizacion] = useState<'completa' | 'parcial'>('completa')
  const [formData, setFormData] = useState({
    remito: '',
    detalleEntregado: '',
    observaciones: '',
  })

  const dataClient = createClient()
  const { toast } = useToast()

  useEffect(() => {
    if (open && !userData) {
      ensureUserData()
    }
  }, [open, userData, ensureUserData])

  const handleSubmit = async () => {
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

    if (!formData.remito) {
      toast({
        title: 'Campo requerido',
        description: 'Debes ingresar el número de remito',
        variant: 'destructive',
      })
      return
    }

    if (tipoFinalizacion === 'parcial' && !formData.detalleEntregado) {
      toast({
        title: 'Campo requerido',
        description: 'Debes especificar qué se entregó',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)

    try {
      if (tipoFinalizacion === 'completa') {
        // Finalizar completo
        const { error: updateError } = await dataClient
          .from('orders')
          .update({
            estado: 'Finalizado',
            estado_detallado: 'Entregado Completo',
            estado_entrega: 'Completo',
            current_area: 'finalizado',
            remito: formData.remito,
            fecha_finalizacion: new Date().toISOString(),
            notas_entrega: formData.observaciones || null,
          })
          .eq('id', order.id)

        if (updateError) throw updateError

        // Registrar en historial
        await dataClient.from('order_histories').insert({
          order_id: order.id,
          usuario_id: activeUser.id,
          accion: `${activeUser.name} finalizó el pedido con entrega completa`,
          tipo: 'finalizacion',
        })

        // Auditoría
        await logOrderAction(
          activeUser,
          'editar',
          order.id,
          order.rqi,
          'Pedido finalizado - Entrega completa',
          {
            tipoFinalizacion: 'completa',
            remito: formData.remito,
          }
        )

        // Notificar a todos los usuarios del sistema
        const { notifyAllUsers } = await import('@/lib/notifications')
        await notifyAllUsers({
          title: 'RQI finalizada',
          message: `La RQI ${order.rqi} fue finalizada. Podés ver el detalle en el sistema.`,
          type: 'rqi_finalized',
          referenceId: order.id,
          referenceType: 'order',
          excludeUserId: activeUser.id,
        })

        await notifyOrderCreatorEvent({
          orderId: order.id,
          solicitanteId: order.solicitante_id,
          actorId: activeUser.id,
          title: 'Tu RQI fue finalizada',
          message: `El pedido ${order.rqi} fue marcado como entregado completo.`,
          type: 'order_finalized',
        })

      } else {
        // Entrega parcial
        const { error: parcialError } = await dataClient
          .from('entregas_parciales')
          .insert({
            order_id: order.id,
            remito: formData.remito,
            detalle_entregado: formData.detalleEntregado,
            observaciones: formData.observaciones || null,
            usuario_id: activeUser.id,
          })

        if (parcialError) throw parcialError

        // Actualizar estado del pedido
        const { error: updateError } = await dataClient
          .from('orders')
          .update({
            estado_entrega: 'Parcial',
            estado_detallado: 'Entrega Parcial en Proceso',
            notas_entrega: formData.observaciones || null,
          })
          .eq('id', order.id)

        if (updateError) throw updateError

        // Registrar en historial
        await dataClient.from('order_histories').insert({
          order_id: order.id,
          usuario_id: activeUser.id,
          accion: `${activeUser.name} registró entrega parcial. Remito: ${formData.remito}`,
          tipo: 'entrega_parcial',
        })

        // Auditoría
        await logOrderAction(
          activeUser,
          'editar',
          order.id,
          order.rqi,
          'Entrega parcial registrada',
          {
            tipoFinalizacion: 'parcial',
            remito: formData.remito,
            detalle: formData.detalleEntregado,
          }
        )

        // Notificar
        await notifyAreaUsers({
          area: order.area_solicitud,
          title: 'Entrega parcial registrada',
          message: `El pedido ${order.rqi} tuvo una entrega parcial. Remito: ${formData.remito}`,
          type: 'order_partial',
          referenceId: order.id,
          referenceType: 'order',
          excludeUserId: activeUser.id,
        })

        await notifyOrderCreatorEvent({
          orderId: order.id,
          solicitanteId: order.solicitante_id,
          actorId: activeUser.id,
          title: 'Entrega parcial registrada',
          message: `Se registró una entrega parcial de ${order.rqi}. Remito: ${formData.remito}.`,
          type: 'order_partial',
        })
      }

      toast({
        title: tipoFinalizacion === 'completa' ? 'Pedido finalizado' : 'Entrega parcial registrada',
        description: tipoFinalizacion === 'completa' 
          ? 'El pedido se finalizó correctamente' 
          : 'La entrega parcial se registró. El pedido permanece en logística.',
      })

      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Ocurrió un error',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Finalizar Pedido - {order.rqi}</DialogTitle>
          <DialogDescription>
            Registra la entrega del pedido
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Selector de tipo de finalización */}
          <div className="space-y-3">
            <Label>Tipo de Entrega</Label>
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant={tipoFinalizacion === 'completa' ? 'default' : 'outline'}
                className="h-auto py-4 flex flex-col gap-2"
                onClick={() => setTipoFinalizacion('completa')}
              >
                <CheckCircle2 className="h-6 w-6" />
                <div>
                  <div className="font-semibold">Entrega Completa</div>
                  <div className="text-xs text-muted-foreground">
                    Se entregó todo
                  </div>
                </div>
              </Button>

              <Button
                type="button"
                variant={tipoFinalizacion === 'parcial' ? 'default' : 'outline'}
                className="h-auto py-4 flex flex-col gap-2"
                onClick={() => setTipoFinalizacion('parcial')}
              >
                <AlertCircle className="h-6 w-6" />
                <div>
                  <div className="font-semibold">Entrega Parcial</div>
                  <div className="text-xs text-muted-foreground">
                    Falta entregar
                  </div>
                </div>
              </Button>
            </div>
          </div>

          {/* Formulario */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="remito">Número de Remito *</Label>
              <Input
                id="remito"
                value={formData.remito}
                onChange={(e) => setFormData({ ...formData, remito: e.target.value })}
                placeholder="REM-2024-001"
                required
              />
            </div>

            {tipoFinalizacion === 'parcial' && (
              <div className="space-y-2">
                <Label htmlFor="detalleEntregado">Detalle de lo Entregado *</Label>
                <Textarea
                  id="detalleEntregado"
                  value={formData.detalleEntregado}
                  onChange={(e) => setFormData({ ...formData, detalleEntregado: e.target.value })}
                  placeholder="Especifica qué materiales se entregaron..."
                  rows={3}
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="observaciones">Observaciones</Label>
              <Textarea
                id="observaciones"
                value={formData.observaciones}
                onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                placeholder="Comentarios adicionales..."
                rows={2}
              />
            </div>
          </div>

          {/* Botones */}
          <div className="flex gap-2">
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1"
            >
              {loading ? 'Procesando...' : tipoFinalizacion === 'completa' ? 'Finalizar Pedido' : 'Registrar Entrega Parcial'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

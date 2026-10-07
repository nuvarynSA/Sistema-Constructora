'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/components/ui/use-toast'
import { formatDate, getPriorityColor, getStatusColor } from '@/lib/utils'
import { ArrowRight, Lock, Package, TruckIcon, Loader2 } from 'lucide-react'
import { OrderDetailDialog } from './order-detail-dialog'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/mock/client'
import { useAuth } from '@/hooks/use-auth'
import { usePermissions, canDeriveOrderForUser } from '@/hooks/use-permissions'
import { notifyAreaUsers, notifyOrderCreatorEvent } from '@/lib/notifications'
import { logOrderAction } from '@/lib/audit'
import type { Order, OrderArea } from '@/lib/types'

interface PedidosKanbanProps {
  orders: Order[]
  onUpdate: () => void
  notifCountByOrder?: Record<string, number>
}

const columns: { id: OrderArea; title: string; color: string }[] = [
  { id: 'solicitados', title: 'Solicitados', color: 'bg-yellow-100 border-yellow-300' },
  { id: 'compras', title: 'Área de Compras', color: 'bg-blue-100 border-blue-300' },
  { id: 'logistica', title: 'Logística', color: 'bg-purple-100 border-purple-300' },
  { id: 'finalizado', title: 'Finalizado', color: 'bg-green-100 border-green-300' },
]

export function PedidosKanban({ orders, onUpdate, notifCountByOrder = {} }: PedidosKanbanProps) {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [showDetailDialog, setShowDetailDialog] = useState(false)
  const [orderToDerive, setOrderToDerive] = useState<Order | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [deriving, setDeriving] = useState(false)
  
  const dataClient = createClient()
  const { toast } = useToast()
  const { userData, ensureUserData } = useAuth()
  const { canDeriveOrder, getPermissionErrorMessage } = usePermissions()

  useEffect(() => {
    console.log('[PedidosKanban] mount', { hasUser: !!userData, orders: orders.length })
    if (!userData) {
      ensureUserData()
    }
  }, [userData, ensureUserData])

  const getOrdersByArea = (area: OrderArea) => {
    return orders.filter(order => order.current_area === area)
  }

  const handleViewDetail = (order: Order) => {
    setSelectedOrder(order)
    setShowDetailDialog(true)
  }

  const handleDeriveClick = async (order: Order) => {
    let activeUser = userData
    if (!activeUser) {
      activeUser = await ensureUserData()
    }
    const hasPermission = canDeriveOrderForUser(order, activeUser)
    // Validar permisos
    if (!hasPermission) {
      toast({
        title: 'Sin permisos',
        description: getPermissionErrorMessage(order),
        variant: 'destructive',
      })
      return
    }
    
    setOrderToDerive(order)
    setShowConfirmDialog(true)
  }

  const getNextArea = (currentArea: OrderArea): OrderArea | null => {
    const areaFlow: Record<OrderArea, OrderArea | null> = {
      'solicitados': 'compras',
      'compras': 'logistica',
      'logistica': 'finalizado',
      'finalizado': null,
    }
    return areaFlow[currentArea]
  }

  const getNextStatus = (nextArea: OrderArea): { estado: string; estadoDetallado: string } => {
    const statusMap: Record<OrderArea, { estado: string; estadoDetallado: string }> = {
      'solicitados': { estado: 'Pendiente', estadoDetallado: 'Pendiente' },
      'compras': { estado: 'En Curso', estadoDetallado: 'Cotizando Proveedores' },
      'logistica': { estado: 'En Curso', estadoDetallado: 'Preparando Envío' },
      'finalizado': { estado: 'Finalizado', estadoDetallado: 'Entregado Completo' },
    }
    return statusMap[nextArea]
  }

  const confirmDerive = async () => {
    if (!orderToDerive) return
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

    const nextArea = getNextArea(orderToDerive.current_area)
    if (!nextArea) {
      toast({
        title: 'Error',
        description: 'Esta orden ya está en la última etapa',
        variant: 'destructive',
      })
      return
    }

    setDeriving(true)

    try {
      const { estado, estadoDetallado } = getNextStatus(nextArea)

      // Actualizar la orden
      const { error: updateError } = await dataClient
        .from('orders')
        .update({
          current_area: nextArea,
          estado: estado,
          estado_detallado: estadoDetallado,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderToDerive.id)

      if (updateError) throw updateError

      // Registrar en el historial
      const areaNames: Record<OrderArea, string> = {
        'solicitados': 'Solicitados',
        'compras': 'Área de Compras',
        'logistica': 'Logística',
        'finalizado': 'Finalizado',
      }

      await dataClient.from('order_histories').insert({
        id: crypto.randomUUID(),
        order_id: orderToDerive.id,
        usuario_id: activeUser.id,
        accion: `${activeUser.name} derivó el pedido a ${areaNames[nextArea]}`,
        tipo: 'derivacion',
      })

      // Registrar en auditoría
      await logOrderAction(
        activeUser,
        'derivar',
        orderToDerive.id,
        orderToDerive.rqi,
        `Pedido derivado de ${areaNames[orderToDerive.current_area]} a ${areaNames[nextArea]}`,
        {
          from: orderToDerive.current_area,
          to: nextArea,
          previousStatus: orderToDerive.estado,
          newStatus: estado,
        }
      )

      // Crear notificaciones para usuarios del área destino
      const areaNotificationMap: Record<OrderArea, string> = {
        'solicitados': 'Solicitados',
        'compras': 'Compras',
        'logistica': 'Logística',
        'finalizado': 'Almacén',
      }

      await notifyAreaUsers({
        area: areaNotificationMap[nextArea],
        title: `Nuevo pedido en ${areaNames[nextArea]}`,
        message: `El pedido ${orderToDerive.rqi} de ${orderToDerive.obra} fue derivado a tu área.`,
        type: 'order_derived',
        referenceId: orderToDerive.id,
        referenceType: 'order',
        excludeUserId: activeUser.id,
      })

      await notifyOrderCreatorEvent({
        orderId: orderToDerive.id,
        solicitanteId: orderToDerive.solicitante_id,
        actorId: activeUser.id,
        title: 'Tu RQI cambió de etapa',
        message: `El pedido ${orderToDerive.rqi} avanzó a ${areaNames[nextArea]}.`,
        type: 'order_progress',
      })

      toast({
        title: '✅ Pedido derivado',
        description: `El pedido ${orderToDerive.rqi} fue derivado a ${areaNames[nextArea]}`,
      })

      setShowConfirmDialog(false)
      setOrderToDerive(null)
      onUpdate() // Refrescar la lista
    } catch (error) {
      console.error('Error al derivar:', error)
      toast({
        title: 'Error',
        description: 'No se pudo derivar el pedido. Intenta nuevamente.',
        variant: 'destructive',
      })
    } finally {
      setDeriving(false)
    }
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {columns.map(column => {
          const columnOrders = getOrdersByArea(column.id)
          
          return (
            <div key={column.id} className="space-y-2 sm:space-y-3 flex flex-col h-full min-h-[500px]">
              <Card className={`${column.color} border-2`}>
                <CardHeader className="pb-3 p-3 sm:p-6">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base sm:text-lg">{column.title}</CardTitle>
                    <Badge variant="secondary" className="animate-in zoom-in-50 duration-300">{columnOrders.length}</Badge>
                  </div>
                </CardHeader>
              </Card>

              <div className="space-y-2 sm:space-y-3 flex-1">
                {columnOrders.map(order => (
                  <Card
                    key={order.id}
                    className="cursor-pointer group"
                    onClick={() => handleViewDetail(order)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        handleViewDetail(order)
                      }
                    }}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <p className="font-semibold text-sm">{order.rqi}</p>
                          <p className="text-xs text-muted-foreground">{order.obra}</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {(notifCountByOrder[order.id] ?? 0) > 0 && (
                            <span className="flex items-center justify-center h-5 min-w-[20px] px-1 rounded-full bg-red-500 text-white text-xs font-bold leading-none">
                              {notifCountByOrder[order.id]}
                            </span>
                          )}
                          <Badge className={getPriorityColor(order.prioridad)} variant="outline">
                            {order.prioridad}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs bg-blue-500 text-white">
                            {order.solicitante?.avatar || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-muted-foreground">
                          {order.solicitante?.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={getStatusColor(order.estado_detallado || order.estado)} variant="secondary">
                          {order.estado_detallado || order.estado}
                        </Badge>
                        {order.tipo_entrega && (
                          <Badge 
                            variant="outline" 
                            className={
                              order.tipo_entrega === 'Recibir' 
                                ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-700' 
                                : 'bg-orange-50 dark:bg-orange-950/30 border-orange-300 dark:border-orange-700'
                            }
                          >
                            {order.tipo_entrega === 'Recibir' ? (
                              <><Package className="h-3 w-3 mr-1 inline" />Recibir</>
                            ) : (
                              <><TruckIcon className="h-3 w-3 mr-1 inline" />Retirar</>
                            )}
                          </Badge>
                        )}
                      </div>

                      <div className="text-xs text-muted-foreground">
                        {formatDate(order.fecha_creacion)}
                      </div>

                      {order.current_area !== 'finalizado' && (
                        <div className="flex gap-2">
                          {(() => {
                            const hasSession = Boolean(userData)
                            const canDerive = canDeriveOrder(order)
                            const isDisabled = hasSession ? !canDerive : false
                            return (
                          <Button
                            size="sm"
                            variant={canDerive ? "default" : "outline"}
                            className="flex-1 gap-2"
                            onClick={(event) => {
                              event.stopPropagation()
                              handleDeriveClick(order)
                            }}
                            disabled={isDisabled}
                          >
                            {!hasSession ? (
                              <>
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Verificando...
                              </>
                            ) : canDerive ? (
                              <>
                                <ArrowRight className="h-3 w-3" />
                                Derivar
                              </>
                            ) : (
                              <>
                                <Lock className="h-3 w-3" />
                                Sin permisos
                              </>
                            )}
                          </Button>
                            )
                          })()}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Order Detail Dialog */}
      {selectedOrder && (
        <OrderDetailDialog
          order={selectedOrder}
          open={showDetailDialog}
          onOpenChange={setShowDetailDialog}
          onUpdate={onUpdate}
        />
      )}

      {/* Confirm Derive Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Derivar pedido?</AlertDialogTitle>
            <AlertDialogDescription>
              {orderToDerive && (
                <>
                  ¿Estás seguro de que deseas derivar el pedido <strong>{orderToDerive.rqi}</strong> 
                  {' '}de <strong>{columns.find(c => c.id === orderToDerive.current_area)?.title}</strong>
                  {' '}a <strong>{getNextArea(orderToDerive.current_area) && columns.find(c => c.id === getNextArea(orderToDerive.current_area))?.title}</strong>?
                  <br /><br />
                  Esta acción quedará registrada en el historial.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deriving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDerive} disabled={deriving}>
              {deriving ? 'Derivando...' : 'Sí, derivar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

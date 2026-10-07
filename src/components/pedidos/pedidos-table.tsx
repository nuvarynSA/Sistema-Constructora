'use client'

import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { formatDate, getPriorityColor, getStatusColor } from '@/lib/utils'
import { OrderDetailDialog } from './order-detail-dialog'
import type { Order } from '@/lib/types'

interface PedidosTableProps {
  orders: Order[]
  onUpdate: () => void
}

export function PedidosTable({ orders, onUpdate }: PedidosTableProps) {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [showDetailDialog, setShowDetailDialog] = useState(false)

  const handleViewDetail = (order: Order) => {
    setSelectedOrder(order)
    setShowDetailDialog(true)
  }

  return (
    <>
      {/* Desktop Table */}
      <div className="hidden lg:block">
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>RQI</TableHead>
                <TableHead>Obra/Proyecto</TableHead>
                <TableHead>Solicitante</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Prioridad</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Área Actual</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No hay pedidos para mostrar
                  </TableCell>
                </TableRow>
              ) : (
                orders.map(order => (
                  <TableRow
                    key={order.id}
                    className="hover:bg-muted/50 cursor-pointer"
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
                    <TableCell className="font-medium">{order.rqi}</TableCell>
                    <TableCell>{order.obra}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs bg-blue-500 text-white">
                            {order.solicitante?.avatar || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{order.solicitante?.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDate(order.fecha_creacion)}
                    </TableCell>
                    <TableCell>
                      <Badge className={getPriorityColor(order.prioridad)} variant="outline">
                        {order.prioridad}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(order.estado_detallado || order.estado)} variant="secondary">
                        {order.estado_detallado || order.estado}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {order.current_area.charAt(0).toUpperCase() + order.current_area.slice(1)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* Mobile Cards */}
      <div className="lg:hidden space-y-4">
        {orders.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              No hay pedidos para mostrar
            </CardContent>
          </Card>
        ) : (
          orders.map(order => (
            <Card
              key={order.id}
              className="p-4 cursor-pointer hover:shadow-md transition-shadow"
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
              <CardContent className="p-0 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-lg">{order.rqi}</h3>
                    <p className="text-sm text-muted-foreground">{order.obra}</p>
                  </div>
                  <Badge className={getStatusColor(order.estado_detallado || order.estado)} variant="secondary">
                    {order.estado_detallado || order.estado}
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs bg-blue-500 text-white">
                        {order.solicitante?.avatar || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{order.solicitante?.name}</span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Fecha:</span>
                    <span>{formatDate(order.fecha_creacion)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Prioridad:</span>
                    <Badge className={getPriorityColor(order.prioridad)} variant="outline">
                      {order.prioridad}
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Área:</span>
                    <Badge variant="outline">
                      {order.current_area.charAt(0).toUpperCase() + order.current_area.slice(1)}
                    </Badge>
                  </div>
                </div>
                
              </CardContent>
            </Card>
          ))
        )}
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
    </>
  )
}

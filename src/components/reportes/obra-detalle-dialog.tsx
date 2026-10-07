'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatMoney, formatDate } from '@/lib/utils'
import { CheckCircle2, Clock, AlertTriangle, AlertCircle, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Obra, Order } from '@/lib/types'
import { MonthlySpendChart } from './monthly-spend-chart'
import { MontosLineChart } from './montos-line-chart'
import { buildMonthlySeries, getOrderDateMetrics, getOrderOcTotal } from './reportes-utils'

interface ObraDetalleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  obra: Obra & { pedidos: Order[] }
  onViewOrderDetail?: (order: Order) => void
}

function getLatestMonto(obra: Obra): number {
  const montos = (obra as any).obra_montos as { monto: number; created_at: string }[] | undefined
  if (!montos || montos.length === 0) return obra.monto_estimado
  const sorted = [...montos].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
  return Number(sorted[0].monto)
}

export function ObraDetalleDialog({ open, onOpenChange, obra, onViewOrderDetail }: ObraDetalleDialogProps) {
  const pedidosFinalizados = obra.pedidos.filter(p => p.estado === 'Finalizado')
  const pedidosEnCurso = obra.pedidos.filter(p => p.estado === 'En Curso')
  const pedidosPendientes = obra.pedidos.filter(p => p.estado === 'Pendiente')

  const totalGastado = pedidosFinalizados.reduce((sum, p) => sum + (getOrderOcTotal(p) || 0), 0)
  const totalEnCurso = pedidosEnCurso.reduce((sum, p) => sum + (getOrderOcTotal(p) || 0), 0)
  const totalPendiente = pedidosPendientes.reduce((sum, p) => sum + (getOrderOcTotal(p) || 0), 0)
  const montoActual = getLatestMonto(obra)
  const porcentajeGastado = montoActual > 0 ? (totalGastado / montoActual) * 100 : 0
  const excedido = porcentajeGastado > 100
  const monthlySeries = buildMonthlySeries(pedidosFinalizados)
  const dateMetrics = getOrderDateMetrics(obra.pedidos)
  const timelineMetrics = [
    {
      label: 'Primera solicitud',
      value: dateMetrics.firstCreation ? formatDateSafely(dateMetrics.firstCreation) : 'Sin registros',
    },
    {
      label: 'Última finalización',
      value: dateMetrics.lastFinalization ? formatDateSafely(dateMetrics.lastFinalization) : 'Sin registros',
    },
    {
      label: 'Próxima necesidad',
      value: dateMetrics.upcomingNeed ? formatDateSafely(dateMetrics.upcomingNeed) : 'Sin definir',
    },
  ]
  const statusMetrics = [
    {
      label: 'OCs pendientes',
      count: pedidosPendientes.length,
      amount: totalPendiente,
      tone: 'text-yellow-600 dark:text-yellow-400',
      border: 'border-yellow-200 dark:border-yellow-900/40',
      background: 'bg-yellow-50 dark:bg-yellow-950/20',
    },
    {
      label: 'OCs en curso',
      count: pedidosEnCurso.length,
      amount: totalEnCurso,
      tone: 'text-blue-600 dark:text-blue-400',
      border: 'border-blue-200 dark:border-blue-900/40',
      background: 'bg-blue-50 dark:bg-blue-950/20',
    },
    {
      label: 'OCs finalizadas',
      count: pedidosFinalizados.length,
      amount: totalGastado,
      tone: 'text-emerald-600 dark:text-emerald-400',
      border: 'border-emerald-200 dark:border-emerald-900/40',
      background: 'bg-emerald-50 dark:bg-emerald-950/20',
    },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{obra.nombre}</DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <Badge variant="outline">{obra.imputacion}</Badge>
            <Badge variant={obra.estado === 'Activa' ? 'default' : 'secondary'}>
              {obra.estado}
            </Badge>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Resumen financiero */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200 dark:border-blue-800">
              <CardContent className="pt-6">
                <div className="text-sm text-blue-700 dark:text-blue-300">Presupuestado</div>
                <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                  {formatMoney(montoActual)}
                </div>
              </CardContent>
            </Card>

            <Card className={`bg-gradient-to-br ${excedido ? 'from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-900/20 border-red-200 dark:border-red-800' : 'from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/20 border-green-200 dark:border-green-800'}`}>
              <CardContent className="pt-6">
                <div className={`text-sm ${excedido ? 'text-red-700 dark:text-red-300' : 'text-green-700 dark:text-green-300'}`}>
                  Gasto según OCs
                </div>
                <div className={`text-2xl font-bold ${excedido ? 'text-red-900 dark:text-red-100' : 'text-green-900 dark:text-green-100'}`}>
                  {formatMoney(totalGastado)}
                </div>
                <div className={`text-xs ${excedido ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                  {porcentajeGastado.toFixed(1)}% del presupuesto
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/20 border-purple-200 dark:border-purple-800">
              <CardContent className="pt-6">
                <div className="text-sm text-purple-700 dark:text-purple-300">Disponible</div>
                <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                  {formatMoney(Math.max(0, montoActual - totalGastado))}
                </div>
                <div className="text-xs text-purple-600 dark:text-purple-400">
                  {obra.pedidos.length} pedidos totales
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Gráfico de montos */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Gráfico de Montos</h3>
            <Card>
              <CardContent className="pt-6">
                <MontosLineChart
                  presupuestado={montoActual}
                  gastado={totalGastado}
                  disponible={Math.max(0, montoActual - totalGastado)}
                />
              </CardContent>
            </Card>
          </div>

          {/* Estado de las OC */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {statusMetrics.map(metric => (
              <Card
                key={metric.label}
                className={`border ${metric.border} ${metric.background}`}
              >
                <CardContent className="pt-5 pb-5 space-y-2">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">
                    {metric.label}
                  </div>
                  <div className={`text-xl font-semibold ${metric.tone}`}>
                    {metric.count}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Monto aproximado: {formatMoney(metric.amount)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Métricas temporales */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {timelineMetrics.map(metric => (
              <Card key={metric.label} className="border bg-muted/40">
                <CardContent className="pt-5 pb-5">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">
                    {metric.label}
                  </div>
                  <div className="text-sm font-medium text-foreground">
                    {metric.value}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Evolución mensual */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Evolución mensual del gasto</h3>
            <MonthlySpendChart data={monthlySeries} />
            {totalEnCurso > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                Se registran {formatMoney(totalEnCurso)} en órdenes aún en curso.
              </p>
            )}
          </div>

          {/* Tabla de pedidos */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Pedidos de la Obra</h3>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>RQI</TableHead>
            <TableHead>N° OC</TableHead>
            <TableHead>Remito</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Monto</TableHead>
          <TableHead>% del Total</TableHead>
          <TableHead>Fechas</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
                </TableHeader>
                <TableBody>
                  {obra.pedidos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No hay pedidos asociados a esta obra
                      </TableCell>
                    </TableRow>
                  ) : (
                    obra.pedidos.map((pedido, index) => {
                      const pedidoPorcentaje = montoActual > 0
                        ? ((getOrderOcTotal(pedido) || pedido.monto_estimado || 0) / montoActual) * 100
                        : 0
                      const ocDoc = pedido.documents?.find((doc) => {
                        const tipo = doc.tipo?.toLowerCase?.() || ''
                        const nombre = doc.nombre?.toLowerCase?.() || ''
                        return tipo.includes('orden') || nombre.includes('oc')
                      })
                      const ocNumero = extractOcNumero(ocDoc?.nombre)

                      return (
                        <TableRow key={pedido.id}>
                          <TableCell className="font-medium">{pedido.rqi}</TableCell>
                          <TableCell className="font-mono text-sm">
                            {ocNumero || '-'}
                          </TableCell>
                          <TableCell className="text-sm">
                            <div className="flex items-center gap-2">
                              <span>{pedido.remito || 'N/A'}</span>
                              {pedido.remito_url && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 px-2"
                                  onClick={() => window.open(pedido.remito_url!, '_blank')}
                                >
                                  Ver remito
                                </Button>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={pedido.estado === 'Finalizado' ? 'default' : 'secondary'}>
                              {pedido.estado === 'Finalizado' && <CheckCircle2 className="h-3 w-3 mr-1 inline" />}
                              {pedido.estado === 'En Curso' && <Clock className="h-3 w-3 mr-1 inline" />}
                              {pedido.estado === 'Pendiente' && <AlertTriangle className="h-3 w-3 mr-1 inline" />}
                              {pedido.estado}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">
                            {formatMoney(getOrderOcTotal(pedido) || pedido.monto_estimado || 0)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden max-w-[100px]">
                                <div 
                                  className={`h-full ${getColorForOrder(index)}`}
                                  style={{ width: `${Math.min(pedidoPorcentaje, 100)}%` }}
                                />
                              </div>
                              <span className="text-sm font-medium min-w-[45px]">
                                {pedidoPorcentaje.toFixed(1)}%
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            <div className="space-y-1">
                              <div>
                                <span className="font-medium text-foreground">Creación:</span>{' '}
                                {formatDateSafely(pedido.fecha_creacion)}
                              </div>
                              {pedido.fecha_necesidad && (
                                <div>
                                  <span className="font-medium text-foreground">Necesidad:</span>{' '}
                                  {formatDateSafely(pedido.fecha_necesidad)}
                                </div>
                              )}
                              <div>
                                <span className="font-medium text-foreground">Finalización:</span>{' '}
                                {pedido.fecha_finalizacion ? formatDateSafely(pedido.fecha_finalizacion) : 'Pendiente'}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {onViewOrderDetail && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => onViewOrderDetail(pedido)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Ver
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Resumen */}
          {excedido && (
            <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                <div>
                  <div className="font-semibold text-red-900 dark:text-red-100">Presupuesto Excedido</div>
                  <div className="text-sm text-red-700 dark:text-red-300">
                    Se ha gastado {formatMoney(totalGastado - montoActual)} más de lo presupuestado
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
  
  function getColorForOrder(index: number) {
    const colors = [
      'bg-blue-500',
      'bg-purple-500',
      'bg-green-500',
      'bg-yellow-500',
      'bg-red-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-teal-500',
    ]
    return colors[index % colors.length]
  }

  function formatDateSafely(value?: string) {
    if (!value) return 'Sin registros'
    try {
      return formatDate(value)
    } catch {
      return value
    }
  }

  function extractOcNumero(nombre?: string) {
    if (!nombre) return ''
    const match = nombre.match(/(\d{4,}-\d{4,})/)
    if (match?.[1]) return match[1]
    const altMatch = nombre.match(/OC\s*[-:]?\s*(\d{4,})/i)
    return altMatch?.[1] || ''
  }
}

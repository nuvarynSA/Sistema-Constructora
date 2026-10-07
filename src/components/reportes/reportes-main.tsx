'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/mock/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { BarChart3, Eye, AlertCircle, Download } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { usePermissions } from '@/hooks/use-permissions'
import { formatDate, formatMoney } from '@/lib/utils'
import type { Obra, Order } from '@/lib/types'
import { ObraDetalleDialog } from './obra-detalle-dialog'
import { OrderDetailDialog } from '@/components/pedidos/order-detail-dialog'
import { MonthlySpendChart } from './monthly-spend-chart'
import { buildMonthlySeries, getOrderDateMetrics, getOrderOcTotal } from './reportes-utils'

interface ObraConPedidos extends Obra {
  pedidos: Order[]
}

export function ReportesMain() {
  const [obras, setObras] = useState<ObraConPedidos[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedObra, setSelectedObra] = useState<ObraConPedidos | null>(null)
  const [showDetalleDialog, setShowDetalleDialog] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [showOrderDetail, setShowOrderDetail] = useState(false)
  const [search, setSearch] = useState('')
  const [subrubroFiltro, setSubrubroFiltro] = useState<string>('todos')
  const [hiddenObras, setHiddenObras] = useState<string[]>([])
  const [showHistoryDialog, setShowHistoryDialog] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyData, setHistoryData] = useState<{
    pedidos: any[]
    obras: any[]
    licitaciones: any[]
    tareas: any[]
    calendario: any[]
    stockReportes: any[]
  }>({
    pedidos: [],
    obras: [],
    licitaciones: [],
    tareas: [],
    calendario: [],
    stockReportes: [],
  })
  const dataClient = createClient()
  const { toast } = useToast()
  const { isAdmin } = usePermissions()
  const canSeeHistory = isAdmin()

  useEffect(() => {
    console.log('[ReportesMain] mount')
    fetchObrasConPedidos()
    const stored = localStorage.getItem('reportes_hidden_obras')
    if (stored) {
      try {
        setHiddenObras(JSON.parse(stored))
      } catch {
        setHiddenObras([])
      }
    }
  }, [])

  useEffect(() => {
    if (showHistoryDialog) {
      fetchHistoryData()
    }
  }, [showHistoryDialog])

  const fetchHistoryData = async () => {
    setHistoryLoading(true)
    try {
      const [pedidosRes, obrasRes, licitacionesRes, tareasRes, stockRes] = await Promise.all([
        dataClient.from('orders').select('*').order('created_at', { ascending: false }),
        dataClient.from('obras').select('*').order('created_at', { ascending: false }),
        dataClient.from('licitaciones').select('*').order('created_at', { ascending: false }),
        dataClient.from('tareas_logistica').select('*').order('created_at', { ascending: false }),
        fetch('/api/stock/reportes').then((res) => res.json()).catch(() => ({ data: [] })),
      ])

      const tareas = tareasRes.data || []
      setHistoryData({
        pedidos: pedidosRes.data || [],
        obras: obrasRes.data || [],
        licitaciones: licitacionesRes.data || [],
        tareas,
        calendario: [...tareas].sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()),
        stockReportes: stockRes?.data || [],
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo cargar el historial.',
        variant: 'destructive',
      })
    } finally {
      setHistoryLoading(false)
    }
  }

  const stringifyValue = (value: any) => {
    if (value === null || value === undefined) return ''
    if (typeof value === 'object') return JSON.stringify(value)
    return String(value)
  }

  const buildCsv = () => {
    const sections = [
      { name: 'pedidos', rows: historyData.pedidos },
      { name: 'obras', rows: historyData.obras },
      { name: 'licitaciones', rows: historyData.licitaciones },
      { name: 'tareas', rows: historyData.tareas },
      { name: 'calendario', rows: historyData.calendario },
      { name: 'stock_reportes', rows: historyData.stockReportes },
    ]

    const allRows = sections.flatMap((section) =>
      section.rows.map((row) => ({ section: section.name, ...row }))
    )
    if (allRows.length === 0) return ''

    const headers = Array.from(
      allRows.reduce((set, row) => {
        Object.keys(row).forEach((key) => set.add(key))
        return set
      }, new Set<string>())
    )

    const csvLines = [
      headers.join(','),
      ...allRows.map((row) =>
        headers
          .map((key) => {
            const value = stringifyValue((row as Record<string, unknown>)[key as string])
            return `"${value.replace(/"/g, '""')}"`
          })
          .join(',')
      ),
    ]

    return csvLines.join('\n')
  }

  const handleDownloadCsv = () => {
    const csv = buildCsv()
    if (!csv) {
      toast({
        title: 'Sin datos',
        description: 'No hay información para exportar.',
      })
      return
    }
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `nexora-backup-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const renderDetailItem = (title: string, subtitle: string, item: any, key: string) => {
    return (
      <details key={key} className="border rounded-md px-3 py-2 bg-background">
        <summary className="cursor-pointer list-none flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="font-medium truncate">{title}</div>
            {subtitle && <div className="text-xs text-muted-foreground truncate">{subtitle}</div>}
          </div>
          <span className="text-xs text-muted-foreground">Ver detalle</span>
        </summary>
        <pre className="mt-3 text-xs whitespace-pre-wrap break-words bg-muted/40 rounded-md p-2">
          {JSON.stringify(item, null, 2)}
        </pre>
      </details>
    )
  }

  const fetchObrasConPedidos = async () => {
    setLoading(true)
    try {
      const { data: obrasData, error: obrasError } = await dataClient
        .from('obras')
        .select('id, nombre, imputacion, monto_estimado, monto_gastado, estado, fecha_inicio, fecha_fin_estimada, created_at, obra_montos(id, monto, created_at)')
        .order('nombre')

      if (obrasError) throw obrasError

      const { data: pedidosData, error: pedidosError } = await dataClient
        .from('orders')
        .select(
          `
          id,
          rqi,
          obra_id,
          estado,
          monto_estimado,
          monto_oc,
          montos_oc,
          fecha_creacion,
          fecha_finalizacion,
          fecha_necesidad,
          detalle_materiales,
          created_at
        `
        )
        .not('obra_id', 'is', null)
        .order('fecha_finalizacion', { ascending: false })

      if (pedidosError) throw pedidosError

      const pedidosByObra = new Map<string, Order[]>()
      ;(pedidosData || []).forEach((pedido) => {
        const obraId = (pedido as any).obra_id as string | undefined
        if (!obraId) return
        const list = pedidosByObra.get(obraId) || []
        list.push(pedido as Order)
        pedidosByObra.set(obraId, list)
      })

      const obrasConPedidos = (obrasData || []).map((obra) => ({
        ...(obra as Obra),
        pedidos: pedidosByObra.get(obra.id) || [],
      })) as ObraConPedidos[]

      // Filtrar solo obras que tienen al menos un pedido
      const obrasConDatos = obrasConPedidos.filter(obra => obra.pedidos.length > 0)

      setObras(obrasConDatos)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los reportes',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  // Retorna el último Monto de Obra Adjudicado registrado, o monto_estimado como fallback
  const getLatestMonto = (obra: ObraConPedidos): number => {
    const montos = (obra as any).obra_montos as { monto: number; created_at: string }[] | undefined
    if (!montos || montos.length === 0) return obra.monto_estimado
    const sorted = [...montos].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    return Number(sorted[0].monto)
  }

  const toggleHideObra = (obraId: string) => {
    setHiddenObras((prev) => {
      const exists = prev.includes(obraId)
      const next = exists ? prev.filter(id => id !== obraId) : [...prev, obraId]
      localStorage.setItem('reportes_hidden_obras', JSON.stringify(next))
      return next
    })
  }

  const extractSubrubros = (obra: ObraConPedidos) => {
    const codes = new Set<string>()
    obra.pedidos.forEach((pedido) => {
      const matches = (pedido.detalle_materiales || '').match(/\b\d[\d.]{2,}\b/g)
      matches?.forEach((m) => codes.add(m))
    })
    return Array.from(codes)
  }

  const subrubroOptions = Array.from(
    new Set(
      obras.flatMap((obra) => extractSubrubros(obra))
    )
  )

  const applyFilters = (lista: ObraConPedidos[]) => {
    const searchTerm = search.toLowerCase()
    return lista.filter((obra) => {
      const matchesSearch = !searchTerm || obra.nombre.toLowerCase().includes(searchTerm) || obra.imputacion.toLowerCase().includes(searchTerm)
      const matchesSubrubro = subrubroFiltro === 'todos' || extractSubrubros(obra).includes(subrubroFiltro)
      return matchesSearch && matchesSubrubro
    })
  }

  const visibles = applyFilters(obras.filter((obra) => !hiddenObras.includes(obra.id)))
  const archivadas = applyFilters(obras.filter((obra) => hiddenObras.includes(obra.id)))

  const handleVerDetalle = (obra: ObraConPedidos) => {
    setSelectedObra(obra)
    setShowDetalleDialog(true)
  }

  const handleViewOrderDetail = (order: Order) => {
    setSelectedOrder(order)
    setShowOrderDetail(true)
  }

  const handleOrderUpdate = () => {
    setShowOrderDetail(false)
    fetchObrasConPedidos()
  }

  const getColorForOrder = (index: number) => {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 animate-in slide-in-from-left-4 duration-500">
              Reportes de Obras
            </h1>
            <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">
              Seguimiento presupuestario por obra con detalle de cada OC
            </p>
          </div>
          {canSeeHistory && (
            <Button onClick={() => setShowHistoryDialog(true)} className="gap-2">
              Historial
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Filtrar por nombre de obra o imputación..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select value={subrubroFiltro} onValueChange={setSubrubroFiltro}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por subrubro" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los subrubros</SelectItem>
              {subrubroOptions.map((codigo) => (
                <SelectItem key={codigo} value={codigo}>
                  {codigo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Lista de obras con progress bars */}
        <div className="grid grid-cols-1 gap-6">
          {visibles.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No hay obras registradas</p>
              </CardContent>
            </Card>
          ) : (
            visibles.map((obra) => {
              const pedidosFinalizados = obra.pedidos.filter(p => p.estado === 'Finalizado')
              const pedidosEnCurso = obra.pedidos.filter(p => p.estado === 'En Curso')
              const pedidosPendientes = obra.pedidos.filter(p => p.estado === 'Pendiente')
              const totalGastado = pedidosFinalizados.reduce((sum, p) => sum + (getOrderOcTotal(p) || 0), 0)
              const totalEnCurso = pedidosEnCurso.reduce((sum, p) => sum + (getOrderOcTotal(p) || 0), 0)
              const montoActual = getLatestMonto(obra)
              const porcentaje = montoActual > 0
                ? (totalGastado / montoActual) * 100
                : 0
              const excedido = porcentaje > 100
              const monthlySeries = buildMonthlySeries(pedidosFinalizados)
              const dateMetrics = getOrderDateMetrics(obra.pedidos)
              const getFechaColor = (fechaInicio?: string, fechaFin?: string) => {
                if (!fechaFin) return 'text-muted-foreground'
                
                const hoy = new Date()
                hoy.setHours(0, 0, 0, 0)
                const fechaFinDate = new Date(fechaFin)
                fechaFinDate.setHours(0, 0, 0, 0)
                
                const diasRestantes = Math.ceil((fechaFinDate.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
                
                if (diasRestantes < 0) {
                  return 'text-red-600 dark:text-red-400'
                } else if (diasRestantes <= 10) {
                  return 'text-orange-600 dark:text-orange-400'
                } else {
                  return 'text-green-600 dark:text-green-400'
                }
              }

              const getFechaBgColor = (fechaInicio?: string, fechaFin?: string) => {
                if (!fechaFin) return 'bg-muted/40'
                
                const hoy = new Date()
                hoy.setHours(0, 0, 0, 0)
                const fechaFinDate = new Date(fechaFin)
                fechaFinDate.setHours(0, 0, 0, 0)
                
                const diasRestantes = Math.ceil((fechaFinDate.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
                
                if (diasRestantes < 0) {
                  return 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
                } else if (diasRestantes <= 10) {
                  return 'bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800'
                } else {
                  return 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
                }
              }

              const timelineMetrics = [
                {
                  label: 'Fecha inicio',
                  value: obra.fecha_inicio ? formatDateSafe(obra.fecha_inicio) : 'Sin definir',
                  color: getFechaColor(obra.fecha_inicio, obra.fecha_fin_estimada),
                  bgColor: getFechaBgColor(obra.fecha_inicio, obra.fecha_fin_estimada),
                },
                {
                  label: 'Fecha final',
                  value: obra.fecha_fin_estimada ? formatDateSafe(obra.fecha_fin_estimada) : 'Sin definir',
                  color: getFechaColor(obra.fecha_inicio, obra.fecha_fin_estimada),
                  bgColor: getFechaBgColor(obra.fecha_inicio, obra.fecha_fin_estimada),
                },
              ]
              const statusCards = [
                {
                  label: 'OCs pendientes',
                  value: pedidosPendientes.length,
                  tone: 'text-yellow-600 dark:text-yellow-400',
                  border: 'border-yellow-200 dark:border-yellow-900/40',
                  background: 'bg-yellow-50 dark:bg-yellow-950/20',
                },
                {
                  label: 'OCs en curso',
                  value: pedidosEnCurso.length,
                  tone: 'text-blue-600 dark:text-blue-400',
                  border: 'border-blue-200 dark:border-blue-900/40',
                  background: 'bg-blue-50 dark:bg-blue-950/20',
                },
                {
                  label: 'OCs finalizadas',
                  value: pedidosFinalizados.length,
                  tone: 'text-emerald-600 dark:text-emerald-400',
                  border: 'border-emerald-200 dark:border-emerald-900/40',
                  background: 'bg-emerald-50 dark:bg-emerald-950/20',
                },
              ]

              return (
                <Card key={obra.id} className="overflow-hidden transition-all duration-300 hover:shadow-lg">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="flex items-center gap-2">
                          {obra.nombre}
                          {excedido && (
                            <span title="Presupuesto excedido">
                              <AlertCircle className="h-5 w-5 text-red-500" />
                            </span>
                          )}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-2">
                          <Badge variant="outline">{obra.imputacion}</Badge>
                          <Badge variant={obra.estado === 'Activa' ? 'default' : 'secondary'}>
                            {obra.estado}
                          </Badge>
                        </CardDescription>
                      </div>
                      <div className="text-right space-y-1">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => toggleHideObra(obra.id)}>
                            Ocultar
                          </Button>
                        </div>
                        <div className="text-sm text-muted-foreground">Presupuesto</div>
                        <div className="text-xl font-bold">{formatMoney(montoActual)}</div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Resumen de estados */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {statusCards.map(card => (
                        <div
                          key={card.label}
                          className={`rounded-md border ${card.border} ${card.background} p-3`}
                        >
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">{card.label}</p>
                          <p className={`text-lg font-semibold ${card.tone}`}>{card.value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Métricas de fechas */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {timelineMetrics.map(metric => (
                        <div key={metric.label} className={`rounded-md border p-3 ${metric.bgColor || 'bg-muted/40'}`}>
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">{metric.label}</p>
                          <p className={`text-sm font-medium ${metric.color || 'text-foreground'}`}>{metric.value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Progress bar general */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">Gasto según OCs: {formatMoney(totalGastado)}</span>
                        <span className={`font-bold ${excedido ? 'text-red-500' : 'text-green-600'}`}>
                          {porcentaje.toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-500 ${
                            excedido ? 'bg-red-500' : porcentaje >= 80 ? 'bg-yellow-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(porcentaje, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Progress bar detallada por OC */}
                    {pedidosFinalizados.length > 0 && (
                      <div className="space-y-3">
                        <div className="text-sm font-medium">Desglose por Pedido ({pedidosFinalizados.length} OCs finalizadas)</div>
                        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden flex">
                          {pedidosFinalizados.map((pedido, index) => {
                            const pedidoPorcentaje = montoActual > 0
                              ? ((getOrderOcTotal(pedido) || pedido.monto_estimado || 0) / montoActual) * 100
                              : 0

                            return (
                              <div
                                key={pedido.id}
                                className={`${getColorForOrder(index)} hover:opacity-80 cursor-help transition-opacity`}
                                style={{ width: `${pedidoPorcentaje}%` }}
                                title={`${pedido.rqi}: ${formatMoney(getOrderOcTotal(pedido) || pedido.monto_estimado || 0)} (${pedidoPorcentaje.toFixed(1)}%)`}
                              />
                            )
                          })}
                        </div>

                        {/* Leyenda */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {pedidosFinalizados.slice(0, 6).map((pedido, index) => {
                            const pedidoPorcentaje = montoActual > 0
                              ? ((getOrderOcTotal(pedido) || pedido.monto_estimado || 0) / montoActual) * 100
                              : 0

                            return (
                              <div key={pedido.id} className="flex items-center gap-2 text-xs">
                                <div className={`w-3 h-3 rounded-full ${getColorForOrder(index)}`} />
                                <span className="truncate">{pedido.rqi}</span>
                                <span className="text-muted-foreground">{pedidoPorcentaje.toFixed(1)}%</span>
                              </div>
                            )
                          })}
                          {pedidosFinalizados.length > 6 && (
                            <div className="text-xs text-muted-foreground">
                              +{pedidosFinalizados.length - 6} más
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Evolución temporal */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">Evolución mensual del gasto</span>
                        {monthlySeries.length > 0 && (
                          <Badge variant="secondary">
                            Últimos {monthlySeries.length} {monthlySeries.length === 1 ? 'mes' : 'meses'}
                          </Badge>
                        )}
                      </div>
                      <MonthlySpendChart data={monthlySeries} />
                      {totalEnCurso > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Quedan {formatMoney(totalEnCurso)} en órdenes que aún no finalizaron.
                        </p>
                      )}
                    </div>

                    {/* Botón ver detalle */}
                    <div className="pt-2">
                      <Button 
                        onClick={() => handleVerDetalle(obra)}
                        variant="outline"
                        className="w-full gap-2 transition-all hover:scale-105"
                      >
                        <Eye className="h-4 w-4" />
                        Ver Detalle Completo
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>

        {archivadas.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">Ocultos/Archivados</h2>
              <Badge variant="secondary">{archivadas.length}</Badge>
            </div>
            <div className="grid grid-cols-1 gap-6">
              {archivadas.map((obra) => {
                const pedidosFinalizados = obra.pedidos.filter(p => p.estado === 'Finalizado')
                const pedidosEnCurso = obra.pedidos.filter(p => p.estado === 'En Curso')
                const pedidosPendientes = obra.pedidos.filter(p => p.estado === 'Pendiente')
                const totalGastado = pedidosFinalizados.reduce((sum, p) => sum + (getOrderOcTotal(p) || 0), 0)
                const totalEnCurso = pedidosEnCurso.reduce((sum, p) => sum + (getOrderOcTotal(p) || 0), 0)
                const montoActual = getLatestMonto(obra)
                const porcentaje = montoActual > 0
                  ? (totalGastado / montoActual) * 100
                  : 0
                const excedido = porcentaje > 100
                const monthlySeries = buildMonthlySeries(pedidosFinalizados)
                const dateMetrics = getOrderDateMetrics(obra.pedidos)
                const getFechaColor = (fechaInicio?: string, fechaFin?: string) => {
                  if (!fechaFin) return 'text-muted-foreground'
                  
                  const hoy = new Date()
                  hoy.setHours(0, 0, 0, 0)
                  const fechaFinDate = new Date(fechaFin)
                  fechaFinDate.setHours(0, 0, 0, 0)
                  
                  const diasRestantes = Math.ceil((fechaFinDate.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
                  
                  if (diasRestantes < 0) {
                    return 'text-red-600 dark:text-red-400'
                  } else if (diasRestantes <= 10) {
                    return 'text-orange-600 dark:text-orange-400'
                  } else {
                    return 'text-green-600 dark:text-green-400'
                  }
                }

                const getFechaBgColor = (fechaInicio?: string, fechaFin?: string) => {
                  if (!fechaFin) return 'bg-muted/40'
                  
                  const hoy = new Date()
                  hoy.setHours(0, 0, 0, 0)
                  const fechaFinDate = new Date(fechaFin)
                  fechaFinDate.setHours(0, 0, 0, 0)
                  
                  const diasRestantes = Math.ceil((fechaFinDate.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
                  
                  if (diasRestantes < 0) {
                    return 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
                  } else if (diasRestantes <= 10) {
                    return 'bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800'
                  } else {
                    return 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
                  }
                }

                const timelineMetrics = [
                  {
                    label: 'Fecha inicio',
                    value: obra.fecha_inicio ? formatDateSafe(obra.fecha_inicio) : 'Sin definir',
                    color: getFechaColor(obra.fecha_inicio, obra.fecha_fin_estimada),
                    bgColor: getFechaBgColor(obra.fecha_inicio, obra.fecha_fin_estimada),
                  },
                  {
                    label: 'Fecha final',
                    value: obra.fecha_fin_estimada ? formatDateSafe(obra.fecha_fin_estimada) : 'Sin definir',
                    color: getFechaColor(obra.fecha_inicio, obra.fecha_fin_estimada),
                    bgColor: getFechaBgColor(obra.fecha_inicio, obra.fecha_fin_estimada),
                  },
                ]

                return (
                  <Card key={obra.id} className="border-dashed">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="flex items-center gap-2">
                            {obra.nombre}
                          </CardTitle>
                          <CardDescription className="flex items-center gap-2">
                            <Badge variant="outline">{obra.imputacion}</Badge>
                            <Badge variant={obra.estado === 'Activa' ? 'default' : 'secondary'}>
                              {obra.estado}
                            </Badge>
                          </CardDescription>
                        </div>
                        <div className="text-right space-y-1">
                          <Button variant="outline" size="sm" onClick={() => toggleHideObra(obra.id)}>
                            Reestablecer
                          </Button>
                          <div className="text-sm text-muted-foreground">Presupuesto</div>
                          <div className="text-xl font-bold">{formatMoney(montoActual)}</div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="rounded-md border p-3">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">OCs pendientes</p>
                          <p className="text-lg font-semibold text-yellow-600">{pedidosPendientes.length}</p>
                        </div>
                        <div className="rounded-md border p-3">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">OCs en curso</p>
                          <p className="text-lg font-semibold text-blue-600">{pedidosEnCurso.length}</p>
                        </div>
                        <div className="rounded-md border p-3">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">OCs finalizadas</p>
                          <p className="text-lg font-semibold text-emerald-600">{pedidosFinalizados.length}</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">Gasto según OCs: {formatMoney(totalGastado)}</span>
                          <span className={`font-bold ${excedido ? 'text-red-500' : 'text-green-600'}`}>
                            {porcentaje.toFixed(1)}%
                          </span>
                        </div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-500 ${
                              excedido ? 'bg-red-500' : porcentaje >= 80 ? 'bg-yellow-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(porcentaje, 100)}%` }}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {timelineMetrics.map(metric => (
                          <div key={metric.label} className={`rounded-md border p-3 ${metric.bgColor || 'bg-muted/40'}`}>
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">{metric.label}</p>
                            <p className={`text-sm font-medium ${metric.color || 'text-foreground'}`}>{metric.value}</p>
                          </div>
                        ))}
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-foreground">Evolución mensual del gasto</span>
                          {monthlySeries.length > 0 && (
                            <Badge variant="secondary">
                              Últimos {monthlySeries.length} {monthlySeries.length === 1 ? 'mes' : 'meses'}
                            </Badge>
                          )}
                        </div>
                        <MonthlySpendChart data={monthlySeries} />
                        {totalEnCurso > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Quedan {formatMoney(totalEnCurso)} en órdenes que aún no finalizaron.
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {selectedObra && (
        <ObraDetalleDialog
          open={showDetalleDialog}
          onOpenChange={setShowDetalleDialog}
          obra={selectedObra}
          onViewOrderDetail={handleViewOrderDetail}
        />
      )}

      {selectedOrder && (
        <OrderDetailDialog
          order={selectedOrder}
          open={showOrderDetail}
          onOpenChange={setShowOrderDetail}
          onUpdate={handleOrderUpdate}
        />
      )}

      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between gap-4">
              <DialogTitle>Historial</DialogTitle>
              <Button size="sm" onClick={handleDownloadCsv} className="gap-2">
                <Download className="h-4 w-4" />
                Descargar
              </Button>
            </div>
          </DialogHeader>
          {historyLoading ? (
            <div className="flex items-center justify-center py-10">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="space-y-6 text-sm">
              <section className="space-y-2">
                <h3 className="font-semibold">Pedidos ({historyData.pedidos.length})</h3>
                <div className="space-y-2">
                  {historyData.pedidos.map((pedido) =>
                    renderDetailItem(
                      pedido.titulo || pedido.rqi || pedido.id,
                      `${pedido.estado || ''} ${pedido.created_at ? `· ${formatDateSafe(pedido.created_at)}` : ''}`.trim(),
                      pedido,
                      `pedido-${pedido.id}`
                    )
                  )}
                </div>
              </section>

              <section className="space-y-2">
                <h3 className="font-semibold">Obras ({historyData.obras.length})</h3>
                <div className="space-y-2">
                  {historyData.obras.map((obra) =>
                    renderDetailItem(
                      obra.nombre || obra.id,
                      `${obra.imputacion || ''} ${obra.created_at ? `· ${formatDateSafe(obra.created_at)}` : ''}`.trim(),
                      obra,
                      `obra-${obra.id}`
                    )
                  )}
                </div>
              </section>

              <section className="space-y-2">
                <h3 className="font-semibold">Licitaciones ({historyData.licitaciones.length})</h3>
                <div className="space-y-2">
                  {historyData.licitaciones.map((licitacion) =>
                    renderDetailItem(
                      licitacion.titulo || licitacion.id,
                      `${licitacion.estado || ''} ${licitacion.created_at ? `· ${formatDateSafe(licitacion.created_at)}` : ''}`.trim(),
                      licitacion,
                      `licitacion-${licitacion.id}`
                    )
                  )}
                </div>
              </section>

              <section className="space-y-2">
                <h3 className="font-semibold">Logística - Tareas ({historyData.tareas.length})</h3>
                <div className="space-y-2">
                  {historyData.tareas.map((tarea) =>
                    renderDetailItem(
                      tarea.titulo || tarea.tln || tarea.id,
                      `${tarea.estado || ''} ${tarea.fecha ? `· ${formatDateSafe(tarea.fecha)}` : ''}`.trim(),
                      tarea,
                      `tarea-${tarea.id}`
                    )
                  )}
                </div>
              </section>

              <section className="space-y-2">
                <h3 className="font-semibold">Logística - Calendario ({historyData.calendario.length})</h3>
                <div className="space-y-2">
                  {historyData.calendario.map((tarea) =>
                    renderDetailItem(
                      tarea.titulo || tarea.tln || tarea.id,
                      `${tarea.estado || ''} ${tarea.fecha ? `· ${formatDateSafe(tarea.fecha)}` : ''}`.trim(),
                      tarea,
                      `cal-${tarea.id}`
                    )
                  )}
                </div>
              </section>

              <section className="space-y-2">
                <h3 className="font-semibold">Logística - Control de stock ({historyData.stockReportes.length})</h3>
                <div className="space-y-2">
                  {historyData.stockReportes.map((obra) =>
                    renderDetailItem(
                      obra.obraNombre || obra.obraId,
                      `Imputaciones: ${obra.imputaciones?.length || 0}`,
                      obra,
                      `stock-${obra.obraId}`
                    )
                  )}
                </div>
              </section>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

function formatDateSafe(value: string): string {
  try {
    return formatDate(value)
  } catch {
    return value
  }
}

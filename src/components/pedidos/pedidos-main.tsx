'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/mock/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Search, LayoutGrid, List, X } from 'lucide-react'
import { PedidosKanban } from './pedidos-kanban'
import { PedidosTable } from './pedidos-table'
import { NewOrderDialog } from './new-order-dialog'
import { ObrasSidebar } from './obras-sidebar'
import type { Order } from '@/lib/types'
import { useAuth } from '@/hooks/use-auth'

export function PedidosMain() {
  const [orders, setOrders] = useState<Order[]>([])
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [historyMatchedOrderIds, setHistoryMatchedOrderIds] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban')
  const [showNewOrderDialog, setShowNewOrderDialog] = useState(false)
  const [selectedObraId, setSelectedObraId] = useState<string | null>(null)
  const [obraNombre, setObraNombre] = useState<string>('')
  const [notifCountByOrder, setNotifCountByOrder] = useState<Record<string, number>>({})
  const dataClient = createClient()
  const { userData, ensureUserData } = useAuth()
  const hasLoadedRef = useRef(false)

  const fetchNotifCounts = useCallback(async () => {
    if (!userData?.id) return
    try {
      const { data } = await dataClient
        .from('notifications')
        .select('reference_id')
        .eq('user_id', userData.id)
        .eq('is_read', false)
        .eq('reference_type', 'order')

      const counts: Record<string, number> = {}
      for (const notif of data || []) {
        if (notif.reference_id) {
          counts[notif.reference_id] = (counts[notif.reference_id] || 0) + 1
        }
      }
      setNotifCountByOrder(counts)
    } catch (err) {
      console.error('[PedidosMain] fetchNotifCounts:error', err)
    }
  }, [dataClient, userData?.id])

  const fetchOrders = useCallback(async () => {
    if (!hasLoadedRef.current) {
      setLoading(true)
    }
    try {
      const { data, error } = await dataClient
        .from('orders')
        .select(
          `
          *,
          solicitante:users!solicitante_id(id, name, email, area, avatar, role_id),
          responsable:users!responsable_id(id, name, email, area, avatar, role_id)
        `
        )
        .order('created_at', { ascending: false })

      if (error) throw error

      const hydrated = (data || []) as Order[]
      setOrders(hydrated)
      setFilteredOrders(hydrated)
      hasLoadedRef.current = true
    } catch (error) {
      console.error('[PedidosMain] fetchOrders:error', error)
      setOrders([])
      setFilteredOrders([])
    } finally {
      setLoading(false)
    }
  }, [dataClient])

  useEffect(() => {
    fetchOrders()
    // Verificar RQI próximas a fecha estimada cuando se carga la página
    const { checkRQIApproachingDate } = require('@/lib/notifications/check-dates')
    checkRQIApproachingDate()
  }, [fetchOrders])

  useEffect(() => {
    fetchNotifCounts()
  }, [fetchNotifCounts])

  useEffect(() => {
    if (!userData) {
      ensureUserData()
    }
  }, [userData, ensureUserData])

  useEffect(() => {
    filterOrders()
  }, [searchTerm, orders, selectedObraId, historyMatchedOrderIds])

  useEffect(() => {
    const trimmedTerm = searchTerm.trim()

    if (!trimmedTerm || trimmedTerm.length < 3) {
      setHistoryMatchedOrderIds([])
      return
    }

    let cancelled = false
    const timeoutId = window.setTimeout(async () => {
      try {
        // Buscar en paralelo:
        // 1. Archivos de descripción subidos (por nombre de archivo)
        // 2. Archivos subidos en comentarios (por nombre de archivo)
        // 3. Texto de comentarios (contenido del comentario)
        const [histDescripcion, histComentario, comentarios] = await Promise.all([
          dataClient
            .from('order_histories')
            .select('order_id')
            .eq('tipo', 'descripcion_upload')
            .ilike('accion', `%${trimmedTerm}%`),

          dataClient
            .from('order_histories')
            .select('order_id')
            .eq('tipo', 'comentario_upload')
            .ilike('accion', `%${trimmedTerm}%`),

          dataClient
            .from('comments')
            .select('order_id')
            .not('order_id', 'is', null)
            .ilike('content', `%${trimmedTerm}%`),
        ])

        if (cancelled) return

        const ids = new Set<string>()

        for (const row of histDescripcion.data || []) {
          if (row.order_id) ids.add(row.order_id)
        }
        for (const row of histComentario.data || []) {
          if (row.order_id) ids.add(row.order_id)
        }
        for (const row of comentarios.data || []) {
          if (row.order_id) ids.add(row.order_id)
        }

        setHistoryMatchedOrderIds(Array.from(ids))
      } catch (error) {
        console.error('[PedidosMain] searchInHistory:error', error)
        if (!cancelled) {
          setHistoryMatchedOrderIds([])
        }
      }
    }, 250)

    return () => {
      cancelled = true
      window.clearTimeout(timeoutId)
    }
  }, [searchTerm, dataClient])

  useEffect(() => {
    const channel = dataClient
      .channel('orders-main-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchOrders()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
        fetchNotifCounts()
      })
      .subscribe()

    return () => {
      dataClient.removeChannel(channel)
    }
  }, [fetchOrders, fetchNotifCounts, dataClient])

  const filterOrders = () => {
    let filtered = [...orders]
    const historyMatches = new Set(historyMatchedOrderIds)

    // Filtrar por obra seleccionada
    if (selectedObraId) {
      filtered = filtered.filter(order => order.obra_id === selectedObraId)
    }

    // Filtrar por término de búsqueda
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(order =>
        (order.rqi ?? '').toLowerCase().includes(searchLower) ||
        (order.obra ?? '').toLowerCase().includes(searchLower) ||
        (order.estado ?? '').toLowerCase().includes(searchLower) ||
        (order.estado_detallado ?? '').toLowerCase().includes(searchLower) ||
        (order.solicitante?.name ?? '').toLowerCase().includes(searchLower) ||
        (order.remito ?? '').toLowerCase().includes(searchLower) ||
        (order.lugar_entrega ?? '').toLowerCase().includes(searchLower) ||
        (order.area_solicitud ?? '').toLowerCase().includes(searchLower) ||
        historyMatches.has(order.id)
      )
    }

    setFilteredOrders(filtered)
  }

  const handleSelectObra = async (obraId: string | null) => {
    setSelectedObraId(obraId)
    
    if (obraId) {
      const { data } = await dataClient
        .from('obras')
        .select('nombre')
        .eq('id', obraId)
        .single()
      
      setObraNombre(data?.nombre || '')
    } else {
      setObraNombre('')
    }
  }

  const handleOrderCreated = () => {
    setShowNewOrderDialog(false)
    fetchOrders()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="flex flex-col lg:flex-row gap-0 -mx-4 sm:-mx-6 lg:-mx-8 -my-4 sm:-my-6 lg:-my-8">
      {/* Sidebar de Obras */}
      <ObrasSidebar 
        onSelectObra={handleSelectObra} 
        selectedObraId={selectedObraId}
      />

      {/* Contenido Principal */}
      <div className="flex-1 space-y-6 px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 animate-in slide-in-from-left-4 duration-500">
                Pedidos (RQI)
              </h1>
              {selectedObraId && obraNombre && (
                <Badge variant="outline" className="gap-2 px-3 py-1 animate-in zoom-in-50">
                  {obraNombre}
                  <button
                    onClick={() => handleSelectObra(null)}
                    className="hover:text-destructive transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
            </div>
            <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">
              {selectedObraId 
                ? `Pedidos de ${obraNombre}` 
                : 'Gestión de pedidos de compra y materiales'}
            </p>
          </div>
        <Button 
          onClick={() => setShowNewOrderDialog(true)} 
          className="gap-2 transition-all duration-200 hover:scale-105 active:scale-95 shadow-md hover:shadow-lg w-full sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          <span className="sm:inline">Nuevo Pedido</span>
        </Button>
      </div>

      {/* Search and View Toggle */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar por RQI, obra, estado, historial o N° de OC..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'kanban' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('kanban')}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'table' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('table')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'kanban' ? (
        <PedidosKanban orders={filteredOrders} onUpdate={() => { fetchOrders(); fetchNotifCounts() }} notifCountByOrder={notifCountByOrder} />
      ) : (
        <PedidosTable orders={filteredOrders} onUpdate={fetchOrders} />
      )}

      {/* New Order Dialog */}
        <NewOrderDialog
          open={showNewOrderDialog}
          onOpenChange={setShowNewOrderDialog}
          onSuccess={handleOrderCreated}
        />
      </div>
    </div>
  )
}

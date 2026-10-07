'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Plus, Package, Truck, ShoppingCart, TrendingUp, AlertCircle, RefreshCw } from 'lucide-react'
import { MaterialesTab } from './stock/materiales-tab'
import { ProveedoresTab } from './stock/proveedores-tab'
import { OperacionesTab } from './stock/operaciones-tab'
import { ReportesTab } from './stock/reportes-tab'

interface StockStats {
  totalMateriales: number
  totalProveedores: number
  movimientosHoy: number
}

export function StockMain() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<StockStats>({
    totalMateriales: 0,
    totalProveedores: 0,
    movimientosHoy: 0,
  })
  const [refreshKey, setRefreshKey] = useState(0)

  const fetchStats = useCallback(async () => {
    const start = Date.now()
    console.log('[StockMain] fetch:start')
    const timeoutId = window.setTimeout(() => {
      console.warn('[StockMain] fetch:timeout >8s')
      setLoading(false)
    }, 8000)
    setLoading(true)
    try {
      const [materialesRes, proveedoresRes] = await Promise.all([
        fetch('/api/stock/materiales'),
        fetch('/api/stock/proveedores'),
      ])

      const materialesData = await materialesRes.json()
      const proveedoresData = await proveedoresRes.json()

      setStats({
        totalMateriales: materialesData.data?.length || 0,
        totalProveedores: proveedoresData.data?.length || 0,
        movimientosHoy: 0, // Calculado desde reportes
      })
    } catch (error) {
      console.error('[StockMain] fetch:error', error)
    } finally {
      window.clearTimeout(timeoutId)
      console.log('[StockMain] fetch:end', { ms: Date.now() - start })
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    console.log('[StockMain] mount', { refreshKey })
    fetchStats()
  }, [fetchStats, refreshKey])

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1)
  }

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Control de Stock</h1>
          <p className="text-muted-foreground mt-1">Gestión de materiales, proveedores y operaciones de stock</p>
        </div>
        <Button
          onClick={handleRefresh}
          variant="outline"
          size="icon"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Materiales</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMateriales}</div>
            <p className="text-xs text-muted-foreground">Registrados en el sistema</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Proveedores</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProveedores}</div>
            <p className="text-xs text-muted-foreground">Proveedores activos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Movimientos</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.movimientosHoy}</div>
            <p className="text-xs text-muted-foreground">Hoy</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="materiales">Materiales</TabsTrigger>
          <TabsTrigger value="proveedores">Proveedores</TabsTrigger>
          <TabsTrigger value="operaciones">Operaciones</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          <ReportesTab refreshKey={refreshKey} />
        </TabsContent>

        <TabsContent value="materiales" className="space-y-4">
          <MaterialesTab refreshKey={refreshKey} onDataChange={handleRefresh} />
        </TabsContent>

        <TabsContent value="proveedores" className="space-y-4">
          <ProveedoresTab refreshKey={refreshKey} onDataChange={handleRefresh} />
        </TabsContent>

        <TabsContent value="operaciones" className="space-y-4">
          <OperacionesTab refreshKey={refreshKey} onDataChange={handleRefresh} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

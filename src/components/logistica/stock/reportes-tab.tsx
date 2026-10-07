'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Search, TrendingUp, Package, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils'

interface ReporteStock {
  material: { nombre: string }
  cantidad: number
  imputacion: { codigo: string }
}

interface Movimiento {
  id: string
  tipoMovimiento: string
  cantidad: number
  fecha: string
  usuario?: string
  observaciones?: string
  material: { nombre: string }
  imputacion: { codigo: string; obra?: { nombre: string } }
}

export function ReportesTab({ refreshKey }: { refreshKey: number }) {
  const [reportes, setReportes] = useState<ReporteStock[]>([])
  const [movimientos, setMovimientos] = useState<Movimiento[]>([])
  const [loading, setLoading] = useState(true)
  const [searchObra, setSearchObra] = useState('')

  const fetchReportes = async () => {
    setLoading(true)
    try {
      const [reportesRes, movimientosRes] = await Promise.all([
        fetch('/api/stock/reportes'),
        fetch('/api/stock/movimientos?limit=50'),
      ])
      
      const reportesData = await reportesRes.json()
      const movimientosData = await movimientosRes.json()
      
      setReportes(reportesData.data?.slice(0, 10) || [])
      setMovimientos(movimientosData.data || [])
    } catch (error) {
      toast.error('Error al cargar reportes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    console.log('[ReportesTab] mount', { refreshKey })
    fetchReportes()
  }, [refreshKey])

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Stock Bajo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Materiales con stock bajo</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportes.length}</div>
            <p className="text-xs text-muted-foreground">En el sistema</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Movimientos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">Esta semana</p>
          </CardContent>
        </Card>
      </div>

      {/* Búsqueda y Reporte */}
      <Card>
        <CardHeader>
          <CardTitle>Stock por Obra/Imputación</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por imputación o material..."
              value={searchObra}
              onChange={(e) => setSearchObra(e.target.value)}
              className="pl-8"
            />
          </div>

          {loading ? (
            <p className="text-center text-muted-foreground py-8">Cargando reportes...</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Imputación</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead className="text-right">Cantidad</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportes.slice(0, 10).map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{item.imputacion?.codigo || '-'}</TableCell>
                      <TableCell>{item.material?.nombre || '-'}</TableCell>
                      <TableCell className="text-right">
                        {Number(item.cantidad || 0).toFixed(4)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {reportes.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No hay datos para mostrar</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Listado de Operaciones */}
      <Card>
        <CardHeader>
          <CardTitle>Listado de Operaciones</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Cargando operaciones...</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead>Imputación</TableHead>
                    <TableHead>Obra</TableHead>
                    <TableHead className="text-right">Cantidad</TableHead>
                    <TableHead>Usuario</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movimientos.map((mov) => (
                    <TableRow key={mov.id}>
                      <TableCell>{formatDate(mov.fecha)}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs ${
                          mov.tipoMovimiento === 'Entrada' ? 'bg-green-100 text-green-800' :
                          mov.tipoMovimiento === 'Salida' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {mov.tipoMovimiento}
                        </span>
                      </TableCell>
                      <TableCell>{mov.material.nombre}</TableCell>
                      <TableCell>{mov.imputacion.codigo}</TableCell>
                      <TableCell>{mov.imputacion.obra?.nombre || '-'}</TableCell>
                      <TableCell className="text-right">{mov.cantidad.toFixed(4)}</TableCell>
                      <TableCell>{mov.usuario || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {movimientos.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No hay operaciones registradas</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

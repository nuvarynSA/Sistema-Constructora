'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils'

interface Compra {
  id: string
  fecha: string
  proveedor?: { nombre: string }
  detalles?: any[]
  observaciones?: string
}

export function ComprasTab({ refreshKey, onDataChange }: { refreshKey: number; onDataChange: () => void }) {
  const [compras, setCompras] = useState<Compra[]>([])
  const [loading, setLoading] = useState(true)

  const fetchCompras = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/stock/compras')
      const data = await res.json()
      setCompras(data.data || [])
    } catch (error) {
      toast.error('Error al cargar compras')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    console.log('[ComprasTab] mount', { refreshKey })
    fetchCompras()
  }, [refreshKey])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Historial de Compras</h3>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Nueva Compra
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado de Compras ({compras.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Cargando...</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Proveedor</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Observaciones</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {compras.map((compra) => (
                    <TableRow key={compra.id}>
                      <TableCell>{formatDate(compra.fecha)}</TableCell>
                      <TableCell>{compra.proveedor?.nombre || '-'}</TableCell>
                      <TableCell>{compra.detalles?.length || 0}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{compra.observaciones || '-'}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {compras.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No hay compras registradas</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

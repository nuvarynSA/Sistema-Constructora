'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Trash2, Edit2, Search } from 'lucide-react'
import { toast } from 'sonner'
import { MaterialDialog } from './material-dialog'

interface Material {
  id: string
  nombre: string
  unidadMedida?: string
  descripcion?: string
  createdAt: string
}

export function MaterialesTab({ refreshKey, onDataChange }: { refreshKey: number; onDataChange: () => void }) {
  const [materiales, setMateriales] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showDialog, setShowDialog] = useState(false)
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null)

  const fetchMateriales = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/stock/materiales')
      if (!response.ok) throw new Error('Error fetching')
      const data = await response.json()
      setMateriales(data.data || [])
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al cargar materiales')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    console.log('[MaterialesTab] mount', { refreshKey })
    fetchMateriales()
  }, [fetchMateriales, refreshKey])

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este material?')) return
    try {
      const response = await fetch(`/api/stock/materiales/${id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error()
      toast.success('Material eliminado')
      onDataChange()
    } catch {
      toast.error('Error al eliminar')
    }
  }

  const filteredMateriales = materiales.filter(m =>
    m.nombre.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar material..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Button
          onClick={() => {
            setSelectedMaterial(null)
            setShowDialog(true)
          }}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Nuevo Material
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado de Materiales ({filteredMateriales.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Cargando...</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Unidad</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMateriales.map((material) => (
                    <TableRow key={material.id}>
                      <TableCell className="font-medium">{material.nombre}</TableCell>
                      <TableCell>{material.unidadMedida || '-'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{material.descripcion || '-'}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedMaterial(material)
                            setShowDialog(true)
                          }}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(material.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filteredMateriales.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No hay materiales</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <MaterialDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        material={selectedMaterial}
        onSuccess={() => {
          setShowDialog(false)
          onDataChange()
        }}
      />
    </div>
  )
}

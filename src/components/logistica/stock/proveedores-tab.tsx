'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Trash2, Search } from 'lucide-react'
import { toast } from 'sonner'

interface Proveedor {
  id: string
  nombre: string
  cuit?: string
  email?: string
  telefono?: string
}

export function ProveedoresTab({ refreshKey, onDataChange }: { refreshKey: number; onDataChange: () => void }) {
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ nombre: '', cuit: '', email: '', telefono: '' })

  const fetchProveedores = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/stock/proveedores')
      const data = await res.json()
      setProveedores(data.data || [])
    } catch (error) {
      toast.error('Error al cargar proveedores')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    console.log('[ProveedoresTab] mount', { refreshKey })
    fetchProveedores()
  }, [refreshKey])

  const handleAddProveedor = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.nombre.trim()) {
      toast.error('Nombre requerido')
      return
    }
    try {
      const res = await fetch('/api/stock/proveedores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (!res.ok) throw new Error()
      toast.success('Proveedor creado')
      setFormData({ nombre: '', cuit: '', email: '', telefono: '' })
      setShowForm(false)
      onDataChange()
    } catch {
      toast.error('Error al crear proveedor')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este proveedor?')) return
    try {
      await fetch(`/api/stock/proveedores/${id}`, { method: 'DELETE' })
      toast.success('Proveedor eliminado')
      onDataChange()
    } catch {
      toast.error('Error al eliminar')
    }
  }

  const filtered = proveedores.filter(p =>
    p.nombre.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar proveedor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nuevo Proveedor
        </Button>
      </div>

      {showForm && (
        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <form onSubmit={handleAddProveedor} className="grid grid-cols-2 gap-4">
              <Input
                placeholder="Nombre *"
                value={formData.nombre}
                onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                required
              />
              <Input
                placeholder="CUIT"
                value={formData.cuit}
                onChange={(e) => setFormData({...formData, cuit: e.target.value})}
              />
              <Input
                placeholder="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
              <Input
                placeholder="Teléfono"
                value={formData.telefono}
                onChange={(e) => setFormData({...formData, telefono: e.target.value})}
              />
              <div className="col-span-2 flex gap-2">
                <Button type="submit" className="flex-1">Guardar</Button>
                <Button type="button" variant="outline" className="flex-1" onClick={() => setShowForm(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Listado de Proveedores ({filtered.length})</CardTitle>
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
                    <TableHead>CUIT</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Teléfono</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((prov) => (
                    <TableRow key={prov.id}>
                      <TableCell className="font-medium">{prov.nombre}</TableCell>
                      <TableCell>{prov.cuit || '-'}</TableCell>
                      <TableCell>{prov.email || '-'}</TableCell>
                      <TableCell>{prov.telefono || '-'}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(prov.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filtered.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No hay proveedores</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

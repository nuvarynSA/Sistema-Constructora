'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

interface Material {
  id: string
  codigo?: string
  nombre: string
  unidadMedida?: string
  cantidad?: number
  descripcion?: string
  proveedorId?: string
  imputacionId?: string
}

interface Proveedor {
  id: string
  nombre: string
}

interface Imputacion {
  id: string
  codigo: string
}

interface MaterialDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  material: Material | null
  onSuccess: () => void
}

export function MaterialDialog({ open, onOpenChange, material, onSuccess }: MaterialDialogProps) {
  const [formData, setFormData] = useState({
    codigo: '',
    nombre: '',
    unidadMedida: '',
    cantidad: '',
    descripcion: '',
    proveedorId: '',
    imputacionId: '',
  })
  const [loading, setLoading] = useState(false)
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [imputaciones, setImputaciones] = useState<Imputacion[]>([])

  useEffect(() => {
    // Cargar proveedores
    fetch('/api/stock/proveedores')
      .then(res => res.json())
      .then(data => setProveedores(data.data || []))
      .catch(() => {})

    // Cargar imputaciones (necesitarías un endpoint para esto)
    // Por ahora lo dejamos vacío y se agregará después
  }, [])

  useEffect(() => {
    if (material) {
      setFormData({
        codigo: material.codigo || '',
        nombre: material.nombre,
        unidadMedida: material.unidadMedida || '',
        cantidad: material.cantidad?.toString() || '',
        descripcion: material.descripcion || '',
        proveedorId: material.proveedorId || '',
        imputacionId: material.imputacionId || '',
      })
    } else {
      setFormData({ codigo: '', nombre: '', unidadMedida: '', cantidad: '', descripcion: '', proveedorId: '', imputacionId: '' })
    }
  }, [material, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.nombre.trim()) {
      toast.error('El nombre del material es requerido')
      return
    }

    setLoading(true)
    try {
      const url = material
        ? `/api/stock/materiales/${material.id}`
        : '/api/stock/materiales'
      
      const method = material ? 'PUT' : 'POST'

      const payload = {
        nombre: formData.nombre,
        codigo: formData.codigo || undefined,
        unidadMedida: formData.unidadMedida || undefined,
        cantidad: formData.cantidad ? parseFloat(formData.cantidad) : undefined,
        descripcion: formData.descripcion || undefined,
        proveedorId: formData.proveedorId || undefined,
        imputacionId: formData.imputacionId || undefined,
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error')
      }

      toast.success(material ? 'Material actualizado' : 'Material creado')
      onOpenChange(false)
      onSuccess()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al guardar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{material ? 'Editar' : 'Nuevo'} Material</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="codigo">Código</Label>
              <Input
                id="codigo"
                value={formData.codigo}
                onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                placeholder="ej: MAT-001"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre *</Label>
              <Input
                id="nombre"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                placeholder="ej: Unipolar 4x16"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="unidad">Unidad de Medida</Label>
              <Input
                id="unidad"
                value={formData.unidadMedida}
                onChange={(e) => setFormData({ ...formData, unidadMedida: e.target.value })}
                placeholder="ej: kg, m, pza, l"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cantidad">Cantidad</Label>
              <Input
                id="cantidad"
                type="number"
                step="0.0001"
                value={formData.cantidad}
                onChange={(e) => setFormData({ ...formData, cantidad: e.target.value })}
                placeholder="0.0000"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="proveedor">Proveedor</Label>
              <Select
                value={formData.proveedorId}
                onValueChange={(value) => setFormData({ ...formData, proveedorId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar proveedor" />
                </SelectTrigger>
                <SelectContent>
                  {proveedores.map((prov) => (
                    <SelectItem key={prov.id} value={prov.id}>
                      {prov.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="imputacion">Imputación</Label>
              <Select
                value={formData.imputacionId}
                onValueChange={(value) => setFormData({ ...formData, imputacionId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar imputación" />
                </SelectTrigger>
                <SelectContent>
                  {imputaciones.map((imput) => (
                    <SelectItem key={imput.id} value={imput.id}>
                      {imput.codigo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="descripcion">Descripción</Label>
            <Textarea
              id="descripcion"
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              placeholder="Detalles adicionales..."
              className="min-h-24"
            />
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

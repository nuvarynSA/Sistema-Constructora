'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ArrowDown, ArrowUp, Settings } from 'lucide-react'
import { toast } from 'sonner'

export function OperacionesTab({ refreshKey, onDataChange }: { refreshKey: number; onDataChange: () => void }) {
  const [activeOp, setActiveOp] = useState('entrada')

  return (
    <div className="space-y-4">
      <Tabs value={activeOp} onValueChange={setActiveOp} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="entrada" className="gap-2">
            <ArrowDown className="h-4 w-4" />
            Entrada
          </TabsTrigger>
          <TabsTrigger value="salida" className="gap-2">
            <ArrowUp className="h-4 w-4" />
            Salida
          </TabsTrigger>
          <TabsTrigger value="ajuste" className="gap-2">
            <Settings className="h-4 w-4" />
            Ajuste
          </TabsTrigger>
        </TabsList>

        <TabsContent value="entrada">
          <OperacionForm tipo="entrada" onSuccess={onDataChange} />
        </TabsContent>

        <TabsContent value="salida">
          <OperacionForm tipo="salida" onSuccess={onDataChange} />
        </TabsContent>

        <TabsContent value="ajuste">
          <OperacionForm tipo="ajuste" onSuccess={onDataChange} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function OperacionForm({ tipo, onSuccess }: { tipo: string; onSuccess: () => void }) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    imputacionId: '',
    materialId: '',
    cantidad: '',
    usuario: '',
    observaciones: '',
    destino: '',
    nuevaCantidad: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const endpoint = `/api/stock/operaciones/${tipo}`
      const payload = 
        tipo === 'ajuste'
          ? {
              id_imputacion: formData.imputacionId,
              id_material: formData.materialId,
              nueva_cantidad: parseFloat(formData.nuevaCantidad),
              usuario: formData.usuario,
              motivo: formData.observaciones,
            }
          : {
              id_imputacion: formData.imputacionId,
              id_material: formData.materialId,
              cantidad: parseFloat(formData.cantidad),
              usuario: formData.usuario,
              observaciones: formData.observaciones,
            }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Error')
      }

      toast.success(`Operación de ${tipo} registrada`)
      setFormData({ imputacionId: '', materialId: '', cantidad: '', usuario: '', observaciones: '', destino: '', nuevaCantidad: '' })
      onSuccess()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="capitalize">Registrar {tipo}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Imputación ID *</Label>
              <Input
                value={formData.imputacionId}
                onChange={(e) => setFormData({...formData, imputacionId: e.target.value})}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Material ID *</Label>
              <Input
                value={formData.materialId}
                onChange={(e) => setFormData({...formData, materialId: e.target.value})}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{tipo === 'ajuste' ? 'Nueva Cantidad' : 'Cantidad'} *</Label>
            <Input
              type="number"
              step="0.0001"
              value={tipo === 'ajuste' ? formData.nuevaCantidad : formData.cantidad}
              onChange={(e) => setFormData({...formData, [tipo === 'ajuste' ? 'nuevaCantidad' : 'cantidad']: e.target.value})}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Usuario *</Label>
              <Input
                value={formData.usuario}
                onChange={(e) => setFormData({...formData, usuario: e.target.value})}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{tipo === 'ajuste' ? 'Motivo' : 'Observaciones'}</Label>
            <Textarea
              value={formData.observaciones}
              onChange={(e) => setFormData({...formData, observaciones: e.target.value})}
              className="min-h-20"
            />
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Procesando...' : `Registrar ${tipo}`}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

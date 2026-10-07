'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/mock/client'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Building2, TrendingUp, DollarSign, Info } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { formatMoney } from '@/lib/utils'
import type { Obra } from '@/lib/types'
import { ObraDialog } from './obra-dialog'
import { ObrasTable } from './obras-table'

export function ObrasMain() {
  const [obras, setObras] = useState<Obra[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [selectedObra, setSelectedObra] = useState<Obra | null>(null)
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<'nombre' | 'imputacion'>('nombre')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [infoDialog, setInfoDialog] = useState<{ open: boolean; title: string; description: string }>({
    open: false,
    title: '',
    description: '',
  })
  const dataClient = createClient()
  const { toast } = useToast()

  useEffect(() => {
    console.log('[ObrasMain] mount')
    fetchObras()
    // Verificar obras próximas a fecha de finalización cuando se carga la página
    const { checkObrasApproachingEnd } = require('@/lib/notifications/check-dates')
    checkObrasApproachingEnd()
  }, [])

  const fetchObras = async () => {
    const start = Date.now()
    console.log('[ObrasMain] fetch:start')
    const timeoutId = window.setTimeout(() => {
      console.warn('[ObrasMain] fetch:timeout >8s')
      setLoading(false)
    }, 8000)
    setLoading(true)
    const { data, error } = await dataClient
      .from('obras')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las obras',
        variant: 'destructive',
      })
    } else {
      // Fetch responsables manualmente si es necesario
      const obrasConResponsable = await Promise.all(
        (data || []).map(async (obra) => {
          if (obra.responsable_id) {
            const { data: responsable } = await dataClient
              .from('users')
              .select('*')
              .eq('id', obra.responsable_id)
              .single()
            
            return { 
              ...obra, 
              responsable,
              imagen_url: obra.imagen_url || null // Asegurar que el campo esté presente
            }
          }
          return {
            ...obra,
            imagen_url: obra.imagen_url || null // Asegurar que el campo esté presente
          }
        })
      )
      
      setObras(obrasConResponsable)
    }
    window.clearTimeout(timeoutId)
    console.log('[ObrasMain] fetch:end', { ms: Date.now() - start })
    setLoading(false)
  }

  const handleNew = () => {
    setSelectedObra(null)
    setShowDialog(true)
  }

  const handleEdit = (obra: Obra) => {
    setSelectedObra(obra)
    setShowDialog(true)
  }

  const handleToggleActiva = async (obra: Obra) => {
    const obraActiva = obra.estado === 'Activa'
    const nuevoEstado = obraActiva ? 'Inactiva' : 'Activa'

    const { error } = await dataClient
      .from('obras')
      .update({ 
        estado: nuevoEstado,
      })
      .eq('id', obra.id)

    if (error) {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el estado de la obra',
        variant: 'destructive',
      })
    } else {
      toast({
        title: 'Éxito',
        description: `Obra ${nuevoEstado === 'Activa' ? 'activada' : 'inactivada'} correctamente`,
      })
      fetchObras()
    }
  }

  const totalEstimado = obras.reduce((sum, obra) => sum + obra.monto_estimado, 0)
  const totalGastado = obras.reduce((sum, obra) => sum + obra.monto_gastado, 0)
  const obrasActivas = obras.filter(o => o.estado === 'Activa').length

  const filteredObras = obras
    .filter((obra) => {
      if (!search.trim()) return true
      const term = search.toLowerCase()
      return obra.nombre.toLowerCase().includes(term) || obra.imputacion.toLowerCase().includes(term)
    })
    .sort((a, b) => {
      const dir = sortDirection === 'asc' ? 1 : -1
      if (sortKey === 'nombre') {
        return a.nombre.localeCompare(b.nombre) * dir
      }
      return a.imputacion.localeCompare(b.imputacion) * dir
    })

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
              Obras y Proyectos
            </h1>
            <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">
              Gestión de obras con seguimiento de presupuesto
            </p>
          </div>
          <Button 
            onClick={handleNew}
            className="gap-2 transition-all duration-200 hover:scale-105 active:scale-95 shadow-md hover:shadow-lg w-full sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            Nueva Obra
          </Button>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="transition-all duration-300 hover:shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Obras</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{obras.length}</div>
              <p className="text-xs text-muted-foreground">
                {obrasActivas} activas
              </p>
            </CardContent>
          </Card>

          <Card className="transition-all duration-300 hover:shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-1">
                OFOA
                <button
                  type="button"
                  onClick={() =>
                    setInfoDialog({
                      open: true,
                      title: 'OFOA',
                      description: 'Objetivo de Facturación de Obras Activas',
                    })
                  }
                  className="rounded-sm p-1 text-muted-foreground hover:text-foreground"
                  aria-label="Ver definición de OFOA"
                >
                  <Info className="h-3 w-3" />
                </button>
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatMoney(totalEstimado)}</div>
              <p className="text-xs text-muted-foreground">
                Estimado en todas las obras
              </p>
            </CardContent>
          </Card>

          <Card className="transition-all duration-300 hover:shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-1">
                GAMOA
                <button
                  type="button"
                  onClick={() =>
                    setInfoDialog({
                      open: true,
                      title: 'GAMOA',
                      description: 'Gastos acumulados de materiales de Obras Activas',
                    })
                  }
                  className="rounded-sm p-1 text-muted-foreground hover:text-foreground"
                  aria-label="Ver definición de GAMOA"
                >
                  <Info className="h-3 w-3" />
                </button>
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatMoney(totalGastado)}</div>
              <p className="text-xs text-muted-foreground">
                Suma de OCs finalizadas
              </p>
            </CardContent>
          </Card>

          <Card className="transition-all duration-300 hover:shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">% Ejecutado</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {totalEstimado > 0 ? Math.round((totalGastado / totalEstimado) * 100) : 0}%
              </div>
              <p className="text-xs text-muted-foreground">
                Del presupuesto total
              </p>
            </CardContent>
          </Card>
        </div>

        <Dialog open={infoDialog.open} onOpenChange={(open) => setInfoDialog((prev) => ({ ...prev, open }))}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-2xl">{infoDialog.title}</DialogTitle>
            </DialogHeader>
            <div className="text-base text-muted-foreground">{infoDialog.description}</div>
          </DialogContent>
        </Dialog>

        {/* Tabla de obras */}
        <Card>
          <CardHeader>
            <CardTitle>Listado de Obras</CardTitle>
            <CardDescription>
              Gestiona obras y proyectos con seguimiento presupuestario
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <input
                className="flex-1 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Buscar por nombre o imputación..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div className="flex gap-2">
                <Button
                  variant={sortKey === 'nombre' ? 'default' : 'outline'}
                  onClick={() => {
                    setSortKey('nombre')
                    setSortDirection(sortKey === 'nombre' && sortDirection === 'asc' ? 'desc' : 'asc')
                  }}
                >
                  Nombre {sortKey === 'nombre' ? (sortDirection === 'asc' ? 'A-Z' : 'Z-A') : ''}
                </Button>
                <Button
                  variant={sortKey === 'imputacion' ? 'default' : 'outline'}
                  onClick={() => {
                    setSortKey('imputacion')
                    setSortDirection(sortKey === 'imputacion' && sortDirection === 'asc' ? 'desc' : 'asc')
                  }}
                >
                  Imputación {sortKey === 'imputacion' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                </Button>
              </div>
            </div>

            <ObrasTable obras={filteredObras} onEdit={handleEdit} onUpdate={fetchObras} onToggleActiva={handleToggleActiva} />
          </CardContent>
        </Card>
      </div>

      <ObraDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        obra={selectedObra}
        onSuccess={fetchObras}
      />
    </>
  )
}

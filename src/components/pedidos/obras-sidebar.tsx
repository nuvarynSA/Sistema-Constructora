'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/mock/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Building2, Layers, ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react'
import Image from 'next/image'
import { formatMoney } from '@/lib/utils'
import type { Obra } from '@/lib/types'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from '@/components/ui/sheet'

interface ObrasSidebarProps {
  onSelectObra: (obraId: string | null) => void
  selectedObraId: string | null
}

interface ObraWithNotifications extends Obra {
  pedidosEnSolicitud: number
}

export function ObrasSidebar({ onSelectObra, selectedObraId }: ObrasSidebarProps) {
  const [obras, setObras] = useState<ObraWithNotifications[]>([])
  const [loading, setLoading] = useState(true)
  const [collapsed, setCollapsed] = useState(false)
  const [sortMode, setSortMode] = useState<'nombre-asc' | 'nombre-desc' | 'imputacion-asc' | 'imputacion-desc'>('nombre-asc')
  const dataClient = createClient()
  const hasLoadedRef = useRef(false)

  const renderObraButtons = (closeOnSelect = false) => {
    if (obras.length === 0) {
      return (
        <div className="text-center py-8 text-sm text-muted-foreground">
          No hay obras activas
        </div>
      )
    }

    return obras.map((obra) => {
      const buttonContent = (
        <div className="flex gap-2 items-start w-full">
          {obra.imagen_url ? (
            <Image
              src={obra.imagen_url}
              alt={`Imagen de ${obra.nombre}`}
              width={40}
              height={40}
              className="object-cover rounded border"
            />
          ) : (
            <div className="w-10 h-10 bg-muted rounded border flex items-center justify-center">
              <ImageIcon className="h-5 w-5 text-muted-foreground" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate text-sm">{obra.nombre}</div>
                <div className="text-xs opacity-70 truncate">{obra.imputacion}</div>
              </div>

              {obra.pedidosEnSolicitud > 0 && (
                <Badge variant="destructive" className="animate-pulse h-6 min-w-6 flex items-center justify-center p-1">
                  {obra.pedidosEnSolicitud}
                </Badge>
              )}
            </div>
          </div>
        </div>
      )

      if (closeOnSelect) {
        return (
          <SheetClose asChild key={obra.id}>
            <Button
              variant={selectedObraId === obra.id ? 'default' : 'ghost'}
              className="w-full justify-start text-left h-auto py-3 transition-all hover:scale-105 relative"
              onClick={() => onSelectObra(obra.id)}
            >
              {buttonContent}
            </Button>
          </SheetClose>
        )
      }

      return (
        <Button
          key={obra.id}
          variant={selectedObraId === obra.id ? 'default' : 'ghost'}
          className="w-full justify-start text-left h-auto py-3 transition-all hover:scale-105 relative"
          onClick={() => onSelectObra(obra.id)}
        >
          {buttonContent}
        </Button>
      )
    })
  }

  useEffect(() => {
    console.log('[ObrasSidebar] mount')
    fetchObrasConNotificaciones()
    
    // Suscribirse a cambios en pedidos para actualizar notificaciones
    const channel = dataClient
      .channel('orders-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'orders'
      }, () => {
        fetchObrasConNotificaciones()
      })
      .subscribe()

    return () => {
      dataClient.removeChannel(channel)
    }
  }, [])

  const fetchObrasConNotificaciones = async () => {
    console.log('[ObrasSidebar] fetch')
    if (!hasLoadedRef.current) {
      setLoading(true)
    }

    try {
      // Fetch todas las obras (sin filtrar por estado)
      const { data: obrasData, error } = await dataClient
        .from('obras')
        .select('*')
        .order('nombre')

      if (error) {
        console.error('Error fetching obras:', error)
        return
      }

      if (obrasData) {
        // Para cada obra, contar pedidos en "solicitados"
        const obrasConNotificaciones = await Promise.all(
          obrasData.map(async (obra) => {
            const { count } = await dataClient
              .from('orders')
              .select('*', { count: 'exact', head: true })
              .eq('obra_id', obra.id)
              .eq('current_area', 'solicitados')
              .in('estado_detallado', ['Pendiente', 'Listo para Compras'])

            return {
              ...obra,
              pedidosEnSolicitud: count || 0,
              imagen_url: obra.imagen_url || null,
            }
          })
        )

        const sorted = sortObras(obrasConNotificaciones, sortMode)
        setObras(sorted)
        hasLoadedRef.current = true
      }
    } catch (error) {
      console.error('[ObrasSidebar] Error fetching obras:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleMobileSelect = (value: string) => {
    if (value === 'all') {
      onSelectObra(null)
      return
    }
    onSelectObra(value)
  }

  const sortObras = (lista: ObraWithNotifications[], mode: typeof sortMode) => {
    const sorted = [...lista].sort((a, b) => {
      switch (mode) {
        case 'nombre-asc':
          return a.nombre.localeCompare(b.nombre)
        case 'nombre-desc':
          return b.nombre.localeCompare(a.nombre)
        case 'imputacion-asc':
          return a.imputacion.localeCompare(b.imputacion)
        case 'imputacion-desc':
          return b.imputacion.localeCompare(a.imputacion)
        default:
          return 0
      }
    })
    return sorted
  }

  const handleSortChange = (value: typeof sortMode) => {
    setSortMode(value)
    setObras((prev) => sortObras(prev, value))
  }

  if (loading) {
    return (
      <div className="w-64 border-r border-gray-200 dark:border-gray-800 p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
      </div>
    )
  }

  return (
    <>
      {/* Sidebar Desktop */}
      <div className={`hidden lg:block border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 transition-all duration-300 sticky top-0 h-screen ${collapsed ? 'w-16' : 'w-80'}`}>
        <div className="p-6 space-y-4">
          {/* Header con toggle */}
          <div className="flex items-center justify-between">
            {!collapsed && (
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Obras</h3>
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed(!collapsed)}
              className="h-8 w-8"
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </div>

          {!collapsed && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground uppercase">Ordenar</p>
              <Select value={sortMode} onValueChange={(v) => handleSortChange(v as typeof sortMode)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nombre-asc">Nombre A-Z</SelectItem>
                  <SelectItem value="nombre-desc">Nombre Z-A</SelectItem>
                  <SelectItem value="imputacion-asc">Imputación ↑</SelectItem>
                  <SelectItem value="imputacion-desc">Imputación ↓</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {!collapsed && (
            <>
              {/* Botón "Todas las obras" */}
              <Button
                variant={selectedObraId === null ? 'default' : 'ghost'}
                className="w-full justify-start gap-2 transition-all hover:scale-105"
                onClick={() => onSelectObra(null)}
              >
                <Layers className="h-4 w-4" />
                <span>Todas las Obras</span>
              </Button>

              {/* Lista de obras */}
              <ScrollArea className="h-[calc(100vh-200px)]">
                <div className="space-y-3 pr-2">
                  {renderObraButtons()}
                </div>
              </ScrollArea>
            </>
          )}

          {/* Vista colapsada - solo iconos */}
          {collapsed && (
            <ScrollArea className="h-[calc(100vh-180px)]">
              <div className="space-y-2">
                {obras.map((obra) => (
                  <Button
                    key={obra.id}
                    variant={selectedObraId === obra.id ? 'default' : 'ghost'}
                    size="icon"
                    className="w-full h-12 relative"
                    onClick={() => onSelectObra(obra.id)}
                    title={obra.nombre}
                  >
                    <Building2 className="h-5 w-5" />
                    {obra.pedidosEnSolicitud > 0 && (
                      <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 rounded-full text-xs text-white flex items-center justify-center animate-pulse">
                        {obra.pedidosEnSolicitud}
                      </span>
                    )}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </div>

      {/* Sidebar Mobile */}
      <div className="lg:hidden mb-3 px-4">
        <Card className="p-3 space-y-4 text-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-sm">Obras</h3>
            </div>
            <Badge variant="outline" className="text-[11px] px-2 py-0.5">
              {obras.length} activas
            </Badge>
          </div>

          <div className="space-y-2">
            <Select value={selectedObraId ?? 'all'} onValueChange={handleMobileSelect}>
              <SelectTrigger className="h-10 text-sm">
                <SelectValue placeholder="Seleccioná una obra" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las obras</SelectItem>
                {obras.map((obra) => (
                  <SelectItem key={obra.id} value={obra.id}>
                    {obra.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedObraId && (
              <div className="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
                {(() => {
                  const obraSeleccionada = obras.find((obra) => obra.id === selectedObraId)
                  if (!obraSeleccionada) {
                    return 'Seleccioná una obra para ver más detalles'
                  }
                  return (
                    <div className="space-y-1">
                      <div className="font-medium text-foreground">{obraSeleccionada.nombre}</div>
                      <div>{obraSeleccionada.imputacion}</div>
                      <div>Monto estimado: {formatMoney(obraSeleccionada.monto_estimado || 0)}</div>
                    </div>
                  )
                })()}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Acceso rápido</p>
            {obras.length === 0 ? (
              <div className="text-xs text-muted-foreground text-center py-3">
                No hay obras activas
              </div>
            ) : (
              <div className="space-y-2">
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" className="w-full justify-between h-10 text-sm">
                      <span>{selectedObraId ? 'Cambiar obra' : 'Ver obras'}</span>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-full sm:max-w-md p-0">
                    <SheetHeader className="p-4 pb-2 border-b">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-primary" />
                        <SheetTitle className="text-base">Obras activas</SheetTitle>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Seleccioná una obra para filtrar los pedidos
                      </p>
                    </SheetHeader>
                    <div className="p-4 pt-3">
                      <SheetClose asChild>
                        <Button
                          variant={selectedObraId === null ? 'default' : 'outline'}
                          className="w-full justify-start gap-2 text-sm"
                          onClick={() => onSelectObra(null)}
                        >
                          <Layers className="h-4 w-4" />
                          Todas las obras
                        </Button>
                      </SheetClose>
                    </div>
                    <ScrollArea className="h-[calc(100vh-200px)] px-4">
                      <div className="space-y-3 pb-6">
                        {renderObraButtons(true)}
                      </div>
                    </ScrollArea>
                  </SheetContent>
                </Sheet>
              </div>
            )}
          </div>
        </Card>
      </div>
    </>
  )
}

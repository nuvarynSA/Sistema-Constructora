'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/mock/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Search, LayoutGrid, List } from 'lucide-react'
import { LicitacionesKanban } from './licitaciones-kanban'
import { LicitacionesTable } from './licitaciones-table'
import { NewLicitacionDialog } from './new-licitacion-dialog'
import type { Licitacion } from '@/lib/types'

export function LicitacionesMain() {
  const [licitaciones, setLicitaciones] = useState<Licitacion[]>([])
  const [filteredLicitaciones, setFilteredLicitaciones] = useState<Licitacion[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban')
  const [showNewDialog, setShowNewDialog] = useState(false)
  const dataClient = createClient()
  const hasLoadedRef = useRef(false)

  const fetchLicitaciones = useCallback(async () => {
    if (!hasLoadedRef.current) {
      setLoading(true)
    }
    try {
      const { data, error } = await dataClient
        .from('licitaciones')
        .select(
          `
          *,
          creador:users!creador_id(id, name, email, area, avatar, role_id),
          responsable:users!responsable_id(id, name, email, area, avatar, role_id)
        `
        )
        .order('created_at', { ascending: false })

      if (error) throw error
      setLicitaciones(data || [])
      setFilteredLicitaciones(data || [])
      hasLoadedRef.current = true
    } catch (error) {
      console.error('[LicitacionesMain] fetch:error', error)
    } finally {
      setLoading(false)
    }
  }, [dataClient])

  const filterLicitaciones = useCallback(() => {
    if (!searchTerm) {
      setFilteredLicitaciones(licitaciones)
      return
    }

    const filtered = licitaciones.filter(lic =>
      lic.opl.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lic.empresa.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lic.obra.toLowerCase().includes(searchTerm.toLowerCase())
    )
    setFilteredLicitaciones(filtered)
  }, [searchTerm, licitaciones])

  useEffect(() => {
    fetchLicitaciones()
  }, [fetchLicitaciones])

  useEffect(() => {
    const channel = dataClient
      .channel('licitaciones-main-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'licitaciones' }, () => {
        fetchLicitaciones()
      })
      .subscribe()

    return () => {
      dataClient.removeChannel(channel)
    }
  }, [fetchLicitaciones, dataClient])

  useEffect(() => {
    filterLicitaciones()
  }, [filterLicitaciones])

  const handleCreated = () => {
    setShowNewDialog(false)
    fetchLicitaciones()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 animate-in slide-in-from-left-4 duration-500">
            Licitaciones (OPL)
          </h1>
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">
            Gestión de licitaciones y procesos de compra
          </p>
        </div>
        <Button 
          onClick={() => setShowNewDialog(true)} 
          className="gap-2 transition-all duration-200 hover:scale-105 active:scale-95 shadow-md hover:shadow-lg w-full sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          <span className="sm:inline">Nueva Licitación</span>
        </Button>
      </div>

      {/* Search and View Toggle */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar por OPL, empresa, obra..."
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
        <LicitacionesKanban licitaciones={filteredLicitaciones} onUpdate={fetchLicitaciones} />
      ) : (
        <LicitacionesTable licitaciones={filteredLicitaciones} onUpdate={fetchLicitaciones} />
      )}

      {/* New Licitacion Dialog */}
      <NewLicitacionDialog
        open={showNewDialog}
        onOpenChange={setShowNewDialog}
        onSuccess={handleCreated}
      />
    </div>
  )
}

'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/components/ui/use-toast'
import { formatDate, formatMoney, getPriorityColor, getStatusColor } from '@/lib/utils'
import { DollarSign, ArrowRight, Lock } from 'lucide-react'
import { LicitacionDetailDialog } from './licitacion-detail-dialog'
import { createClient } from '@/lib/mock/client'
import { useAuth } from '@/hooks/use-auth'
import { usePermissions } from '@/hooks/use-permissions'
import { notifyAreaUsers } from '@/lib/notifications'
import { logLicitacionAction } from '@/lib/audit'
import type { Licitacion, LicitacionProcess } from '@/lib/types'

interface LicitacionesKanbanProps {
  licitaciones: Licitacion[]
  onUpdate: () => void
}

const columns: { id: LicitacionProcess; title: string; color: string }[] = [
  { id: 'solicitud', title: 'Solicitud', color: 'bg-yellow-100 border-yellow-300' },
  { id: 'compras', title: 'Área de Compras', color: 'bg-blue-100 border-blue-300' },
  { id: 'presupuestos', title: 'Presupuestos', color: 'bg-purple-100 border-purple-300' },
  { id: 'finalizado', title: 'Finalizado', color: 'bg-green-100 border-green-300' },
]

export function LicitacionesKanban({ licitaciones, onUpdate }: LicitacionesKanbanProps) {
  const [selected, setSelected] = useState<Licitacion | null>(null)
  const [showDialog, setShowDialog] = useState(false)
  const [licitacionToDerive, setLicitacionToDerive] = useState<Licitacion | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [deriving, setDeriving] = useState(false)

  const dataClient = createClient()
  const { toast } = useToast()
  const { userData } = useAuth()
  const { canDeriveLicitacion, getPermissionErrorMessage } = usePermissions()

  const getLicitacionesByProcess = (process: LicitacionProcess) => {
    return licitaciones.filter(lic => lic.current_process === process)
  }

  const handleViewDetail = (licitacion: Licitacion) => {
    setSelected(licitacion)
    setShowDialog(true)
  }

  const handleDeriveClick = (licitacion: Licitacion) => {
    // Validar permisos
    if (!canDeriveLicitacion(licitacion)) {
      toast({
        title: 'Sin permisos',
        description: getPermissionErrorMessage(licitacion),
        variant: 'destructive',
      })
      return
    }
    
    setLicitacionToDerive(licitacion)
    setShowConfirmDialog(true)
  }

  const getNextProcess = (currentProcess: LicitacionProcess): LicitacionProcess | null => {
    const processFlow: Record<LicitacionProcess, LicitacionProcess | null> = {
      'solicitud': 'compras',
      'compras': 'presupuestos',
      'presupuestos': 'finalizado',
      'finalizado': null,
    }
    return processFlow[currentProcess]
  }

  const getNextStatus = (nextProcess: LicitacionProcess): { estado: string; estadoDetallado: string } => {
    const statusMap: Record<LicitacionProcess, { estado: string; estadoDetallado: string }> = {
      'solicitud': { estado: 'Abierta', estadoDetallado: 'Pendiente de Aprobación' },
      'compras': { estado: 'En Evaluación', estadoDetallado: 'Análisis de Ofertas' },
      'presupuestos': { estado: 'En Evaluación', estadoDetallado: 'Pendiente de Aprobación Final' },
      'finalizado': { estado: 'Finalizada', estadoDetallado: 'Adjudicada' },
    }
    return statusMap[nextProcess]
  }

  const confirmDerive = async () => {
    if (!licitacionToDerive || !userData) return

    const nextProcess = getNextProcess(licitacionToDerive.current_process)
    if (!nextProcess) {
      toast({
        title: 'Error',
        description: 'Esta licitación ya está en la última etapa',
        variant: 'destructive',
      })
      return
    }

    setDeriving(true)

    try {
      const { estado, estadoDetallado } = getNextStatus(nextProcess)

      // Actualizar la licitación
      const { error: updateError } = await dataClient
        .from('licitaciones')
        .update({
          current_process: nextProcess,
          estado: estado,
          estado_detallado: estadoDetallado,
          updated_at: new Date().toISOString(),
        })
        .eq('id', licitacionToDerive.id)

      if (updateError) throw updateError

      // Registrar en el historial
      const processNames: Record<LicitacionProcess, string> = {
        'solicitud': 'Solicitud',
        'compras': 'Área de Compras',
        'presupuestos': 'Presupuestos',
        'finalizado': 'Finalizado',
      }

      await dataClient.from('licitacion_histories').insert({
        id: crypto.randomUUID(),
        licitacion_id: licitacionToDerive.id,
        usuario_id: userData.id,
        accion: `${userData.name} derivó la licitación a ${processNames[nextProcess]}`,
        tipo: 'derivacion',
      })

      // Registrar en auditoría
      await logLicitacionAction(
        userData,
        'derivar',
        licitacionToDerive.id,
        licitacionToDerive.opl,
        `Licitación derivada de ${processNames[licitacionToDerive.current_process]} a ${processNames[nextProcess]}`,
        {
          from: licitacionToDerive.current_process,
          to: nextProcess,
          previousStatus: licitacionToDerive.estado,
          newStatus: estado,
          monto: licitacionToDerive.monto,
        }
      )

      // Crear notificaciones para usuarios del área destino
      const processNotificationMap: Record<LicitacionProcess, string> = {
        'solicitud': 'Solicitados',
        'compras': 'Compras',
        'presupuestos': 'Presupuestos',
        'finalizado': 'Administración',
      }

      await notifyAreaUsers({
        area: processNotificationMap[nextProcess],
        title: `Nueva licitación en ${processNames[nextProcess]}`,
        message: `La licitación ${licitacionToDerive.opl} de ${licitacionToDerive.empresa} (${formatMoney(licitacionToDerive.monto)}) fue derivada a tu área.`,
        type: 'licitacion_derived',
        referenceId: licitacionToDerive.id,
        referenceType: 'licitacion',
        excludeUserId: userData.id,
      })

      toast({
        title: '✅ Licitación derivada',
        description: `La licitación ${licitacionToDerive.opl} fue derivada a ${processNames[nextProcess]}`,
      })

      setShowConfirmDialog(false)
      setLicitacionToDerive(null)
      onUpdate()
    } catch (error) {
      console.error('Error al derivar:', error)
      toast({
        title: 'Error',
        description: 'No se pudo derivar la licitación. Intenta nuevamente.',
        variant: 'destructive',
      })
    } finally {
      setDeriving(false)
    }
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {columns.map(column => {
          const columnLicitaciones = getLicitacionesByProcess(column.id)
          
          return (
            <div key={column.id} className="space-y-2 sm:space-y-3">
              <Card className={`${column.color} border-2 transition-all duration-300 hover:shadow-md`}>
                <CardHeader className="pb-3 p-3 sm:p-6">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base sm:text-lg">{column.title}</CardTitle>
                    <Badge variant="secondary" className="animate-in zoom-in-50 duration-300">{columnLicitaciones.length}</Badge>
                  </div>
                </CardHeader>
              </Card>

              <div className="space-y-2 sm:space-y-3">
                {columnLicitaciones.map(licitacion => (
                  <Card
                    key={licitacion.id}
                    className="cursor-pointer group"
                    onClick={() => handleViewDetail(licitacion)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        handleViewDetail(licitacion)
                      }
                    }}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <p className="font-semibold text-sm">{licitacion.opl}</p>
                          <p className="text-xs text-muted-foreground">{licitacion.empresa}</p>
                        </div>
                        <Badge className={getPriorityColor(licitacion.prioridad)} variant="outline">
                          {licitacion.prioridad}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm font-medium truncate">{licitacion.obra}</p>

                      <div className="flex items-center gap-2 text-sm font-semibold text-green-600">
                        <DollarSign className="h-4 w-4" />
                        {formatMoney(licitacion.monto)}
                      </div>

                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs bg-purple-500 text-white">
                            {licitacion.creador?.avatar || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-muted-foreground">
                          {licitacion.creador?.name}
                        </span>
                      </div>

                      <Badge className={getStatusColor(licitacion.estado_detallado || licitacion.estado)} variant="secondary">
                        {licitacion.estado_detallado || licitacion.estado}
                      </Badge>

                      <div className="text-xs text-muted-foreground">
                        {formatDate(licitacion.fecha_creacion)}
                      </div>

                      {licitacion.current_process !== 'finalizado' && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant={canDeriveLicitacion(licitacion) ? "default" : "outline"}
                            className="flex-1 gap-2"
                            onClick={(event) => {
                              event.stopPropagation()
                              handleDeriveClick(licitacion)
                            }}
                            disabled={!canDeriveLicitacion(licitacion)}
                          >
                            {canDeriveLicitacion(licitacion) ? (
                              <>
                                <ArrowRight className="h-3 w-3" />
                                Derivar
                              </>
                            ) : (
                              <>
                                <Lock className="h-3 w-3" />
                                Sin permisos
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {selected && (
        <LicitacionDetailDialog
          licitacion={selected}
          open={showDialog}
          onOpenChange={setShowDialog}
          onUpdate={onUpdate}
        />
      )}

      {/* Confirm Derive Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Derivar licitación?</AlertDialogTitle>
            <AlertDialogDescription>
              {licitacionToDerive && (
                <>
                  ¿Estás seguro de que deseas derivar la licitación <strong>{licitacionToDerive.opl}</strong> 
                  {' '}de <strong>{columns.find(c => c.id === licitacionToDerive.current_process)?.title}</strong>
                  {' '}a <strong>{getNextProcess(licitacionToDerive.current_process) && columns.find(c => c.id === getNextProcess(licitacionToDerive.current_process))?.title}</strong>?
                  <br /><br />
                  Esta acción quedará registrada en el historial.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deriving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDerive} disabled={deriving}>
              {deriving ? 'Derivando...' : 'Sí, derivar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

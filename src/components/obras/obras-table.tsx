'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Pencil, Eye, Power, PowerOff } from 'lucide-react'
import { formatMoney, formatDate } from '@/lib/utils'
import type { Obra } from '@/lib/types'

interface ObrasTableProps {
  obras: Obra[]
  onEdit: (obra: Obra) => void
  onUpdate: () => void
  onToggleActiva?: (obra: Obra) => void
}

export function ObrasTable({ obras, onEdit, onUpdate, onToggleActiva }: ObrasTableProps) {
  if (obras.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No hay obras registradas
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Obra</TableHead>
            <TableHead>Código de Obra/Proyecto</TableHead>
            <TableHead title="Objetivo de Facturación de Obras Activas">OFOA</TableHead>
            <TableHead title="Gastos acumulados de materiales de Obras Activas">GAMOA</TableHead>
            <TableHead>Progreso</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {obras.map((obra) => {
            const porcentaje = obra.monto_estimado > 0 
              ? Math.round((obra.monto_gastado / obra.monto_estimado) * 100) 
              : 0

            return (
              <TableRow key={obra.id} className="group hover:bg-muted/50">
                <TableCell>
                  <div>
                    <div className="font-medium">{obra.nombre}</div>
                    {obra.descripcion && (
                      <div className="text-xs text-muted-foreground truncate max-w-xs">
                        {obra.descripcion}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{obra.imputacion}</Badge>
                </TableCell>
                <TableCell className="font-medium">{formatMoney(obra.monto_estimado)}</TableCell>
                <TableCell className="font-medium">{formatMoney(obra.monto_gastado)}</TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground min-w-[30px]">0%</span>
                      <div className="flex-1 h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden relative">
                        <div 
                          className="h-full transition-all duration-500 bg-orange-500"
                          style={{ width: `${Math.min(porcentaje, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground min-w-[35px]">100%</span>
                    </div>
                    <div className="flex justify-end">
                      <span className="text-sm font-medium text-orange-600 dark:text-orange-400">{porcentaje}%</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={obra.estado === 'Activa' ? 'default' : 'secondary'}>
                    {obra.estado}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(obra)}>
                        <Eye className="mr-2 h-4 w-4" />
                        Ver Detalles
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEdit(obra)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                      {onToggleActiva && (
                        <DropdownMenuItem onClick={() => onToggleActiva(obra)}>
                          {isObraActiva(obra) ? (
                            <>
                              <PowerOff className="mr-2 h-4 w-4" />
                              Inactivar
                            </>
                          ) : (
                            <>
                              <Power className="mr-2 h-4 w-4" />
                              Activar
                            </>
                          )}
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

function isObraActiva(obra: Obra): boolean {
  return obra.estado === 'Activa'
}

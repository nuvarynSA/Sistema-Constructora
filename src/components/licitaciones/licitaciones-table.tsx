'use client'

import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Card } from '@/components/ui/card'
import { formatDate, formatMoney, getPriorityColor, getStatusColor } from '@/lib/utils'
import { LicitacionDetailDialog } from './licitacion-detail-dialog'
import type { Licitacion } from '@/lib/types'

interface LicitacionesTableProps {
  licitaciones: Licitacion[]
  onUpdate: () => void
}

export function LicitacionesTable({ licitaciones, onUpdate }: LicitacionesTableProps) {
  const [selected, setSelected] = useState<Licitacion | null>(null)
  const [showDialog, setShowDialog] = useState(false)

  const handleViewDetail = (licitacion: Licitacion) => {
    setSelected(licitacion)
    setShowDialog(true)
  }

  return (
    <>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>OPL</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>Obra</TableHead>
              <TableHead>Monto</TableHead>
              <TableHead>Creador</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Prioridad</TableHead>
              <TableHead>Estado</TableHead>
              </TableRow>
          </TableHeader>
          <TableBody>
            {licitaciones.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  No hay licitaciones para mostrar
                </TableCell>
              </TableRow>
            ) : (
              licitaciones.map(licitacion => (
                <TableRow
                  key={licitacion.id}
                  className="hover:bg-muted/50 cursor-pointer"
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
                  <TableCell className="font-medium">{licitacion.opl}</TableCell>
                  <TableCell>{licitacion.empresa}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{licitacion.obra}</TableCell>
                  <TableCell className="font-semibold text-green-600">
                    {formatMoney(licitacion.monto)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs bg-purple-500 text-white">
                          {licitacion.creador?.avatar || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{licitacion.creador?.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatDate(licitacion.fecha_creacion)}
                  </TableCell>
                  <TableCell>
                    <Badge className={getPriorityColor(licitacion.prioridad)} variant="outline">
                      {licitacion.prioridad}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(licitacion.estado)} variant="secondary">
                      {licitacion.estado}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {selected && (
        <LicitacionDetailDialog
          licitacion={selected}
          open={showDialog}
          onOpenChange={setShowDialog}
          onUpdate={onUpdate}
        />
      )}
    </>
  )
}

'use client'

import { formatMoney } from '@/lib/utils'

interface MontosChartProps {
  presupuestado: number
  gastado: number
  disponible: number
}

export function MontosChart({ presupuestado, gastado, disponible }: MontosChartProps) {
  const maxValue = Math.max(presupuestado, gastado, disponible)
  const gastadoPorcentaje = maxValue > 0 ? (gastado / maxValue) * 100 : 0
  const disponiblePorcentaje = maxValue > 0 ? (disponible / maxValue) * 100 : 0
  const presupuestadoPorcentaje = maxValue > 0 ? (presupuestado / maxValue) * 100 : 0

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="space-y-1">
          <div className="flex justify-between items-center text-sm">
            <span className="font-medium text-blue-700 dark:text-blue-300">Presupuestado</span>
            <span className="font-bold text-blue-900 dark:text-blue-100">{formatMoney(presupuestado)}</span>
          </div>
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-500"
              style={{ width: `${Math.min(presupuestadoPorcentaje, 100)}%` }}
            />
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between items-center text-sm">
            <span className={`font-medium ${gastado > presupuestado ? 'text-red-700 dark:text-red-300' : 'text-green-700 dark:text-green-300'}`}>
              Gasto según OCs
            </span>
            <span className={`font-bold ${gastado > presupuestado ? 'text-red-900 dark:text-red-100' : 'text-green-900 dark:text-green-100'}`}>
              {formatMoney(gastado)}
            </span>
          </div>
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${gastado > presupuestado ? 'bg-red-500' : 'bg-green-500'}`}
              style={{ width: `${Math.min(gastadoPorcentaje, 100)}%` }}
            />
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between items-center text-sm">
            <span className="font-medium text-purple-700 dark:text-purple-300">Disponible</span>
            <span className="font-bold text-purple-900 dark:text-purple-100">{formatMoney(disponible)}</span>
          </div>
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-500 transition-all duration-500"
              style={{ width: `${Math.min(disponiblePorcentaje, 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

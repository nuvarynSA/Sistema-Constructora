'use client'

import { formatMoney } from '@/lib/utils'

interface MontosLineChartProps {
  presupuestado: number
  gastado: number
  disponible: number
}

export function MontosLineChart({ presupuestado, gastado, disponible }: MontosLineChartProps) {
  if (presupuestado === 0 && gastado === 0 && disponible === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        No hay datos disponibles para mostrar el gráfico.
      </p>
    )
  }

  const maxValue = Math.max(presupuestado, gastado, disponible) || 1
  const chartHeight = 250
  const chartWidth = 600
  const padding = 60
  const innerWidth = chartWidth - padding * 2
  const innerHeight = chartHeight - padding * 2

  const presupuestadoY = padding + innerHeight - (presupuestado / maxValue) * innerHeight
  const gastadoY = padding + innerHeight - (gastado / maxValue) * innerHeight
  const disponibleY = padding + innerHeight - (disponible / maxValue) * innerHeight

  const presupuestadoPoint = { 
    x: padding + innerWidth * 0.2, 
    y: presupuestadoY, 
    label: 'Presupuestado', 
    value: presupuestado, 
    color: '#3b82f6',
  }
  
  const gastadoPoint = { 
    x: padding + innerWidth * 0.5, 
    y: gastadoY, 
    label: 'Gastado', 
    value: gastado, 
    color: gastado > presupuestado ? '#ef4444' : '#22c55e',
  }
  
  const disponiblePoint = { 
    x: padding + innerWidth * 0.8, 
    y: disponibleY, 
    label: 'Disponible', 
    value: disponible, 
    color: '#a855f7',
  }

  const points = [presupuestadoPoint, gastadoPoint, disponiblePoint]

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <svg width={chartWidth} height={chartHeight} className="w-full">
          <defs>
            <linearGradient id="presupuestadoGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="gastadoGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={gastado > presupuestado ? '#ef4444' : '#22c55e'} stopOpacity="0.3" />
              <stop offset="100%" stopColor={gastado > presupuestado ? '#ef4444' : '#22c55e'} stopOpacity="0" />
            </linearGradient>
            <linearGradient id="disponibleGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#a855f7" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
            </linearGradient>
          </defs>

          <g className="text-muted-foreground">
            <line
              x1={padding}
              y1={padding}
              x2={padding}
              y2={padding + innerHeight}
              stroke="currentColor"
              strokeWidth="1"
            />
            <line
              x1={padding}
              y1={padding + innerHeight}
              x2={padding + innerWidth}
              y2={padding + innerHeight}
              stroke="currentColor"
              strokeWidth="1"
            />
          </g>

          <polyline
            points={`${presupuestadoPoint.x},${presupuestadoPoint.y} ${gastadoPoint.x},${gastadoPoint.y} ${disponiblePoint.x},${disponiblePoint.y}`}
            fill="none"
            stroke={presupuestadoPoint.color}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="drop-shadow-sm"
          />

          {points.map((point, index) => (
            <g key={index}>
              <circle
                cx={point.x}
                cy={point.y}
                r="8"
                fill={point.color}
                stroke="white"
                strokeWidth="3"
                className="drop-shadow-md"
              />
              <text
                x={point.x}
                y={point.y - 20}
                textAnchor="middle"
                className="text-xs font-semibold fill-foreground"
              >
                {formatMoney(point.value)}
              </text>
              <text
                x={point.x}
                y={padding + innerHeight + 20}
                textAnchor="middle"
                className="text-xs font-medium fill-muted-foreground"
              >
                {point.label}
              </text>
            </g>
          ))}
        </svg>
      </div>

      <div className="flex flex-wrap gap-6 justify-center text-sm pt-4 border-t">
        {points.map((point, index) => (
          <div key={index} className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: point.color }}
            />
            <span className="font-medium">{point.label}:</span>
            <span className="text-muted-foreground font-semibold">{formatMoney(point.value)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}


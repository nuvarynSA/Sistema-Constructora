import { formatMoney } from '@/lib/utils'
import type { MonthlyPoint } from './reportes-utils'

interface MonthlySpendChartProps {
  data: MonthlyPoint[]
}

export function MonthlySpendChart({ data }: MonthlySpendChartProps) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Aún no hay datos suficientes para graficar el gasto mensual.
      </p>
    )
  }

  const maxValue = Math.max(...data.map(point => point.total), 0) || 1

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <div className="flex items-end gap-4 h-40 min-w-[320px] pb-2">
          {data.map(point => {
            const heightPercent = Math.max(8, (point.total / maxValue) * 100)
            return (
              <div key={point.key} className="flex flex-col items-center flex-1 min-w-[48px]">
                <div className="flex items-end justify-center h-32 w-full">
                  <div
                    className="w-9 bg-primary/80 dark:bg-primary/70 rounded-t-md transition-all duration-300"
                    style={{ height: `${heightPercent}%` }}
                    title={`${point.label}: ${formatMoney(point.total)}`}
                  />
                </div>
                <span className="mt-1 text-xs font-medium uppercase tracking-wide text-center text-foreground">
                  {point.label}
                </span>
                <span className="text-[10px] text-muted-foreground text-center">
                  {formatMoney(point.total)}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}



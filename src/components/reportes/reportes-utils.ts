import type { Order } from '@/lib/types'

export interface MonthlyPoint {
  key: string
  label: string
  total: number
}

export interface OrderDateMetrics {
  firstCreation?: string
  lastFinalization?: string
  upcomingNeed?: string
}

export function getOrderOcTotal(order: Order): number {
  if (Array.isArray(order.montos_oc) && order.montos_oc.length > 0) {
    return order.montos_oc.reduce((sum, value) => sum + (Number(value) || 0), 0)
  }
  return order.monto_oc || 0
}

const monthFormatter = new Intl.DateTimeFormat('es-AR', {
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
})

export function buildMonthlySeries(orders: Order[]): MonthlyPoint[] {
  const monthly = new Map<string, { total: number; label: string }>()

  orders.forEach(order => {
    const sourceDate = order.fecha_finalizacion || order.fecha_creacion
    if (!sourceDate) return

    const date = new Date(sourceDate)
    if (Number.isNaN(date.getTime())) return

    const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
    const label = monthFormatter.format(date).replace('.', '')
    const current = monthly.get(key)
    const monto = getOrderOcTotal(order) || order.monto_estimado || 0

    monthly.set(key, {
      label,
      total: (current?.total || 0) + monto,
    })
  })

  return Array.from(monthly.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => ({
      key,
      label: value.label,
      total: value.total,
    }))
}

export function getOrderDateMetrics(orders: Order[]): OrderDateMetrics {
  if (orders.length === 0) {
    return {}
  }

  let firstCreation: string | undefined
  let lastFinalization: string | undefined
  let upcomingNeed: string | undefined

  const now = new Date()
  now.setHours(0, 0, 0, 0)

  orders.forEach(order => {
    if (order.fecha_creacion) {
      if (!firstCreation || new Date(order.fecha_creacion) < new Date(firstCreation)) {
        firstCreation = order.fecha_creacion
      }
    }

    if (order.fecha_finalizacion) {
      if (!lastFinalization || new Date(order.fecha_finalizacion) > new Date(lastFinalization)) {
        lastFinalization = order.fecha_finalizacion
      }
    }

    if (order.fecha_necesidad) {
      const necesidadDate = new Date(order.fecha_necesidad)
      if (!Number.isNaN(necesidadDate.getTime()) && necesidadDate >= now) {
        if (!upcomingNeed || necesidadDate < new Date(upcomingNeed)) {
          upcomingNeed = order.fecha_necesidad
        }
      }
    }
  })

  return {
    firstCreation,
    lastFinalization,
    upcomingNeed,
  }
}


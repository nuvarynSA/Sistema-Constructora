import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'America/Argentina/Buenos_Aires',
  }).format(d)
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Argentina/Buenos_Aires',
  }).format(d)
}

export function getPriorityColor(priority?: string | null): string {
  const normalized = (priority ?? '').toLowerCase()
  switch (normalized) {
    case 'alta':
      return 'bg-red-100 text-red-800 border-red-200'
    case 'media':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case 'baja':
      return 'bg-green-100 text-green-800 border-green-200'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

export function getStatusColor(status?: string | null): string {
  const statusLower = (status ?? '').toLowerCase()
  if (statusLower.includes('pendiente')) {
    return 'bg-yellow-100 text-yellow-800'
  }
  if (statusLower.includes('progreso') || statusLower.includes('curso') || statusLower.includes('cotizando')) {
    return 'bg-blue-100 text-blue-800'
  }
  if (statusLower.includes('finalizado') || statusLower.includes('entregado') || statusLower.includes('completo')) {
    return 'bg-green-100 text-green-800'
  }
  return 'bg-gray-100 text-gray-800'
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function formatMoney(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
  }).format(amount)
}

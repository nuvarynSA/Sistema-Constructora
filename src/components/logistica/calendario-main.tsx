'use client'

import { useEffect, useMemo, useState, useRef } from 'react'
import { createClient } from '@/lib/mock/client'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { ChevronLeft, ChevronRight, Calendar, Clock, User, Truck, AlertCircle } from 'lucide-react'
import type { TareaLogistica } from '@/lib/types'

type CalendarViewMode = 'anual' | 'semana' | 'vehiculos'

const weekdayLabels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

/* ─── colores por vehículo (con patente) ─── */
const VEHICLE_COLORS: Record<string, { pill: string; dot: string }> = {
  'SAVEIRO OOQ334':  { pill: 'bg-purple-300 text-purple-900',  dot: 'bg-purple-500'  },
  'KANGOO AF873XB':  { pill: 'bg-yellow-300 text-yellow-900',  dot: 'bg-yellow-400'  },
  'KANGOO AF873WW':  { pill: 'bg-amber-300 text-amber-900',    dot: 'bg-amber-400'   },
  'KANGOO AE255GY':  { pill: 'bg-lime-300 text-lime-900',      dot: 'bg-lime-500'    },
  'OROCH AC698OV':   { pill: 'bg-red-300 text-red-900',        dot: 'bg-red-500'     },
  'ALASKAN AE889PT': { pill: 'bg-blue-300 text-blue-900',      dot: 'bg-blue-500'    },
  'MASTER AE255GZ':  { pill: 'bg-orange-300 text-orange-900',  dot: 'bg-orange-500'  },
}
const VEHICLE_COLORS_DEFAULT = { pill: 'bg-gray-300 text-gray-900', dot: 'bg-gray-400' }
const VEHICULOS_LIST = [
  'SAVEIRO OOQ334',
  'KANGOO AF873XB',
  'KANGOO AF873WW',
  'KANGOO AE255GY',
  'OROCH AC698OV',
  'ALASKAN AE889PT',
  'MASTER AE255GZ',
]

/* ─── franja horaria de la vista de vehículos: 08:00 – 18:00 ─── */
const SCHEDULE_START = 8 * 60   // 480 min
const SCHEDULE_END   = 18 * 60  // 1080 min
const SLOT_DURATION  = 30       // min por fila

const TIME_SLOTS = Array.from(
  { length: (SCHEDULE_END - SCHEDULE_START) / SLOT_DURATION },
  (_, i) => {
    const s   = SCHEDULE_START + i * SLOT_DURATION
    const e   = s + SLOT_DURATION
    const fmtH = (m: number) => String(Math.floor(m / 60)).padStart(2, '0')
    const fmtM = (m: number) => String(m % 60).padStart(2, '0')
    return {
      label: `${fmtH(s)}:${fmtM(s)}`,
      start: s,
      end:   e,
    }
  }
)

/* ─── helpers de fecha ─── */
const toDateKey = (date: Date) => {
  const year  = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day   = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const parseDateKey  = (dateKey: string) => new Date(`${dateKey}T00:00:00`)

const normalizeDateKey = (value?: string | null) => {
  if (!value) return ''
  if (value.includes('T')) return value.split('T')[0]
  if (value.includes('/')) {
    const parts = value.split('/')
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`
    }
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  const parsed = new Date(value)
  if (!Number.isNaN(parsed.getTime())) return toDateKey(parsed)
  return ''
}

const formatDate = (value?: string | null) => {
  const dateKey = normalizeDateKey(value)
  if (!dateKey) return ''
  return parseDateKey(dateKey).toLocaleDateString('es-AR')
}

const formatDateLong = (dateKey: string) =>
  parseDateKey(dateKey).toLocaleDateString('es-AR', {
    weekday: 'long',
    year:    'numeric',
    month:   'long',
    day:     'numeric',
  })

const extractHorario = (value?: string | null) => {
  if (!value || !value.includes('T')) return null
  const match = value.match(/T(\d{2}):(\d{2})/)
  if (!match) return null
  const [, hour, minute] = match
  if (hour === '00' && minute === '00') return null
  return `${hour}:${minute}`
}

/** Extrae minutos de un datetime ISO o null */
const datetimeToMinutes = (dt?: string | null): number | null => {
  if (!dt || !dt.includes('T')) return null
  const match = dt.match(/T(\d{2}):(\d{2})/)
  if (!match) return null
  return parseInt(match[1]) * 60 + parseInt(match[2])
}

const getCurrentWeekMonday = (baseDate = new Date()) => {
  const monday = new Date(baseDate)
  const day    = monday.getDay()
  const diff   = day === 0 ? -6 : 1 - day
  monday.setDate(monday.getDate() + diff)
  monday.setHours(0, 0, 0, 0)
  return monday
}

/* ─── color de evento (tareas + reservas) ─── */
const getEstadoColor = (estado: string, tipo?: string | null, tln?: string | null) => {
  const isReserva = tln?.startsWith('RV')
  if (isReserva && estado === 'confirmado') {
    return 'bg-green-100 text-green-800 border-green-300 dark:bg-green-500/25 dark:text-green-400 dark:border-green-500/70'
  }
  if (tipo === 'Consulta') {
    return 'bg-violet-100 text-violet-800 border-violet-300 dark:bg-violet-500/25 dark:text-violet-400 dark:border-violet-500/70'
  }
  return 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-500/25 dark:text-yellow-400 dark:border-yellow-500/70'
}

const getPrioridadColor = (prioridad: string) => {
  switch (prioridad) {
    case 'Alta':  return 'bg-red-100 text-red-800 dark:bg-red-500/25 dark:text-red-400'
    case 'Media': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/25 dark:text-yellow-400'
    case 'Baja':  return 'bg-green-100 text-green-800 dark:bg-green-500/25 dark:text-green-400'
    default:      return 'bg-gray-100 text-gray-800 dark:bg-gray-500/25 dark:text-gray-400'
  }
}

/* ═══════════════════════════════════════════ COMPONENTE PRINCIPAL ═══════════════════════════════════════════ */
export function CalendarioMain() {
  const dataClient = createClient()
  const [tareas, setTareas] = useState<TareaLogistica[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [viewMode, setViewMode] = useState<CalendarViewMode>('anual')
  const [hideSundayInWeekView, setHideSundayInWeekView] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedTareas, setSelectedTareas] = useState<TareaLogistica[]>([])
  const [detailReserva, setDetailReserva] = useState<TareaLogistica | null>(null)
  const calendarRef  = useRef<HTMLDivElement>(null)
  const hasLoadedRef = useRef(false)

  /* ─── fetch ─── */
  useEffect(() => {
    const fetchData = async () => {
      if (!hasLoadedRef.current) setLoading(true)
      try {
        const { data: tareasData, error } = await dataClient
          .from('tareas_logistica')
          .select('*')
          .neq('estado', 'finalizado')
          .order('fecha', { ascending: true })

        if (error || !tareasData) {
          setTareas([])
          setLoading(false)
          return
        }

        const userIds = new Set<string>()
        tareasData.forEach(t => {
          if (t.solicitante_id) userIds.add(t.solicitante_id)
          if (t.asignado_id)    userIds.add(t.asignado_id)
          if (t.creador_id)     userIds.add(t.creador_id)
        })

        let usuariosMap = new Map()
        if (userIds.size > 0) {
          const { data: usuariosData } = await dataClient
            .from('users')
            .select('id, name, email, area')
            .in('id', Array.from(userIds))
          usuariosMap = new Map((usuariosData || []).map(u => [u.id, u]))
        }

        setTareas(
          tareasData.map(t => ({
            ...t,
            solicitante: t.solicitante_id ? usuariosMap.get(t.solicitante_id) : null,
            asignado:    t.asignado_id    ? usuariosMap.get(t.asignado_id)    : null,
            creador:     t.creador_id     ? usuariosMap.get(t.creador_id)     : null,
          }))
        )
        hasLoadedRef.current = true
      } catch (err) {
        console.error('Error fetching calendario:', err)
        setTareas([])
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    const channel = dataClient
      .channel('calendario-tareas-logistica-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tareas_logistica' }, fetchData)
      .subscribe()
    return () => { dataClient.removeChannel(channel) }
  }, [dataClient])

  /* ─── scroll al mes actual ─── */
  useEffect(() => {
    if (!loading && viewMode === 'anual' && calendarRef.current) {
      const currentMonth  = new Date().getMonth()
      const monthElement  = calendarRef.current.children[currentMonth] as HTMLElement
      if (monthElement) monthElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [loading, viewMode])

  /* ─── tareas para vistas anual/semana: excluir reservas pendientes ─── */
  const tareasParaCalendario = useMemo(() =>
    tareas.filter(t => !(t.tln?.startsWith('RV') && t.estado === 'pendiente'))
  , [tareas])

  /* ─── agrupar por fecha (para vistas anual/semana) ─── */
  const byDate = useMemo(() => {
    const map: Record<string, TareaLogistica[]> = {}
    for (const t of tareasParaCalendario) {
      const fechaInicio = normalizeDateKey(t.fecha)
      const fechaFinal  = normalizeDateKey(t.fecha_limite || '')
      if (!fechaInicio) continue

      const start = parseDateKey(fechaInicio)
      const end   = fechaFinal ? parseDateKey(fechaFinal) : parseDateKey(fechaInicio)
      start.setHours(0, 0, 0, 0)
      end.setHours(0, 0, 0, 0)

      for (
        let current = new Date(start);
        current <= end;
        current.setDate(current.getDate() + 1)
      ) {
        const dateKey = toDateKey(current)
        if (!map[dateKey]) map[dateKey] = []
        map[dateKey].push(t)
      }
    }
    return map
  }, [tareasParaCalendario])

  const months      = Array.from({ length: 12 }, (_, i) => i)
  const todayKey    = toDateKey(new Date())

  const currentWeekDays = useMemo(() => {
    const monday = getCurrentWeekMonday()
    const next   = Array.from({ length: 7 }, (_, i) => {
      const day = new Date(monday)
      day.setDate(monday.getDate() + i)
      return {
        date:      toDateKey(day),
        dayNumber: day.getDate(),
        weekday:   weekdayLabels[i],
        isToday:   toDateKey(day) === todayKey,
        isSunday:  day.getDay() === 0,
      }
    })
    return hideSundayInWeekView ? next.filter(d => !d.isSunday) : next
  }, [hideSundayInWeekView, todayKey])

  /* ─── reservas confirmadas por celda [dayKey_slotStart] ─── */
  const reservasByCell = useMemo(() => {
    const confirmedRV = tareas.filter(t => t.tln?.startsWith('RV') && t.estado === 'confirmado')
    const map: Record<string, TareaLogistica[]> = {}

    for (const reserva of confirmedRV) {
      if (!reserva.fecha) continue

      const startDateKey = reserva.fecha.includes('T') ? reserva.fecha.split('T')[0] : reserva.fecha
      const startMins    = datetimeToMinutes(reserva.fecha) ?? SCHEDULE_START

      let endDateKey: string
      let endMins: number
      if (reserva.fecha_limite) {
        endDateKey = reserva.fecha_limite.includes('T')
          ? reserva.fecha_limite.split('T')[0]
          : reserva.fecha_limite
        endMins = datetimeToMinutes(reserva.fecha_limite) ?? SCHEDULE_END
      } else {
        endDateKey = startDateKey
        endMins    = SCHEDULE_END
      }

      for (const day of currentWeekDays) {
        const dayKey = day.date
        if (dayKey < startDateKey || dayKey > endDateKey) continue

        // Rango de tiempo efectivo para este día
        let dayStart: number
        let dayEnd:   number
        if (dayKey === startDateKey && dayKey === endDateKey) {
          dayStart = startMins
          dayEnd   = endMins
        } else if (dayKey === startDateKey) {
          dayStart = startMins
          dayEnd   = SCHEDULE_END
        } else if (dayKey === endDateKey) {
          dayStart = SCHEDULE_START
          dayEnd   = endMins
        } else {
          dayStart = SCHEDULE_START
          dayEnd   = SCHEDULE_END
        }

        for (const slot of TIME_SLOTS) {
          if (dayStart < slot.end && dayEnd > slot.start) {
            const cellKey = `${dayKey}_${slot.start}`
            if (!map[cellKey]) map[cellKey] = []
            map[cellKey].push(reserva)
          }
        }
      }
    }
    return map
  }, [tareas, currentWeekDays])

  /* ─── handlers ─── */
  const handleDateClick = (date: string, tareasDelDia: TareaLogistica[]) => {
    setSelectedDate(date)
    setSelectedTareas(tareasDelDia)
  }

  /* ══════════════════════ RENDER VISTAS ══════════════════════ */

  const renderMonth = (year: number, month: number) => {
    const firstDay     = new Date(year, month, 1)
    const lastDay      = new Date(year, month + 1, 0)
    const startWeekday = (firstDay.getDay() || 7)
    const daysInMonth  = lastDay.getDate()

    const cells: Array<{ date: string; day: number | null }> = []
    for (let i = 1; i < startWeekday; i++) cells.push({ date: '', day: null })
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = toDateKey(new Date(year, month, d))
      cells.push({ date: dateStr, day: d })
    }

    const monthName       = new Date(year, month, 1).toLocaleString('es-AR', { month: 'long' })
    const isCurrentMonth  = year === new Date().getFullYear() && month === new Date().getMonth()

    return (
      <div key={month} className={`space-y-2 ${isCurrentMonth ? 'ring-2 ring-primary rounded-lg p-2' : ''}`}>
        <h2 className={`text-lg font-semibold capitalize ${isCurrentMonth ? 'text-primary' : ''}`}>
          {monthName} {isCurrentMonth && '(Actual)'}
        </h2>
        <div className="grid grid-cols-7 gap-1">
          {weekdayLabels.map(h => (
            <div key={h} className="text-center text-[11px] text-muted-foreground font-medium">{h}</div>
          ))}
          {cells.map((c, idx) => {
            const tareasDelDia = byDate[c.date] || []
            const isToday      = c.date === todayKey
            return (
              <div
                key={idx}
                className={`min-h-24 border rounded-md p-1 transition-colors ${c.day ? 'cursor-pointer hover:bg-muted/50' : ''} ${isToday ? 'bg-primary/10 border-primary' : ''}`}
                onClick={() => c.day && handleDateClick(c.date, tareasDelDia)}
              >
                {c.day && (
                  <div>
                    <div className={`text-[11px] font-medium mb-1 ${isToday ? 'text-primary font-bold' : ''}`}>{c.day}</div>
                    <div className="space-y-1">
                      {tareasDelDia.slice(0, 2).map(t => (
                        <div key={t.id} className={`text-[10px] rounded px-1 py-0.5 border ${getEstadoColor(t.estado, t.tipo, t.tln)}`}>
                          <div className="truncate font-medium">{t.titulo || t.tln}</div>
                          <div className="text-[9px] opacity-75">{t.tipo || (t.tln?.startsWith('RV') ? 'Reserva' : 'Tarea')}</div>
                        </div>
                      ))}
                      {tareasDelDia.length > 2 && (
                        <div className="text-[9px] text-muted-foreground">+{tareasDelDia.length - 2} más</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const renderCurrentWeek = () => {
    const start         = currentWeekDays[0]?.date
    const end           = currentWeekDays[currentWeekDays.length - 1]?.date
    const weekRangeLabel = start && end ? `${formatDate(start)} - ${formatDate(end)}` : ''

    return (
      <div className="space-y-3">
        <div className="text-sm text-muted-foreground">Semana actual: {weekRangeLabel}</div>
        <div className="overflow-x-auto">
          <div
            className="grid gap-3 min-w-[780px]"
            style={{ gridTemplateColumns: `repeat(${currentWeekDays.length}, minmax(0, 1fr))` }}
          >
            {currentWeekDays.map(day => {
              const tareasDelDia = byDate[day.date] || []
              return (
                <button
                  key={day.date}
                  type="button"
                  onClick={() => handleDateClick(day.date, tareasDelDia)}
                  className={`min-h-40 rounded-lg border p-2 text-left transition hover:bg-muted/40 ${day.isToday ? 'border-primary bg-primary/5' : ''}`}
                >
                  <div className="mb-2">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">{day.weekday}</div>
                    <div className={`text-lg font-semibold ${day.isToday ? 'text-primary' : ''}`}>{day.dayNumber}</div>
                  </div>
                  <div className="space-y-1">
                    {tareasDelDia.slice(0, 4).map(t => (
                      <div key={t.id} className={`rounded border px-1 py-1 text-[10px] ${getEstadoColor(t.estado, t.tipo, t.tln)}`}>
                        <div className="truncate font-medium">{t.titulo || t.tln}</div>
                        <div className="truncate opacity-80">
                          {extractHorario(t.fecha) ? `${extractHorario(t.fecha)} · ` : ''}
                          {t.tipo || (t.tln?.startsWith('RV') ? 'Reserva' : 'Tarea')}
                        </div>
                      </div>
                    ))}
                    {tareasDelDia.length === 0 && (
                      <div className="text-[10px] text-muted-foreground">Sin tareas</div>
                    )}
                    {tareasDelDia.length > 4 && (
                      <div className="text-[10px] text-muted-foreground">+{tareasDelDia.length - 4} más</div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  const renderVehicleSchedule = () => {
    const start          = currentWeekDays[0]?.date
    const end            = currentWeekDays[currentWeekDays.length - 1]?.date
    const weekRangeLabel = start && end ? `${formatDate(start)} - ${formatDate(end)}` : ''

    return (
      <div className="space-y-4">
        <div className="text-sm text-muted-foreground">Reservas confirmadas — semana: {weekRangeLabel}</div>

        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[700px] border-collapse text-sm">
            <thead>
              <tr className="bg-muted/40">
                <th className="border-b border-r p-2 text-left text-xs text-muted-foreground w-24 font-medium">
                  Hora
                </th>
                {currentWeekDays.map(day => (
                  <th
                    key={day.date}
                    className={`border-b border-r last:border-r-0 p-2 text-center text-xs font-medium ${day.isToday ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}
                  >
                    <div>{day.weekday}</div>
                    <div className={`text-base font-bold ${day.isToday ? 'text-primary' : 'text-foreground'}`}>{day.dayNumber}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TIME_SLOTS.map((slot, slotIdx) => (
                <tr key={slot.start} className={slotIdx % 2 === 0 ? 'bg-background' : 'bg-muted/10'}>
                  <td className="border-b border-r p-1 text-[11px] text-muted-foreground font-mono whitespace-nowrap">
                    {slot.label}
                  </td>
                  {currentWeekDays.map(day => {
                    const cellKey    = `${day.date}_${slot.start}`
                    const cellReservas = reservasByCell[cellKey] || []
                    return (
                      <td
                        key={day.date}
                        className="border-b border-r last:border-r-0 p-1 min-w-[100px] align-top"
                      >
                        {cellReservas.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {cellReservas.slice(0, 2).map(r => {
                              const colors  = VEHICLE_COLORS[r.vehiculo || ''] || VEHICLE_COLORS_DEFAULT
                              const name    = r.solicitante?.name?.split(' ')[0] || r.tln || '?'
                              return (
                                <button
                                  key={r.id}
                                  type="button"
                                  className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold truncate max-w-[96px] leading-tight ${colors.pill} hover:opacity-80 transition-opacity`}
                                  title={`${r.solicitante?.name || 'Sin solicitante'} — ${r.vehiculo || 'Sin vehículo'} (${r.tln})`}
                                  onClick={() => setDetailReserva(r)}
                                >
                                  {name}
                                </button>
                              )
                            })}
                            {cellReservas.length > 2 && (
                              <button
                                type="button"
                                className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground font-semibold hover:bg-muted/80"
                                onClick={() => {
                                  setSelectedDate(day.date)
                                  setSelectedTareas(cellReservas)
                                }}
                              >
                                +{cellReservas.length - 2}
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Leyenda de vehículos */}
        <div className="flex flex-wrap gap-x-5 gap-y-2 pt-1">
          {VEHICULOS_LIST.map(v => {
            const colors              = VEHICLE_COLORS[v] || VEHICLE_COLORS_DEFAULT
            const [tipo, patente]     = v.split(' ')
            return (
              <div key={v} className="flex items-center gap-1.5">
                <span className={`h-3 w-3 rounded-sm flex-shrink-0 ${colors.dot}`} />
                <span className="text-xs font-semibold">{tipo}</span>
                <span className="text-xs text-muted-foreground">{patente}</span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  /* ─── loading ─── */
  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
    </div>
  )

  /* ══════════════════════ RENDER PRINCIPAL ══════════════════════ */
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold">Calendario de Logística</h1>
          <p className="text-sm text-muted-foreground">Elegí entre vista anual, semana o vehículos.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={viewMode === 'anual' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('anual')}
          >
            Vista anual
          </Button>
          <Button
            variant={viewMode === 'semana' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('semana')}
          >
            Semana actual
          </Button>
          <Button
            variant={viewMode === 'vehiculos' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('vehiculos')}
          >
            <Truck className="h-3.5 w-3.5 mr-1.5" />
            Vehículos
          </Button>

          {viewMode === 'anual' ? (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedYear(selectedYear - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2 px-3 py-1 border rounded-md bg-background">
                <Calendar className="h-4 w-4" />
                <span className="font-medium">{selectedYear}</span>
              </div>
              <Button variant="outline" size="sm" onClick={() => setSelectedYear(selectedYear + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          ) : viewMode !== 'vehiculos' ? (
            <div className="flex items-center gap-2 rounded-md border px-3 py-2">
              <Switch
                id="week-hide-sunday"
                checked={hideSundayInWeekView}
                onCheckedChange={setHideSundayInWeekView}
              />
              <label htmlFor="week-hide-sunday" className="text-sm">Mostrar solo Lun-Sáb</label>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-md border px-3 py-2">
              <Switch
                id="vehicle-hide-sunday"
                checked={hideSundayInWeekView}
                onCheckedChange={setHideSundayInWeekView}
              />
              <label htmlFor="vehicle-hide-sunday" className="text-sm">Mostrar solo Lun-Sáb</label>
            </div>
          )}
        </div>
      </div>

      {viewMode === 'anual' && (
        <div ref={calendarRef} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {months.map(m => renderMonth(selectedYear, m))}
        </div>
      )}
      {viewMode === 'semana'    && renderCurrentWeek()}
      {viewMode === 'vehiculos' && renderVehicleSchedule()}

      {/* ─── Modal detalle de reserva individual (click en pill) ─── */}
      <Dialog open={!!detailReserva} onOpenChange={() => setDetailReserva(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              {detailReserva?.titulo || detailReserva?.tln}
            </DialogTitle>
          </DialogHeader>
          {detailReserva && (
            <div className="space-y-3">
              <div className="flex gap-2 flex-wrap">
                <Badge className="bg-green-100 text-green-800 dark:bg-green-500/25 dark:text-green-400">
                  Confirmado
                </Badge>
                <Badge variant="outline">{detailReserva.prioridad}</Badge>
              </div>
              {detailReserva.descripcion && (
                <p className="text-sm text-muted-foreground">{detailReserva.descripcion}</p>
              )}
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>Solicitante:</span>
                  <span className="font-medium">{detailReserva.solicitante?.name ?? '—'}</span>
                </div>
                {detailReserva.vehiculo && (
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-muted-foreground" />
                    <span>Vehículo:</span>
                    <span className="font-medium">{detailReserva.vehiculo}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>Inicio:</span>
                  <span className="font-medium">
                    {formatDate(detailReserva.fecha)}
                    {extractHorario(detailReserva.fecha) ? ` · ${extractHorario(detailReserva.fecha)}` : ''}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  <span>Final:</span>
                  <span className="font-medium">
                    {formatDate(detailReserva.fecha_limite)}
                    {extractHorario(detailReserva.fecha_limite) ? ` · ${extractHorario(detailReserva.fecha_limite)}` : ''}
                  </span>
                </div>
              </div>
              <div className="pt-1 border-t text-sm">
                <span className="font-medium">TLN: </span>
                <span className="font-mono">{detailReserva.tln}</span>
                <span className="ml-4 font-medium">Tipo: </span>
                <span>{detailReserva.tipo || 'RESERVA'}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Modal detalle del día (click en día o en "+N") ─── */}
      <Dialog open={!!selectedDate} onOpenChange={() => setSelectedDate(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {selectedDate ? formatDateLong(selectedDate) : ''}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {selectedTareas.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No hay tareas programadas para este día</p>
              </div>
            ) : (
              selectedTareas.map(tarea => (
                <div key={tarea.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h3 className="font-semibold text-lg">{tarea.titulo || tarea.tln}</h3>
                      {tarea.descripcion && (
                        <p className="text-sm text-muted-foreground">{tarea.descripcion}</p>
                      )}
                    </div>
                    <div className="flex gap-2 flex-wrap justify-end">
                      <Badge className={getEstadoColor(tarea.estado, tarea.tipo, tarea.tln)}>
                        {tarea.estado.replace('_', ' ')}
                      </Badge>
                      <Badge className={getPrioridadColor(tarea.prioridad)}>
                        {tarea.prioridad}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Solicitante:</span>
                        <span>{tarea.solicitante?.name ?? '—'}</span>
                      </div>
                      {tarea.asignado && (
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Asignado:</span>
                          <span>{tarea.asignado?.name ?? '—'}</span>
                        </div>
                      )}
                      {tarea.vehiculo && (
                        <div className="flex items-center gap-2">
                          <Truck className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Vehículo:</span>
                          <span>{tarea.vehiculo}</span>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Fecha inicio:</span>
                        <span>{formatDate(tarea.fecha)}</span>
                      </div>
                      {extractHorario(tarea.fecha) && (
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Horario inicio:</span>
                          <span>{extractHorario(tarea.fecha)}</span>
                        </div>
                      )}
                      {tarea.fecha_limite && (
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Fecha final:</span>
                          <span>{formatDate(tarea.fecha_limite)}</span>
                        </div>
                      )}
                      {extractHorario(tarea.fecha_limite) && (
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Horario final:</span>
                          <span>{extractHorario(tarea.fecha_limite)}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <span className="font-medium">TLN:</span>
                        <span className="font-mono">{tarea.tln}</span>
                      </div>
                    </div>
                  </div>

                  {tarea.tipo && (
                    <div className="pt-2 border-t">
                      <span className="text-sm font-medium">Tipo: </span>
                      <span className="text-sm">{tarea.tipo}</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

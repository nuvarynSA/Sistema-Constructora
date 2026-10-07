// Almacén en memoria compartido por el cliente de datos simulado y la API simulada.
import { buildSeed, type Row, type Tables } from './seed'

const seeded = buildSeed()

export const tables: Tables = seeded.tables
export const stockTables: Tables = seeded.stock

// ── Realtime simulado ───────────────────────────────────────────────────────
type Listener = { table: string; filter?: string; cb: (payload: any) => void }
const listeners = new Set<Listener>()

export const subscribeTable = (l: Listener) => {
  listeners.add(l)
  return () => { listeners.delete(l) }
}

const matchesFilter = (filter: string | undefined, row: Row | undefined) => {
  if (!filter || !row) return true
  const m = /^([a-z_]+)=eq\.(.*)$/.exec(filter)
  if (!m) return true
  return String(row[m[1]]) === m[2]
}

export const emitChange = (table: string, eventType: 'INSERT' | 'UPDATE' | 'DELETE', row?: Row) => {
  setTimeout(() => {
    listeners.forEach((l) => {
      if (l.table === table && matchesFilter(l.filter, row)) {
        try { l.cb({ eventType, schema: 'public', table, new: row ?? {}, old: row ?? {} }) } catch (e) { console.error('[mock realtime]', e) }
      }
    })
  }, 0)
}

// ── Sesión simulada (se guarda en localStorage del navegador) ──────────────
const SESSION_KEY = 'nexora:mock-session'

export const getSessionUser = (): Row | null => {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const { userId } = JSON.parse(raw)
    return tables.users.find((u) => u.id === userId) || null
  } catch { return null }
}

export const setSessionUser = (userId: string | null) => {
  if (typeof window === 'undefined') return
  try {
    if (userId) window.localStorage.setItem(SESSION_KEY, JSON.stringify({ userId }))
    else window.localStorage.removeItem(SESSION_KEY)
  } catch { /* noop */ }
}

export const newId = (prefix: string) =>
  `${prefix}_${typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10)}`

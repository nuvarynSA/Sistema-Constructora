/* eslint-disable @typescript-eslint/no-explicit-any */
// Cliente de datos 100% simulado: mismas llamadas que una librería de consultas
// (from/select/eq/order/insert/update/delete/auth/channel...) pero resueltas en memoria.
import { tables, emitChange, subscribeTable, getSessionUser, setSessionUser, newId } from './store'
import type { Row } from './seed'

type Result = { data: any; error: any; count?: number | null }
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

// ───────────────────────── select con relaciones ─────────────────────────
const singular = (t: string) => (t.endsWith('ones') ? t.slice(0, -2) : t.endsWith('s') ? t.slice(0, -1) : t)

type SelItem = { name: string; alias?: string; table?: string; fk?: string; inner?: string }
const splitTop = (s: string): string[] => {
  const out: string[] = []
  let depth = 0
  let cur = ''
  for (const ch of s) {
    if (ch === '(') depth++
    if (ch === ')') depth--
    if (ch === ',' && depth === 0) { out.push(cur.trim()); cur = ''; continue }
    cur += ch
  }
  if (cur.trim()) out.push(cur.trim())
  return out
}
const parseSelect = (sel: string): SelItem[] =>
  splitTop(sel.replace(/\s+/g, ' ')).map((part) => {
    const m = /^(?:(\w+):)?(\w+)(?:!(\w+))?\((.*)\)$/.exec(part)
    if (m) return { name: m[1] || m[2], alias: m[1], table: m[2], fk: m[3], inner: m[4] }
    return { name: part }
  })

const project = (rows: Row[], sel: string, table: string): Row[] => {
  const items = parseSelect(sel || '*')
  return rows.map((row) => {
    const out: Row = {}
    for (const it of items) {
      if (it.name === '*') { Object.assign(out, row); continue }
      if (!it.table) { out[it.name] = row[it.name]; continue }
      const relRows = tables[it.table] || []
      let forwardKey: string | null = null
      if (it.fk && it.fk in row) forwardKey = it.fk
      else if (it.alias && `${it.alias}_id` in row) forwardKey = `${it.alias}_id`
      else if (`${singular(it.table)}_id` in row) forwardKey = `${singular(it.table)}_id`
      if (forwardKey) {
        const target = relRows.find((r) => r.id === row[forwardKey!])
        out[it.name] = target ? project([target], it.inner || '*', it.table)[0] : null
      } else {
        const childKey = it.fk || `${singular(table)}_id`
        out[it.name] = project(relRows.filter((r) => r[childKey] === row.id), it.inner || '*', it.table)
      }
    }
    return out
  })
}

// ───────────────────────── filtros ─────────────────────────
const likeToRegex = (pattern: string) =>
  new RegExp('^' + pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*').replace(/_/g, '.') + '$', 'i')

const cmp = (a: any, b: any) => {
  if (a === null || a === undefined) return -1
  if (b === null || b === undefined) return 1
  if (typeof a === 'number' && typeof b === 'number') return a - b
  const ta = Date.parse(a)
  const tb = Date.parse(b)
  if (typeof a === 'string' && typeof b === 'string' && !Number.isNaN(ta) && !Number.isNaN(tb) && /\d{4}-\d{2}-\d{2}/.test(a) && /\d{4}-\d{2}-\d{2}/.test(b)) return ta - tb
  return String(a).localeCompare(String(b))
}

type Pred = (row: Row) => boolean
const evalOp = (op: string, col: string, val: any, negate = false): Pred => (row) => {
  const v = row[col]
  let res: boolean
  switch (op) {
    case 'eq': res = String(v) === String(val) && v !== null && v !== undefined; break
    case 'neq': res = String(v) !== String(val); break
    case 'gt': res = cmp(v, val) > 0; break
    case 'gte': res = cmp(v, val) >= 0; break
    case 'lt': res = cmp(v, val) < 0; break
    case 'lte': res = cmp(v, val) <= 0; break
    case 'in': res = (Array.isArray(val) ? val : String(val).replace(/[()]/g, '').split(',')).map(String).includes(String(v)); break
    case 'is': res = val === null || val === 'null' ? v === null || v === undefined : v === val; break
    case 'ilike': case 'like': res = v !== null && v !== undefined && likeToRegex(String(val)).test(String(v)); break
    case 'contains': res = Array.isArray(v) ? (val as any[]).every((x) => v.includes(x)) : false; break
    default: res = true
  }
  return negate ? !res : res
}
const parseOr = (expr: string): Pred => {
  const preds = splitTop(expr).map((c) => {
    const parts = c.split('.')
    const col = parts[0]
    let negate = false
    let idx = 1
    if (parts[idx] === 'not') { negate = true; idx++ }
    const op = parts[idx]
    const val = parts.slice(idx + 1).join('.')
    return evalOp(op, col, val === 'null' ? null : val, negate)
  })
  return (row) => preds.some((p) => p(row))
}

// ───────────────────────── query builder ─────────────────────────
class Query implements PromiseLike<Result> {
  private op: 'select' | 'insert' | 'update' | 'delete' | 'upsert' = 'select'
  private selStr = '*'
  private hasSelect = false
  private preds: Pred[] = []
  private orders: Array<{ col: string; asc: boolean }> = []
  private limitN: number | null = null
  private rangeR: [number, number] | null = null
  private mode: 'many' | 'single' | 'maybe' = 'many'
  private payload: any = null
  private head = false
  private wantCount = false
  private onConflict: string | null = null

  constructor(private table: string) {}

  select(cols = '*', opts?: { count?: string; head?: boolean }) {
    this.selStr = cols
    this.hasSelect = true
    if (opts?.head) this.head = true
    if (opts?.count) this.wantCount = true
    return this
  }
  insert(rows: any) { this.op = 'insert'; this.payload = rows; return this }
  update(patch: any) { this.op = 'update'; this.payload = patch; return this }
  delete() { this.op = 'delete'; return this }
  upsert(rows: any, opts?: { onConflict?: string }) { this.op = 'upsert'; this.payload = rows; this.onConflict = opts?.onConflict || null; return this }

  eq(c: string, v: any) { this.preds.push(evalOp('eq', c, v)); return this }
  neq(c: string, v: any) { this.preds.push(evalOp('neq', c, v)); return this }
  gt(c: string, v: any) { this.preds.push(evalOp('gt', c, v)); return this }
  gte(c: string, v: any) { this.preds.push(evalOp('gte', c, v)); return this }
  lt(c: string, v: any) { this.preds.push(evalOp('lt', c, v)); return this }
  lte(c: string, v: any) { this.preds.push(evalOp('lte', c, v)); return this }
  in(c: string, v: any[]) { this.preds.push(evalOp('in', c, v)); return this }
  is(c: string, v: any) { this.preds.push(evalOp('is', c, v)); return this }
  like(c: string, v: string) { this.preds.push(evalOp('like', c, v)); return this }
  ilike(c: string, v: string) { this.preds.push(evalOp('ilike', c, v)); return this }
  contains(c: string, v: any) { this.preds.push(evalOp('contains', c, v)); return this }
  not(c: string, op: string, v: any) { this.preds.push(evalOp(op, c, v, true)); return this }
  or(expr: string) { this.preds.push(parseOr(expr)); return this }
  match(obj: Record<string, any>) { Object.entries(obj).forEach(([k, v]) => this.eq(k, v)); return this }
  order(col: string, opts?: { ascending?: boolean }) { this.orders.push({ col, asc: opts?.ascending !== false }); return this }
  limit(n: number) { this.limitN = n; return this }
  range(a: number, b: number) { this.rangeR = [a, b]; return this }
  single() { this.mode = 'single'; return this }
  maybeSingle() { this.mode = 'maybe'; return this }

  private run(): Result {
    const rows = (tables[this.table] ||= [])
    const now = new Date().toISOString()
    let affected: Row[] = []

    if (this.op === 'insert' || this.op === 'upsert') {
      const list: Row[] = Array.isArray(this.payload) ? this.payload : [this.payload]
      for (const r of list) {
        const row: Row = { id: newId(this.table.slice(0, 3)), created_at: now, updated_at: now, ...r }
        if (this.op === 'upsert') {
          const key = this.onConflict || (this.table === 'configurations' ? 'key' : 'id')
          const existing = rows.find((x) => x[key] !== undefined && x[key] === row[key])
          if (existing) { Object.assign(existing, r, { updated_at: now }); affected.push(existing); emitChange(this.table, 'UPDATE', existing); continue }
        }
        rows.unshift(row)
        affected.push(row)
        emitChange(this.table, 'INSERT', row)
      }
    } else if (this.op === 'update') {
      affected = rows.filter((r) => this.preds.every((p) => p(r)))
      affected.forEach((r) => { Object.assign(r, this.payload); emitChange(this.table, 'UPDATE', r) })
    } else if (this.op === 'delete') {
      affected = rows.filter((r) => this.preds.every((p) => p(r)))
      affected.forEach((r) => {
        rows.splice(rows.indexOf(r), 1)
        emitChange(this.table, 'DELETE', r)
        // borrado en cascada simple de hijos
        const key = `${singular(this.table)}_id`
        Object.keys(tables).forEach((t) => {
          if (['orders', 'licitaciones'].includes(this.table)) tables[t] = tables[t].filter((c) => c[key] !== r.id)
        })
      })
    } else {
      affected = rows.filter((r) => this.preds.every((p) => p(r)))
    }

    const isRead = this.op === 'select'
    if (!isRead && !this.hasSelect) return { data: null, error: null }

    let out = affected.slice()
    if (this.orders.length) {
      out.sort((a, b) => {
        for (const o of this.orders) {
          const c = cmp(a[o.col], b[o.col])
          if (c !== 0) return o.asc ? c : -c
        }
        return 0
      })
    }
    const count = out.length
    if (this.rangeR) out = out.slice(this.rangeR[0], this.rangeR[1] + 1)
    if (this.limitN !== null) out = out.slice(0, this.limitN)
    if (this.head) return { data: null, error: null, count }
    const projected = project(out, this.selStr, this.table).map((r) => JSON.parse(JSON.stringify(r)))

    if (this.mode === 'single') {
      if (projected.length !== 1) return { data: null, error: { message: 'JSON object requested, multiple (or no) rows returned', code: 'PGRST116' } }
      return { data: projected[0], error: null }
    }
    if (this.mode === 'maybe') return { data: projected[0] ?? null, error: null }
    return { data: projected, error: null, count: this.wantCount ? count : null }
  }

  then<T1 = Result, T2 = never>(
    onfulfilled?: ((value: Result) => T1 | PromiseLike<T1>) | null,
    onrejected?: ((reason: any) => T2 | PromiseLike<T2>) | null,
  ): PromiseLike<T1 | T2> {
    return delay(40 + Math.random() * 70).then(() => this.run()).then(onfulfilled, onrejected)
  }
}

// ───────────────────────── auth ─────────────────────────
const authListeners = new Set<(event: string, session: any) => void>()
const makeSession = (u: Row | null) =>
  u ? { access_token: 'mock-token', refresh_token: 'mock-refresh', expires_in: 3600, token_type: 'bearer', user: { id: u.id, email: u.email, user_metadata: { name: u.name } } } : null
const fire = (event: string) => {
  const s = makeSession(getSessionUser())
  authListeners.forEach((cb) => { try { cb(event, s) } catch (e) { console.error(e) } })
}

const auth = {
  async getSession() { await delay(20); return { data: { session: makeSession(getSessionUser()) }, error: null } },
  async getUser() {
    await delay(20)
    const u = getSessionUser()
    return u ? { data: { user: makeSession(u)!.user }, error: null } : { data: { user: null }, error: { message: 'Auth session missing!' } }
  },
  async refreshSession() {
    const s = makeSession(getSessionUser())
    return s ? { data: { session: s, user: s.user }, error: null } : { data: { session: null, user: null }, error: { message: 'No session' } }
  },
  async signInWithPassword({ email }: { email: string; password: string }) {
    await delay(350)
    const clean = String(email || '').trim().toLowerCase()
    // Demo: cualquier contraseña es válida. Si el email no existe, se entra como administrador.
    const user = tables.users.find((u) => String(u.email).toLowerCase() === clean && u.status === 'Activo') || tables.users[0]
    setSessionUser(user.id)
    user.last_login = new Date().toISOString()
    const session = makeSession(user)
    setTimeout(() => fire('SIGNED_IN'), 0)
    return { data: { user: session!.user, session }, error: null }
  },
  async signOut() { setSessionUser(null); setTimeout(() => fire('SIGNED_OUT'), 0); return { error: null } },
  onAuthStateChange(cb: (event: string, session: any) => void) {
    authListeners.add(cb)
    setTimeout(() => cb('INITIAL_SESSION', makeSession(getSessionUser())), 0)
    return { data: { subscription: { unsubscribe: () => { authListeners.delete(cb) } } } }
  },
  async resetPasswordForEmail() { await delay(200); return { data: {}, error: null } },
  async updateUser() { return { data: { user: makeSession(getSessionUser())?.user ?? null }, error: null } },
}

// ───────────────────────── realtime ─────────────────────────
class Channel {
  private unsubs: Array<() => void> = []
  private subs: Array<{ table: string; filter?: string; cb: (p: any) => void }> = []
  on(_type: string, opts: { table?: string; filter?: string }, cb: (p: any) => void) {
    if (opts?.table) this.subs.push({ table: opts.table, filter: opts.filter, cb })
    return this
  }
  subscribe(cb?: (status: string) => void) {
    this.subs.forEach((s) => this.unsubs.push(subscribeTable(s)))
    cb?.('SUBSCRIBED')
    return this
  }
  unsubscribe() { this.unsubs.forEach((u) => u()); this.unsubs = []; return Promise.resolve('ok') }
}

export const mockClient: any = {
  from: (table: string) => new Query(table),
  auth,
  channel: (_name: string) => new Channel(),
  removeChannel: (ch: Channel) => ch?.unsubscribe?.(),
  storage: {
    from: () => ({
      upload: async (path: string) => ({ data: { path }, error: null }),
      getPublicUrl: (path: string) => ({ data: { publicUrl: `#${path}` } }),
      remove: async () => ({ data: [], error: null }),
    }),
  },
  rpc: async () => ({ data: null, error: null }),
}

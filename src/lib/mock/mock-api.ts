/* eslint-disable @typescript-eslint/no-explicit-any */
// Simula en memoria las rutas /api/* usadas por la interfaz (usuarios, archivos, stock, reportes).
import { tables, stockTables, emitChange, getSessionUser, newId } from './store'
import type { Row } from './seed'

type ApiRes = { status: number; body: any }
const ok = (body: any = { success: true }, status = 200): ApiRes => ({ status, body })
const fail = (status: number, error: string, extra: any = {}): ApiRes => ({ status, body: { error, ...extra } })
const now = () => new Date().toISOString()
const num = (v: any) => (v === undefined || v === null || v === '' ? 0 : Number(v))

// Archivos subidos en la sesión (publicUrl simulada → blob real del navegador)
const blobByPublicUrl = new Map<string, string>()
const resolveUrl = (u: string) => blobByPublicUrl.get(u) || u
const fileSizeLabel = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(2)} MB`

const currentUser = (): Row => getSessionUser() || tables.users[0]

const addDoc = (fields: Row) => {
  const row = { id: newId('doc'), fecha: now(), created_at: now(), updated_at: now(), order_id: null, licitacion_id: null, ...fields }
  tables.documents.unshift(row)
  emitChange('documents', 'INSERT', row)
  return row
}
const addOrderHistory = (orderId: string, accion: string, tipo: string) => {
  const row = { id: newId('oh'), order_id: orderId, fecha: now(), usuario_id: currentUser().id, accion, tipo, created_at: now() }
  tables.order_histories.unshift(row)
}

// ── stock helpers ─────────────────────────────────────────────────────────
const S = stockTables
const findBy = (rows: Row[], needle: any, keys: string[]) => {
  const n = String(needle ?? '').trim().toLowerCase()
  return rows.find((r) => keys.some((k) => String(r[k] ?? '').toLowerCase() === n))
}
const obraDeImp = (imp: Row) => tables.obras.find((o) => o.id === imp.obraId)
const recalcMaterial = (materialId: string) => {
  const m = S.materiales.find((x) => x.id === materialId)
  if (m) m.cantidad = S.stocks.filter((s) => s.materialId === materialId).reduce((a, s) => a + s.cantidadActual, 0)
}
const registrarMovimiento = (imputacionId: string, materialId: string, tipoMovimiento: string, cantidad: number, usuario?: string, observaciones?: string) => {
  S.movimientos.unshift({ id: newId('mov'), imputacionId, materialId, tipoMovimiento, cantidad, fecha: now(), usuario: usuario || currentUser().name, observaciones: observaciones || '' })
}
const getStock = (imputacionId: string, materialId: string) => {
  let st = S.stocks.find((s) => s.imputacionId === imputacionId && s.materialId === materialId)
  if (!st) {
    st = { id: newId('st'), imputacionId, materialId, cantidadActual: 0, createdAt: now(), updatedAt: now() }
    S.stocks.push(st)
  }
  return st
}

type Handler = (c: { params: Record<string, string>; query: URLSearchParams; body: any; method: string }) => ApiRes | Promise<ApiRes>
const routes: Array<{ m: string; re: RegExp; keys: string[]; h: Handler }> = []
const route = (m: string, pattern: string, h: Handler) => {
  const keys: string[] = []
  const re = new RegExp('^' + pattern.replace(/\[(\w+)\]/g, (_, k) => { keys.push(k); return '([^/]+)' }) + '/?$')
  routes.push({ m, re, keys, h })
}

// ── health / utilidades ───────────────────────────────────────────────────
route('GET', '/api/health', () => ok({ status: 'ok', mode: 'demo' }))
route('POST', '/api/notifications/check-dates', () => ok({ success: true, created: 0 }))

// ── usuarios ──────────────────────────────────────────────────────────────
const recountRoles = () => tables.roles.forEach((r) => { r.user_count = tables.users.filter((u) => u.role_id === r.id).length })
const initialsOf = (name: string) => String(name || '').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()

route('POST', '/api/users', ({ body }) => {
  if (!body?.email || !body?.name) return fail(400, 'Nombre y email son requeridos')
  if (tables.users.some((u) => u.email.toLowerCase() === String(body.email).toLowerCase())) return fail(400, 'Ya existe un usuario con ese email')
  const u: Row = {
    id: newId('user'), name: body.name, email: body.email, role_id: body.roleId || null, area: body.area || '', avatar: initialsOf(body.name),
    phone: body.phone || null, position: body.position || null, status: 'Activo', last_login: null, created_at: now(), updated_at: now(),
  }
  tables.users.unshift(u)
  recountRoles()
  emitChange('users', 'INSERT', u)
  return ok({ success: true, user: u }, 201)
})
route('PUT', '/api/users', ({ body }) => {
  const u = tables.users.find((x) => x.id === body?.id)
  if (!u) return fail(404, 'Usuario no encontrado')
  Object.assign(u, {
    name: body.name ?? u.name, email: body.email ?? u.email, role_id: body.roleId ?? u.role_id, area: body.area ?? u.area,
    position: body.position ?? null, phone: body.phone ?? null, avatar: initialsOf(body.name ?? u.name), updated_at: now(),
  })
  recountRoles()
  emitChange('users', 'UPDATE', u)
  return ok({ success: true, user: u })
})
route('PUT', '/api/users/profile', ({ body }) => {
  const u = currentUser()
  Object.assign(u, { name: body?.name ?? u.name, email: body?.email ?? u.email, phone: body?.phone ?? null, position: body?.position ?? null, area: body?.area ?? u.area, avatar: initialsOf(body?.name ?? u.name), updated_at: now() })
  return ok({ success: true, user: u })
})
route('POST', '/api/users/sync', () => ok({ success: true, message: 'Usuario sincronizado (modo demo)' }))
route('POST', '/api/users/bulk-assign', () => ok({ success: true }))
route('DELETE', '/api/users/[id]', ({ params }) => {
  const i = tables.users.findIndex((u) => u.id === params.id)
  if (i < 0) return fail(404, 'Usuario no encontrado')
  if (params.id === currentUser().id) return fail(400, 'No podés eliminar tu propio usuario')
  const [u] = tables.users.splice(i, 1)
  recountRoles()
  emitChange('users', 'DELETE', u)
  return ok({ success: true })
})

// ── subida de archivos (presigned simulado) ───────────────────────────────
route('POST', '/api/upload/presign', ({ body }) => {
  const token = newId('up')
  const safe = encodeURIComponent(body?.filename || 'archivo')
  return ok({ uploadUrl: `https://mock-storage.nexora.demo/upload/${token}/${safe}`, publicUrl: `https://mock-storage.nexora.demo/files/${token}/${safe}` })
})
route('POST', '/api/upload', () => ok({ success: true, url: '#' }))

// ── pedidos: archivos ─────────────────────────────────────────────────────
const fileFrom = (body: any): { url: string; name: string; size: string } | null => {
  if (body && typeof FormData !== 'undefined' && body instanceof FormData) {
    const f = body.get('file') as File | null
    if (!f || typeof f === 'string') return null
    return { url: URL.createObjectURL(f), name: f.name, size: fileSizeLabel(f.size) }
  }
  if (body?.uploadedUrl && body?.filename) return { url: resolveUrl(body.uploadedUrl), name: body.filename, size: body.fileSize ? `${body.fileSize} MB` : '0.10 MB' }
  return null
}
const orderFileRoutes = (kind: 'comentario' | 'descripcion', tipoDoc: string, historyTipo: string, label: string) => {
  route('POST', `/api/orders/[id]/${kind}`, ({ params, body }) => {
    const f = fileFrom(body)
    if (!f) return fail(400, 'No se proporcionó archivo')
    addDoc({ nombre: f.name, tipo: tipoDoc, tamano: f.size, url: f.url, order_id: params.id })
    addOrderHistory(params.id, `${label}: ${f.name}`, historyTipo)
    return ok({ success: true, data: { url: f.url, fileName: f.name } })
  })
  route('DELETE', `/api/orders/[id]/${kind}`, ({ params, query }) => {
    const docId = query.get('documentId')
    const i = tables.documents.findIndex((d) => d.id === docId)
    if (i < 0) return fail(404, 'Documento no encontrado')
    const [d] = tables.documents.splice(i, 1)
    addOrderHistory(params.id, `Archivo eliminado: ${d.nombre}`, `${kind}_delete`)
    return ok({ success: true })
  })
}
orderFileRoutes('comentario', 'Comentario', 'comentario_upload', 'Archivo adjunto en comentario')
orderFileRoutes('descripcion', 'Descripción', 'descripcion_upload', 'Archivo adjunto en descripción')

route('POST', '/api/orders/[id]/remito', ({ params, body }) => {
  const f = fileFrom(body)
  const o = tables.orders.find((x) => x.id === params.id)
  if (!f || !o) return fail(400, 'No se proporcionó archivo')
  o.remito_url = f.url
  emitChange('orders', 'UPDATE', o)
  return ok({ success: true, data: { url: f.url, fileName: f.name } })
})
route('DELETE', '/api/orders/[id]/remito', ({ params }) => {
  const o = tables.orders.find((x) => x.id === params.id)
  if (o) { o.remito_url = null; emitChange('orders', 'UPDATE', o) }
  return ok({ success: true })
})

// ── licitaciones: archivos ────────────────────────────────────────────────
route('POST', '/api/licitaciones/[id]/archivos', ({ params, body }) => {
  const f = fileFrom(body)
  if (!f) return fail(400, 'No se proporcionó archivo')
  const tipo = (body instanceof FormData ? (body.get('tipo') as string) : body?.tipo) || 'General'
  addDoc({ nombre: f.name, tipo, tamano: f.size, url: f.url, licitacion_id: params.id })
  return ok({ success: true, data: { url: f.url, fileName: f.name } })
})
route('DELETE', '/api/licitaciones/[id]/archivos', ({ query }) => {
  const i = tables.documents.findIndex((d) => d.id === query.get('documentId'))
  if (i >= 0) tables.documents.splice(i, 1)
  return ok({ success: true })
})

// ── tareas logística: comentarios ─────────────────────────────────────────
route('POST', '/api/tareas/[id]/comentario', ({ params, body }) => {
  const u = currentUser()
  const t = tables.tareas_logistica.find((x) => x.id === params.id)
  const content = (body instanceof FormData ? (body.get('content') as string) : body?.content) || ''
  const files = body instanceof FormData ? (body.getAll('file') as File[]).filter((f) => typeof f !== 'string') : []
  if (!content.trim() && files.length === 0) return fail(400, 'Comentario vacío')
  const attachments = files.map((f) => ({ id: newId('att'), name: f.name, url: URL.createObjectURL(f), size: fileSizeLabel(f.size) }))
  const row: Row = {
    id: newId('cm'), user_id: u.id, user_name: u.name, user_role: u.role_id, action: 'comment', entity: 'tarea', entity_id: params.id,
    entity_name: t?.titulo || t?.tln, description: content.trim(), metadata: { estado: t?.estado, attachments }, ip_address: null, user_agent: null, created_at: now(),
  }
  tables.audit_logs.unshift(row)
  emitChange('audit_logs', 'INSERT', row)
  return ok({ success: true, comment: { id: row.id, description: row.description, created_at: row.created_at, user_name: u.name, user_role: '', metadata: row.metadata } })
})
route('DELETE', '/api/tareas/[id]/comentario', ({ query }) => {
  const commentId = query.get('commentId')
  const row = tables.audit_logs.find((l) => l.id === commentId)
  if (!row) return fail(404, 'Comentario no encontrado')
  if (query.get('deleteComment') === 'true') {
    tables.audit_logs.splice(tables.audit_logs.indexOf(row), 1)
  } else {
    const attId = query.get('attachmentId')
    row.metadata = { ...row.metadata, attachments: (row.metadata?.attachments || []).filter((a: any) => a.id !== attId) }
  }
  emitChange('audit_logs', 'DELETE', row)
  return ok({ success: true })
})

// ── stock ─────────────────────────────────────────────────────────────────
route('GET', '/api/stock/materiales', () => ok({ data: S.materiales.map((m) => ({ ...m })) }))
route('POST', '/api/stock/materiales', ({ body }) => {
  if (!body?.nombre) return fail(400, 'El nombre es requerido', { code: 'VALIDATION' })
  if (S.materiales.some((m) => m.nombre.toLowerCase() === String(body.nombre).toLowerCase())) return fail(400, 'Ya existe un material con ese nombre', { code: 'DUPLICATE' })
  const m = { id: newId('mat'), codigo: null, nombre: body.nombre, unidadMedida: body.unidadMedida || null, cantidad: 0, descripcion: body.descripcion || null, proveedorId: body.proveedorId || null, imputacionId: null, createdAt: now(), updatedAt: now() }
  S.materiales.unshift(m)
  return ok({ data: m }, 201)
})
route('PUT', '/api/stock/materiales/[id]', ({ params, body }) => {
  const m = S.materiales.find((x) => x.id === params.id)
  if (!m) return fail(404, 'Material no encontrado')
  Object.assign(m, body, { updatedAt: now() })
  return ok({ data: m })
})
route('DELETE', '/api/stock/materiales/[id]', ({ params }) => {
  const i = S.materiales.findIndex((x) => x.id === params.id)
  if (i < 0) return fail(404, 'Material no encontrado')
  S.materiales.splice(i, 1)
  return ok({ success: true })
})
route('GET', '/api/stock/proveedores', () => ok({ data: S.proveedores.map((p) => ({ ...p })) }))
route('POST', '/api/stock/proveedores', ({ body }) => {
  if (!body?.nombre) return fail(400, 'El nombre es requerido')
  const p = { id: newId('prov'), nombre: body.nombre, cuit: body.cuit || null, contacto: body.contacto || null, email: body.email || null, telefono: body.telefono || null, createdAt: now(), updatedAt: now() }
  S.proveedores.unshift(p)
  return ok({ data: p }, 201)
})
route('DELETE', '/api/stock/proveedores/[id]', ({ params }) => {
  const i = S.proveedores.findIndex((x) => x.id === params.id)
  if (i < 0) return fail(404, 'Proveedor no encontrado')
  if (S.compras.some((c) => c.proveedorId === params.id)) return fail(400, 'No se puede eliminar un proveedor con compras')
  S.proveedores.splice(i, 1)
  return ok({ success: true })
})
route('GET', '/api/stock/compras', () =>
  ok({
    data: S.compras
      .map((c) => ({
        ...c,
        proveedor: S.proveedores.find((p) => p.id === c.proveedorId) || null,
        detalles: (c.detalles || []).map((d: Row) => ({ ...d, material: S.materiales.find((m) => m.id === d.materialId) || null })),
      }))
      .sort((a: any, b: any) => String(b.fecha).localeCompare(String(a.fecha))),
  }))
route('POST', '/api/stock/compras', ({ body }) => {
  const c = { id: newId('compra'), fecha: body?.fecha || now(), proveedorId: body?.proveedorId || null, observaciones: body?.observaciones || '', detalles: body?.detalles || [], createdAt: now(), updatedAt: now() }
  S.compras.unshift(c)
  return ok({ data: c }, 201)
})
route('GET', '/api/stock/movimientos', ({ query }) => {
  const limit = parseInt(query.get('limit') || '50', 10)
  const data = S.movimientos
    .filter((m) => (!query.get('materialId') || m.materialId === query.get('materialId')) && (!query.get('imputacionId') || m.imputacionId === query.get('imputacionId')) && (!query.get('tipoMovimiento') || m.tipoMovimiento === query.get('tipoMovimiento')))
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
    .slice(0, limit)
    .map((m) => {
      const imp = S.imputaciones.find((i) => i.id === m.imputacionId)
      return { ...m, material: S.materiales.find((x) => x.id === m.materialId) || { nombre: '—' }, imputacion: { codigo: imp?.codigo || '—', obra: imp ? { nombre: obraDeImp(imp)?.nombre } : undefined } }
    })
  return ok({ data })
})
const reporteDeObra = (obra: Row) => ({
  obraId: obra.id,
  obraNombre: obra.nombre,
  imputaciones: S.imputaciones.filter((i) => i.obraId === obra.id).map((imp) => ({
    imputacionId: imp.id, codigo: imp.codigo, descripcion: imp.descripcion,
    materiales: S.stocks.filter((s) => s.imputacionId === imp.id).map((s) => ({ materialId: s.materialId, materialNombre: S.materiales.find((m) => m.id === s.materialId)?.nombre || '—', cantidadActual: s.cantidadActual })),
  })),
})
route('GET', '/api/stock/reportes', () => ok({ data: tables.obras.map(reporteDeObra).filter((o) => o.imputaciones.length > 0).sort((a, b) => a.obraNombre.localeCompare(b.obraNombre)) }))
route('GET', '/api/stock/reportes/obra/[id]', ({ params }) => {
  const o = tables.obras.find((x) => x.id === params.id)
  return o ? ok({ data: reporteDeObra(o) }) : fail(404, 'Obra no encontrada')
})
route('GET', '/api/stock/reportes/imputacion/[id]', ({ params }) => {
  const imp = S.imputaciones.find((x) => x.id === params.id)
  if (!imp) return fail(404, 'Imputación no encontrada')
  return ok({ data: { ...imp, stocks: S.stocks.filter((s) => s.imputacionId === imp.id).map((s) => ({ ...s, material: S.materiales.find((m) => m.id === s.materialId) })) } })
})
route('GET', '/api/stock/obras/[id]/imputaciones', ({ params }) =>
  ok({ data: S.imputaciones.filter((i) => i.obraId === params.id).map((imp) => ({ ...imp, obra: obraDeImp(imp), stocks: S.stocks.filter((s) => s.imputacionId === imp.id).map((s) => ({ ...s, material: S.materiales.find((m) => m.id === s.materialId) })) })) }))
route('POST', '/api/stock/obras/[id]/imputaciones', ({ params, body }) => {
  const imp = { id: newId('imp'), obraId: params.id, codigo: body?.codigo, descripcion: body?.descripcion || null, createdAt: now(), updatedAt: now() }
  S.imputaciones.push(imp)
  return ok({ data: imp }, 201)
})

const resolveOp = (body: any) => {
  const imp = findBy(S.imputaciones, body?.id_imputacion ?? body?.imputacionId, ['id', 'codigo'])
  const mat = findBy(S.materiales, body?.id_material ?? body?.materialId, ['id', 'codigo', 'nombre'])
  return { imp, mat }
}
route('POST', '/api/stock/operaciones/entrada', ({ body }) => {
  const { imp, mat } = resolveOp(body)
  if (!imp) return fail(404, 'Imputación no encontrada. Probá con un código como ' + S.imputaciones[0].codigo, { code: 'IMPUTACION_NOT_FOUND' })
  if (!mat) return fail(404, 'Material no encontrado. Probá con un ID como ' + S.materiales[0].id, { code: 'MATERIAL_NOT_FOUND' })
  const q = num(body.cantidad)
  if (!(q > 0)) return fail(400, 'La cantidad debe ser positiva', { code: 'VALIDATION' })
  const st = getStock(imp.id, mat.id)
  st.cantidadActual += q
  registrarMovimiento(imp.id, mat.id, 'Entrada', q, body.usuario, body.observaciones)
  recalcMaterial(mat.id)
  return ok({ data: { cantidadActual: st.cantidadActual } }, 201)
})
route('POST', '/api/stock/operaciones/salida', ({ body }) => {
  const { imp, mat } = resolveOp(body)
  if (!imp) return fail(404, 'Imputación no encontrada. Probá con un código como ' + S.imputaciones[0].codigo, { code: 'IMPUTACION_NOT_FOUND' })
  if (!mat) return fail(404, 'Material no encontrado. Probá con un ID como ' + S.materiales[0].id, { code: 'MATERIAL_NOT_FOUND' })
  const q = num(body.cantidad)
  const st = getStock(imp.id, mat.id)
  if (!(q > 0)) return fail(400, 'La cantidad debe ser positiva', { code: 'VALIDATION' })
  if (q > st.cantidadActual && !body.forzarSalida) return fail(400, `Stock insuficiente: disponible ${st.cantidadActual}`, { code: 'STOCK_INSUFICIENTE' })
  st.cantidadActual = Math.max(0, st.cantidadActual - q)
  registrarMovimiento(imp.id, mat.id, 'Salida', q, body.usuario, body.observaciones)
  recalcMaterial(mat.id)
  return ok({ data: { cantidadActual: st.cantidadActual } }, 201)
})
route('POST', '/api/stock/operaciones/ajuste', ({ body }) => {
  const { imp, mat } = resolveOp(body)
  if (!imp || !mat) return fail(404, 'Imputación o material no encontrados', { code: 'NOT_FOUND' })
  const st = getStock(imp.id, mat.id)
  const nueva = num(body.nueva_cantidad ?? body.nuevaCantidad)
  const diff = nueva - st.cantidadActual
  st.cantidadActual = nueva
  registrarMovimiento(imp.id, mat.id, 'Ajuste', Math.abs(diff), body.usuario, body.motivo)
  recalcMaterial(mat.id)
  return ok({ data: { cantidadActual: st.cantidadActual } }, 201)
})
route('POST', '/api/stock/operaciones/traslado', ({ body }) => {
  const from = findBy(S.imputaciones, body?.fromImputacionId ?? body?.id_imputacion_origen, ['id', 'codigo'])
  const to = findBy(S.imputaciones, body?.toImputacionId ?? body?.id_imputacion_destino, ['id', 'codigo'])
  const mat = findBy(S.materiales, body?.materialId ?? body?.id_material, ['id', 'codigo', 'nombre'])
  if (!from || !to || !mat) return fail(404, 'Datos de traslado inválidos', { code: 'NOT_FOUND' })
  const q = num(body.cantidad)
  const a = getStock(from.id, mat.id)
  if (q > a.cantidadActual) return fail(400, `Stock insuficiente en origen: ${a.cantidadActual}`, { code: 'STOCK_INSUFICIENTE' })
  a.cantidadActual -= q
  getStock(to.id, mat.id).cantidadActual += q
  registrarMovimiento(from.id, mat.id, 'Salida', q, body.usuario, `Traslado a ${to.codigo}`)
  registrarMovimiento(to.id, mat.id, 'Entrada', q, body.usuario, `Traslado desde ${from.codigo}`)
  return ok({ data: { ok: true } }, 201)
})

// ── despacho ──────────────────────────────────────────────────────────────
export const MOCK_API_HOSTS = ['mock-storage.nexora.demo']

export const handleApi = async (method: string, rawUrl: string, body: any): Promise<ApiRes | null> => {
  const url = new URL(rawUrl, typeof window !== 'undefined' ? window.location.origin : 'http://localhost')
  const m = method.toUpperCase()

  // Subida directa simulada (PUT al "bucket")
  if (MOCK_API_HOSTS.includes(url.hostname)) {
    if (m === 'PUT') {
      const publicUrl = url.toString().replace('/upload/', '/files/')
      if (body instanceof Blob) blobByPublicUrl.set(publicUrl, URL.createObjectURL(body))
      return ok({ success: true })
    }
    return ok({ success: true })
  }

  if (!url.pathname.startsWith('/api/')) return null
  let parsed = body
  if (typeof body === 'string') { try { parsed = JSON.parse(body) } catch { parsed = {} } }
  for (const r of routes) {
    if (r.m !== m) continue
    const match = r.re.exec(url.pathname)
    if (!match) continue
    const params: Record<string, string> = {}
    r.keys.forEach((k, i) => { params[k] = decodeURIComponent(match[i + 1]) })
    try {
      return await r.h({ params, query: url.searchParams, body: parsed ?? {}, method: m })
    } catch (e: any) {
      console.error('[mock-api]', m, url.pathname, e)
      return fail(500, e?.message || 'Error interno simulado')
    }
  }
  return fail(404, `Endpoint simulado no encontrado: ${m} ${url.pathname}`)
}

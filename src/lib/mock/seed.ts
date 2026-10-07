// Datos de demostración de NEXORA (100% en memoria, sin backend ni base de datos).
// Las fechas son relativas a "hoy" para que el tablero siempre se vea vivo.

export type Row = Record<string, any>
export type Tables = Record<string, Row[]>

const DAY = 86400000
const iso = (offsetDays = 0, h = 10, m = 0) => {
  const d = new Date(Date.now() + offsetDays * DAY)
  d.setHours(h, m, 0, 0)
  return d.toISOString()
}
const dateOnly = (offsetDays = 0) => iso(offsetDays).slice(0, 10)

let n = 0
const NOMBRES = ['Ana','Luis','Marta','Pablo','Lucía','Hernán','Paula','Gastón','Noelia','Sebastián','Florencia','Matías','Carolina','Federico','Daniela','Maximiliano','Brenda','Leandro','Micaela','Cristian','Eugenia','Ariel','Soledad','Damián','Romina','Rodrigo','Celeste','Ignacio','Antonella','Walter']
const APELLIDOS = ['López','Martínez','Pérez','González','Rodríguez','Sánchez','Ruiz','Flores','Benavídez','Quiroga','Aguirre','Giménez','Ponce','Moyano','Bustos','Cabrera','Villarreal','Maldonado','Funes','Ferreyra','Arce','Britos','Carrizo','Heredia','Montenegro','Olivera','Paredes','Salas','Tapia','Vera']
const sinAc = (t: string) => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
const pickAt = <T,>(arr: T[], i: number): T => arr[i % arr.length]
const id = (p: string) => `${p}_${String(++n).padStart(3, '0')}`

// ───────────────────────── Roles ─────────────────────────
export const DEMO_PASSWORD_HINT = 'cualquier contraseña'

const roles: Row[] = [
  { id: 'role_admin', name: 'Administrador', description: 'Acceso total al sistema', permissions: ['*'], user_count: 0 },
  { id: 'role_compras', name: 'Compras', description: 'Gestiona cotizaciones y órdenes de compra', permissions: ['orders:read', 'orders:derive', 'licitaciones:read'], user_count: 0 },
  { id: 'role_logistica', name: 'Logística', description: 'Gestiona entregas, tareas y vehículos', permissions: ['orders:read', 'logistica:*', 'stock:*'], user_count: 0 },
  { id: 'role_presupuestos', name: 'Presupuestos', description: 'Evalúa presupuestos de licitaciones', permissions: ['licitaciones:*'], user_count: 0 },
  { id: 'role_usuario', name: 'Usuario', description: 'Solicita pedidos y consulta su estado', permissions: ['orders:create', 'orders:read'], user_count: 0 },
].map((r, i) => ({ ...r, created_at: iso(-200 + i), updated_at: iso(-30) }))

// ───────────────────────── Usuarios ─────────────────────────
const userSeed: Array<[string, string, string, string, string, string]> = [
  ['user_1', 'Santiago López', 'admin@nexora.demo', 'role_admin', 'Área de Sistemas', 'Gerente de Sistemas'],
  ['user_2', 'Carolina Méndez', 'compras@nexora.demo', 'role_compras', 'Compras', 'Jefa de Compras'],
  ['user_3', 'Ricardo Funes', 'logistica@nexora.demo', 'role_logistica', 'Logística', 'Coordinador de Logística'],
  ['user_4', 'Marcela Ortiz', 'presupuestos@nexora.demo', 'role_presupuestos', 'Presupuestos', 'Analista de Presupuestos'],
  ['user_5', 'Federico Aguirre', 'faguirre@nexora.demo', 'role_usuario', 'Área Civil', 'Jefe de Obra'],
  ['user_6', 'Lucía Paredes', 'lparedes@nexora.demo', 'role_usuario', 'Área Eléctrica', 'Ingeniera Electricista'],
  ['user_7', 'Matías Romero', 'mromero@nexora.demo', 'role_usuario', 'Área Civil', 'Capataz'],
  ['user_8', 'Andrea Villalba', 'avillalba@nexora.demo', 'role_usuario', 'Área Mecánica', 'Supervisora'],
  ['user_9', 'Diego Salinas', 'dsalinas@nexora.demo', 'role_logistica', 'Logística', 'Chofer / Operador'],
  ['user_10', 'Paula Giménez', 'pgimenez@nexora.demo', 'role_compras', 'Compras', 'Asistente de Compras'],
]
const AREAS: Array<[string, string, string]> = [
  ['role_usuario', 'Área Civil', 'Jefe de Obra'], ['role_usuario', 'Área Eléctrica', 'Ingeniero Electricista'], ['role_usuario', 'Área Mecánica', 'Supervisor'],
  ['role_logistica', 'Logística', 'Operador de Logística'], ['role_compras', 'Compras', 'Analista de Compras'], ['role_usuario', 'Área Civil', 'Capataz'],
  ['role_presupuestos', 'Presupuestos', 'Analista de Presupuestos'], ['role_usuario', 'Seguridad e Higiene', 'Técnico en Seguridad'],
]
for (let i = 11; i <= 50; i++) {
  const nm = `${NOMBRES[i % NOMBRES.length]} ${APELLIDOS[(i * 7) % APELLIDOS.length]}`
  const [rol, area, pos] = AREAS[i % AREAS.length]
  userSeed.push([`user_${i}`, nm, `${sinAc(nm).replace(/ /g, '.')}${i}@nexora.demo`, rol, area, pos])
}
const initials = (name: string) => name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
const users: Row[] = userSeed.map(([uid, name, email, role_id, area, position], i) => ({
  id: uid, name, email, role_id, area, avatar: initials(name), phone: `+54 351 555-${1000 + i}`,
  position, status: 'Activo', last_login: iso(-i), created_at: iso(-180 + i), updated_at: iso(-i),
}))
roles.forEach((r) => { r.user_count = users.filter((u) => u.role_id === r.id).length })

// ───────────────────────── Obras ─────────────────────────
const obraSeed: Array<[string, string, string, number, number, string, number, number]> = [
  ['obra_1', 'Planta Industrial Norte', '031.001.018', 185000000, 92500000, 'Activa', -150, 120],
  ['obra_2', 'Ampliación Depósito Central', '031.002.004', 64000000, 41200000, 'Activa', -90, 60],
  ['obra_3', 'Subestación Eléctrica 33kV', '102.001.007', 98000000, 30100000, 'Activa', -60, 150],
  ['obra_4', 'Red de Agua Contra Incendios', '045.003.011', 27500000, 27100000, 'Activa', -200, 15],
  ['obra_5', 'Oficinas Administrativas', '031.004.002', 41000000, 40800000, 'Finalizada', -320, -20],
  ['obra_6', 'Playa de Maniobras Sur', '031.005.009', 52000000, 6400000, 'Activa', -25, 210],
]
const OBRA_TIPOS = ['Planta de Tratamiento', 'Galpón Logístico', 'Estación Transformadora', 'Edificio Corporativo', 'Red Cloacal', 'Camino de Acceso', 'Taller Mecánico', 'Depósito de Insumos', 'Sala de Bombas', 'Torre de Enfriamiento']
const OBRA_LUG = ['Sur', 'Norte', 'Este', 'Oeste', 'Central', 'Río Cuarto', 'Villa María', 'San Francisco']
for (let i = 7; i <= 30; i++) {
  const est = 15000000 + ((i * 7919) % 90) * 1000000
  const fin = i % 6 === 0
  obraSeed.push([`obra_${i}`, `${OBRA_TIPOS[i % OBRA_TIPOS.length]} ${OBRA_LUG[(i * 3) % OBRA_LUG.length]}`, `${String(30 + (i % 9)).padStart(3, '0')}.${String(i % 8 + 1).padStart(3, '0')}.${String(i * 3 % 30 + 1).padStart(3, '0')}`, est, Math.round(est * (fin ? 0.97 : 0.1 + ((i * 13) % 70) / 100)), fin ? 'Finalizada' : 'Activa', -(30 + (i * 17) % 280), fin ? -15 : 30 + (i * 11) % 240])
}
const obras: Row[] = obraSeed.map(([oid, nombre, imputacion, est, gast, estado, ini, fin], i) => ({
  id: oid, nombre, imputacion, monto_estimado: est, monto_mano_obra_finalizada: Math.round(gast * 0.18), monto_gastado: gast,
  descripcion: `Obra civil e industrial: ${nombre}.`, estado, activa: estado === 'Activa',
  fecha_inicio: dateOnly(ini), fecha_fin_estimada: dateOnly(fin), responsable_id: users[4 + (i % 4)].id,
  imagen_url: null, created_at: iso(ini), updated_at: iso(-i),
}))

const obra_montos: Row[] = []
obras.forEach((o, i) => {
  const parts = [0.35, 0.3, 0.2]
  parts.forEach((p, k) => {
    obra_montos.push({ id: id('om'), obra_id: o.id, monto: Math.round(o.monto_gastado * p), nota: ['Anticipo', 'Certificado de avance', 'Materiales'][k], usuario_id: 'user_1', created_at: iso(-120 + k * 30 - i) })
  })
})

// ───────────────────────── Pedidos (orders) ─────────────────────────
type OrderSeed = [string, string, string, string, string, string, string, number, number | null, string]
// [obra_id, solicitante, prioridad, current_area, estado_detallado, area_solicitud, detalle, creada(dias), monto, lugar]
const orderSeed: OrderSeed[] = [
  ['obra_1', 'user_5', 'Alta', 'solicitados', 'Pendiente', 'Área Civil', 'Cemento Portland x 200 bolsas, hierro del 12 x 150 barras, arena fina 15 m3', -2, 4800000, 'Obrador Planta Norte'],
  ['obra_1', 'user_7', 'Media', 'solicitados', 'Listo para Compras', 'Área Civil', 'Alambre de atar 50 kg, clavos 2" 30 kg, tirantes de pino 3x3 x 40', -3, 1250000, 'Obrador Planta Norte'],
  ['obra_2', 'user_5', 'Baja', 'solicitados', 'Pendiente', 'Área Civil', 'Pintura epoxi gris 20 lts x 12, rodillos y pinceles', -1, 890000, 'Depósito Central'],
  ['obra_3', 'user_6', 'Alta', 'compras', 'Cotizando Proveedores', 'Área Eléctrica', 'Cable XLPE 3x240mm2 x 300 m, terminales 33kV x 6, seccionadores x 3', -8, 38500000, 'Subestación'],
  ['obra_3', 'user_6', 'Media', 'compras', 'Orden de Compra Emitida', 'Área Eléctrica', 'Bandejas portacables 300mm x 80 tramos, soportes y accesorios', -12, 5200000, 'Subestación'],
  ['obra_2', 'user_7', 'Media', 'compras', 'Cotizando Proveedores', 'Área Civil', 'Chapas trapezoidales calibre 25 x 120 m2, tornillos autoperforantes x 2000', -9, 6700000, 'Depósito Central'],
  ['obra_4', 'user_8', 'Alta', 'compras', 'Esperando Aprobación', 'Área Mecánica', 'Cañería HF 6" x 60 m, válvulas esclusa 6" x 8, bridas y juntas', -10, 12400000, 'Planta Norte - Sector C'],
  ['obra_1', 'user_5', 'Alta', 'logistica', 'Preparando Envío', 'Área Civil', 'Hormigón elaborado H30 x 45 m3, aditivo plastificante x 20 lts', -15, 9900000, 'Obrador Planta Norte'],
  ['obra_4', 'user_8', 'Media', 'logistica', 'En Tránsito', 'Área Mecánica', 'Rociadores K5.6 x 120, soportes de cañería x 200', -18, 7300000, 'Planta Norte - Sector C'],
  ['obra_6', 'user_7', 'Baja', 'logistica', 'Preparando Envío', 'Área Civil', 'Piedra partida 6-19 x 80 m3, geotextil x 600 m2', -14, 4100000, 'Playa Sur'],
  ['obra_5', 'user_5', 'Media', 'finalizado', 'Entregado Completo', 'Área Civil', 'Cerámicos 60x60 x 220 m2, pastina y adhesivo', -60, 3300000, 'Oficinas Administrativas'],
  ['obra_3', 'user_6', 'Alta', 'finalizado', 'Entregado Completo', 'Área Eléctrica', 'Transformador de corriente x 6, relés de protección x 4', -45, 21800000, 'Subestación'],
  ['obra_2', 'user_7', 'Media', 'finalizado', 'Entregado Completo', 'Área Civil', 'Portones corredizos industriales x 2, motores x 2', -38, 8600000, 'Depósito Central'],
  ['obra_4', 'user_8', 'Baja', 'finalizado', 'Entregado Parcial', 'Área Mecánica', 'Bomba jockey 5HP x 1, tablero de control x 1', -30, 5400000, 'Planta Norte - Sector C'],
  ['obra_1', 'user_7', 'Media', 'finalizado', 'Entregado Completo', 'Área Civil', 'Andamios tubulares x 40 cuerpos, plataformas x 80', -52, 2900000, 'Obrador Planta Norte'],
  ['obra_6', 'user_5', 'Alta', 'solicitados', 'Listo para Compras', 'Área Civil', 'Alcantarillas de H°A° 800mm x 12 unidades, cabezales', -4, 7800000, 'Playa Sur'],
]
const AREA_DET: Record<string, string[]> = {
  solicitados: ['Pendiente', 'Listo para Compras'],
  compras: ['Cotizando Proveedores', 'Orden de Compra Emitida', 'Esperando Aprobación'],
  logistica: ['Preparando Envío', 'En Tránsito'],
  finalizado: ['Entregado Completo', 'Entregado Completo', 'Entregado Parcial'],
}
const AREA_CYCLE = ['solicitados', 'compras', 'logistica', 'finalizado', 'compras', 'finalizado', 'logistica', 'solicitados']
const MATERIALES_TXT = ['Cemento Portland x 150 bolsas, arena x 10 m3', 'Cable unipolar 4mm x 500 m, fichas y borneras', 'Cañería PVC 110 x 80 m, codos y uniones', 'Chapas galvanizadas calibre 25 x 90 m2', 'Hierro del 10 x 200 barras, alambre de atar', 'Pintura látex exterior 20 lts x 15, rodillos', 'Tableros eléctricos de distribución x 4', 'Bomba centrífuga 7.5HP x 2, válvulas de retención', 'Luminarias LED industriales x 60, bandejas', 'Ladrillos huecos 18x18x33 x 4000, adhesivo', 'Elementos de protección personal: cascos, guantes, calzado', 'Mallas sima x 120 m2, separadores plásticos']
const LUGARES = ['Obrador', 'Depósito Central', 'Sector C', 'Playa Sur', 'Planta Norte', 'Subestación']
const SOLICITANTES = ['user_5', 'user_6', 'user_7', 'user_8', 'user_11', 'user_12', 'user_13', 'user_14', 'user_16', 'user_18']
for (let i = 16; i < 80; i++) {
  const area = pickAt(AREA_CYCLE, i * 3)
  const det = pickAt(AREA_DET[area], i)
  const obraN = 1 + ((i * 5) % 30)
  orderSeed.push([`obra_${obraN}`, pickAt(SOLICITANTES, i), pickAt(['Alta', 'Media', 'Baja', 'Media'], i), area, det, pickAt(['Área Civil', 'Área Eléctrica', 'Área Mecánica'], i), pickAt(MATERIALES_TXT, i * 7), -(1 + ((i * 11) % 70)), 600000 + ((i * 7919) % 400) * 50000, pickAt(LUGARES, i)])
}
const estadoOf = (area: string) => (area === 'solicitados' ? 'Pendiente' : area === 'finalizado' ? 'Finalizado' : 'En Curso')
const orders: Row[] = orderSeed.map(([obra_id, sol, prio, area, det, areaSol, detalle, creada, monto, lugar], i) => {
  const o = obras.find((x) => x.id === obra_id)!
  const finalizado = area === 'finalizado'
  return {
    id: `order_${i + 1}`,
    rqi: `RQI-${new Date().getFullYear()}-${String(i + 1).padStart(3, '0')}`,
    obra: o.nombre, obra_id, solicitante_id: sol,
    fecha_creacion: iso(creada), fecha_necesidad: iso(creada + 10 + (i % 6)),
    fecha_entrega: finalizado ? iso(creada + 12) : null, fecha_finalizacion: finalizado ? iso(creada + 12) : null,
    estado: estadoOf(area), estado_detallado: det, prioridad: prio, area_solicitud: areaSol,
    remito: finalizado ? `R-0001-${String(4200 + i)}` : null, remito_url: null,
    lugar_entrega: lugar, detalle_materiales: detalle,
    obra_proyecto1: o.imputacion, obra_proyecto2: null,
    obra_proyectos: [{ obraId: obra_id, obra: o.nombre, imputacion: o.imputacion, subrubro: 'Materiales' }],
    responsable_id: area === 'solicitados' ? null : area === 'logistica' ? 'user_3' : area === 'finalizado' ? 'user_3' : 'user_2',
    current_area: area, monto_estimado: monto, monto_oc: area === 'compras' && det === 'Orden de Compra Emitida' ? monto : finalizado || area === 'logistica' ? monto : null,
    montos_oc: finalizado || area === 'logistica' ? [monto] : [],
    tipo_entrega: i % 3 === 0 ? 'Retirar' : 'Recibir',
    estado_entrega: finalizado ? (det === 'Entregado Parcial' ? 'Parcial' : 'Completo') : 'Pendiente',
    notas_entrega: null, created_at: iso(creada), updated_at: iso(creada + 1),
  }
})

const order_histories: Row[] = []
const comments: Row[] = []
const documents: Row[] = []
const entregas_parciales: Row[] = []
orders.forEach((o, i) => {
  order_histories.push({ id: id('oh'), order_id: o.id, fecha: o.fecha_creacion, usuario_id: o.solicitante_id, accion: `Pedido ${o.rqi} creado`, tipo: 'creacion', created_at: o.fecha_creacion })
  if (o.current_area !== 'solicitados') {
    order_histories.push({ id: id('oh'), order_id: o.id, fecha: iso(-20 + i), usuario_id: 'user_2', accion: 'Pedido derivado de Solicitados a Compras', tipo: 'derivacion', created_at: iso(-20 + i) })
  }
  if (o.current_area === 'logistica' || o.current_area === 'finalizado') {
    order_histories.push({ id: id('oh'), order_id: o.id, fecha: iso(-14 + i % 5), usuario_id: 'user_2', accion: 'Orden de compra emitida y derivado a Logística', tipo: 'orden_compra', created_at: iso(-14 + i % 5) })
  }
  if (o.current_area === 'finalizado') {
    order_histories.push({ id: id('oh'), order_id: o.id, fecha: o.fecha_finalizacion, usuario_id: 'user_3', accion: `Entrega finalizada. Remito ${o.remito}`, tipo: 'finalizacion', created_at: o.fecha_finalizacion })
  }
  if (i % 2 === 0) {
    comments.push({ id: id('c'), content: ['Necesitamos confirmar el proveedor antes del viernes.', '@Carolina podés priorizar este pedido? Hay una entrega comprometida.', 'Cotización recibida, adjunto en documentos.', 'Se coordinó la entrega con el obrador.'][i % 4], user_id: i % 4 === 0 ? o.solicitante_id : 'user_2', order_id: o.id, created_at: iso(-6 + (i % 4)), updated_at: iso(-6 + (i % 4)) })
  }
  documents.push({ id: id('d'), nombre: `Solicitud_${o.rqi}.pdf`, tipo: 'Solicitud Inicial', fecha: o.fecha_creacion, tamano: '0.42 MB', url: '#', order_id: o.id, licitacion_id: null, created_at: o.fecha_creacion, updated_at: o.fecha_creacion })
  if (o.current_area !== 'solicitados') {
    documents.push({ id: id('d'), nombre: `Cotizacion_${o.rqi}.pdf`, tipo: 'Cotización', fecha: iso(-10 + i % 4), tamano: '0.88 MB', url: '#', order_id: o.id, licitacion_id: null, created_at: iso(-10 + i % 4), updated_at: iso(-10 + i % 4) })
  }
})
entregas_parciales.push({ id: id('ep'), order_id: 'order_14', remito: 'R-0001-4213', fecha_entrega: iso(-28), detalle_entregado: 'Bomba jockey 5HP', observaciones: 'Falta tablero de control', usuario_id: 'user_3', created_at: iso(-28) })

// ───────────────────────── Licitaciones ─────────────────────────
const licSeed: Array<[string, string, string, number, string, string, string, string, string]> = [
  ['Constructora Del Sur SA', 'Planta Industrial Norte', 'Movimiento de suelos y fundaciones', 45000000, 'Alta', 'solicitud', 'Abierta', 'Pendiente de Revisión', 'Área Civil'],
  ['Electro Andina SRL', 'Subestación Eléctrica 33kV', 'Montaje electromecánico completo', 72000000, 'Alta', 'compras', 'En Evaluación', 'Solicitando Cotizaciones', 'Área Eléctrica'],
  ['HidroPlan SA', 'Red de Agua Contra Incendios', 'Provisión e instalación de cañerías', 18500000, 'Media', 'presupuestos', 'En Evaluación', 'Evaluando Propuestas', 'Área Mecánica'],
  ['Estructuras Metálicas Cuyo', 'Ampliación Depósito Central', 'Estructura metálica y cubierta', 31000000, 'Media', 'presupuestos', 'En Evaluación', 'Comparativa de Precios', 'Área Civil'],
  ['Vialidad Norte SRL', 'Playa de Maniobras Sur', 'Base granular y carpeta asfáltica', 27600000, 'Baja', 'compras', 'Abierta', 'Solicitando Cotizaciones', 'Área Civil'],
  ['Terminaciones Cba SA', 'Oficinas Administrativas', 'Terminaciones y carpinterías', 9800000, 'Baja', 'finalizado', 'Finalizada', 'Adjudicada', 'Área Civil'],
  ['Instalaciones Pampa SRL', 'Planta Industrial Norte', 'Instalación sanitaria y gas', 14200000, 'Media', 'finalizado', 'Cerrada', 'Adjudicada', 'Área Mecánica'],
  ['Montajes del Centro', 'Subestación Eléctrica 33kV', 'Tendido de cable subterráneo', 23400000, 'Alta', 'solicitud', 'Abierta', 'Pendiente de Revisión', 'Área Eléctrica'],
]
const EMPRESAS = ['Constructora Andina SA', 'Ingeniería Cuyo SRL', 'Montajes Industriales SA', 'Servicios Viales del Centro', 'Eléctrica Pampeana', 'Hidráulica Serrana SRL', 'Metalúrgica Del Plata', 'Obras y Proyectos Cba', 'Tecnoinstalaciones SA', 'Grupo Cimiento']
const LIC_DET = ['Excavación y movimiento de suelos', 'Montaje de estructura metálica', 'Instalación eléctrica de baja tensión', 'Provisión de cañerías y accesorios', 'Hormigonado de plateas', 'Pavimentación de accesos', 'Instalación de aire acondicionado industrial', 'Cerramientos y carpinterías', 'Sistema de detección de incendios', 'Impermeabilización de cubiertas']
const LIC_FLOW: Array<[string, string, string]> = [['solicitud', 'Abierta', 'Pendiente de Revisión'], ['compras', 'En Evaluación', 'Solicitando Cotizaciones'], ['presupuestos', 'En Evaluación', 'Evaluando Propuestas'], ['presupuestos', 'En Evaluación', 'Comparativa de Precios'], ['finalizado', 'Finalizada', 'Adjudicada'], ['compras', 'Abierta', 'Solicitando Cotizaciones'], ['finalizado', 'Cerrada', 'Adjudicada']]
for (let i = 8; i < 40; i++) {
  const [proc, est, det] = pickAt(LIC_FLOW, i * 2)
  const ob = pickAt(obraSeed, i * 3)
  licSeed.push([pickAt(EMPRESAS, i), ob[1], pickAt(LIC_DET, i * 3), 8000000 + ((i * 7919) % 90) * 1000000, pickAt(['Alta', 'Media', 'Baja'], i), proc, est, det, pickAt(['Área Civil', 'Área Eléctrica', 'Área Mecánica'], i)])
}
const licitaciones: Row[] = licSeed.map(([empresa, obra, detalle, monto, prio, proc, estado, det, area], i) => ({
  id: `lic_${i + 1}`, opl: `OPL-${new Date().getFullYear()}-${String(i + 1).padStart(3, '0')}`, empresa, obra, fecha_creacion: iso(-40 + (i * 4) % 120),
  monto, prioridad: prio, lugar_entrega: obra, detalle_items: detalle, estado, estado_detallado: det, area_solicitud: area, current_process: proc,
  creador_id: pickAt(['user_5', 'user_6', 'user_8', 'user_7', 'user_5', 'user_5', 'user_8', 'user_6'], i), responsable_id: proc === 'solicitud' ? null : proc === 'presupuestos' ? 'user_4' : 'user_2',
  created_at: iso(-40 + (i * 4) % 120), updated_at: iso(-38 + (i * 4) % 120),
}))
const licitacion_histories: Row[] = []
licitaciones.forEach((l, i) => {
  licitacion_histories.push({ id: id('lh'), licitacion_id: l.id, fecha: l.fecha_creacion, usuario_id: l.creador_id, accion: `Licitación ${l.opl} creada`, tipo: 'creacion', created_at: l.fecha_creacion })
  if (l.current_process !== 'solicitud') licitacion_histories.push({ id: id('lh'), licitacion_id: l.id, fecha: iso(-25 + i), usuario_id: 'user_2', accion: 'Derivada a Compras', tipo: 'derivacion', created_at: iso(-25 + i) })
  documents.push({ id: id('d'), nombre: `Pliego_${l.opl}.pdf`, tipo: 'Pliego', fecha: l.fecha_creacion, tamano: '1.20 MB', url: '#', order_id: null, licitacion_id: l.id, created_at: l.fecha_creacion, updated_at: l.fecha_creacion })
  if (i % 2 === 1) comments.push({ id: id('c'), content: 'Se recibieron tres propuestas, falta la comparativa técnica.', user_id: 'user_4', order_id: null, licitacion_id: l.id, created_at: iso(-8 + i), updated_at: iso(-8 + i) })
})

// ───────────────────────── Logística ─────────────────────────
const vehiculos = ['SAVEIRO OOQ334', 'KANGOO AF873XB', 'KANGOO AF873WW', 'KANGOO AE255GY', 'OROCH AC698OV', 'ALASKAN AE889PT', 'MASTER AE255GZ']
const tareaSeed: Array<[string, string, string, string, string, string, number, number | null]> = [
  // titulo, descripcion, tipo, prioridad, estado, vehiculo, fecha(dias), fechaLimite(dias)
  ['Retiro de cemento en Corralón Norte', 'Retirar 200 bolsas de cemento ya abonadas', 'Tarea', 'Alta', 'solicitud', vehiculos[6], 1, 1],
  ['Traslado de andamios', 'Mover 20 cuerpos de andamio de Planta Norte a Depósito Central', 'Tarea', 'Media', 'solicitud', vehiculos[4], 2, 2],
  ['Consulta disponibilidad de grúa', 'Consultar con proveedor disponibilidad de grúa 25tn para el jueves', 'Consulta', 'Media', 'solicitud', '', 1, 3],
  ['Entrega de cables en Subestación', 'Coordinar descarga de bobinas con el contratista', 'Urgente', 'Alta', 'en_curso', vehiculos[5], 0, 0],
  ['Traslado de rociadores', 'Llevar rociadores a Sector C', 'Tarea', 'Media', 'en_curso', vehiculos[1], 0, 1],
  ['Mantenimiento Kangoo AF873WW', 'Llevar al taller para service de 40.000 km', 'Tarea', 'Baja', 'programada', vehiculos[2], 4, 4],
  ['Compra de insumos de seguridad', 'EPP: cascos, guantes y calzado', 'Tarea', 'Media', 'programada', vehiculos[0], 3, 3],
  ['Retiro de chapas en Metalúrgica Cuyo', 'Chapas trapezoidales x 120 m2', 'Tarea', 'Alta', 'finalizado', vehiculos[6], -3, -3],
  ['Entrega de hormigón - coordinación', 'Coordinar horario con la planta de hormigón', 'Consulta', 'Media', 'finalizado', '', -6, -6],
]
const TAREA_TIT = ['Retiro de materiales en corralón', 'Traslado de herramientas a obra', 'Entrega de insumos eléctricos', 'Service de vehículo', 'Coordinación de descarga', 'Compra de EPP', 'Traslado de personal', 'Consulta de disponibilidad de proveedor', 'Retiro de chapas en metalúrgica', 'Entrega de hormigón']
const TAREA_EST = ['solicitud', 'en_curso', 'programada', 'finalizado', 'solicitud', 'programada']
for (let i = 9; i < 50; i++) {
  const estado = pickAt(TAREA_EST, i * 2)
  const f = estado === 'finalizado' ? -(1 + (i % 12)) : (i % 10) - 1
  tareaSeed.push([`${pickAt(TAREA_TIT, i)} #${i}`, 'Tarea generada para la demostración del sistema', pickAt(['Tarea', 'Consulta', 'Urgente', 'Tarea'], i), pickAt(['Alta', 'Media', 'Baja'], i), estado, i % 4 === 0 ? '' : pickAt(vehiculos, i), f, f])
}
const tareas_logistica: Row[] = tareaSeed.map(([titulo, descripcion, tipo, prio, estado, veh, f, lim], i) => ({
  id: `tarea_${i + 1}`, tln: `TLN°${String(i + 1).padStart(2, '0')}`, titulo, descripcion, tipo, prioridad: prio, estado,
  solicitante_id: pickAt(['user_5', 'user_7', 'user_6', 'user_3', 'user_8', 'user_9', 'user_3', 'user_7', 'user_5'], i),
  fecha: `${dateOnly(f)}T${String(8 + (i % 6)).padStart(2, '0')}:00:00`, vehiculo: veh || null,
  asignado_id: estado === 'solicitud' ? null : 'user_9', creador_id: 'user_3',
  fecha_limite: lim === null ? null : `${dateOnly(lim)}T${String(16 + (i % 3)).padStart(2, '0')}:00:00`, order_id: null,
  created_at: iso(f - 2), updated_at: iso(f - 1),
}))
// Reservas de vehículos (tln RV…)
const reservaSeed: Array<[string, string, string, number, string, string]> = [
  ['Visita de obra - Subestación', 'Inspección con cliente', vehiculos[5], 1, 'confirmado', 'user_6'],
  ['Traslado de personal', 'Cuadrilla a Playa Sur', vehiculos[3], 2, 'pendiente', 'user_7'],
  ['Reunión con proveedor', 'Visita a fábrica de transformadores', vehiculos[0], 3, 'pendiente', 'user_4'],
  ['Relevamiento topográfico', 'Equipo de topografía', vehiculos[4], 0, 'confirmado', 'user_8'],
]
for (let i = 4; i < 20; i++) {
  reservaSeed.push([pickAt(['Visita de obra', 'Traslado de personal', 'Reunión con proveedor', 'Relevamiento', 'Inspección técnica'], i) + ` #${i}`, 'Reserva de vehículo para la demostración', pickAt(vehiculos, i), (i % 9) - 2, i % 3 === 0 ? 'confirmado' : i % 7 === 0 ? 'finalizado' : 'pendiente', pickAt(['user_4', 'user_6', 'user_7', 'user_8', 'user_5'], i)])
}
reservaSeed.forEach(([titulo, descripcion, veh, f, estado, sol], i) => {
  tareas_logistica.push({
    id: `reserva_${i + 1}`, tln: `RV${String(i + 1).padStart(2, '0')}`, titulo, descripcion, tipo: 'RESERVA', prioridad: 'Media', estado,
    solicitante_id: sol, fecha: `${dateOnly(f)}T08:00:00`, vehiculo: veh, asignado_id: null, creador_id: sol, fecha_limite: `${dateOnly(f)}T18:00:00`, order_id: null,
    created_at: iso(f - 3), updated_at: iso(f - 2),
  })
})

// ───────────────────────── Notificaciones / auditoría ─────────────────────────
const notifications: Row[] = [
  { title: 'Nuevo pedido solicitado', message: 'Federico Aguirre creó el pedido RQI en Planta Industrial Norte.', type: 'order_created', reference_type: 'order', reference_id: 'order_1', is_read: false },
  { title: 'Pedido listo para compras', message: 'El pedido RQI-002 está listo para cotizar.', type: 'order_status', reference_type: 'order', reference_id: 'order_2', is_read: false },
  { title: 'Te mencionaron en un comentario', message: 'Lucía Paredes te mencionó en RQI-004.', type: 'mention', reference_type: 'order', reference_id: 'order_4', is_read: false },
  { title: 'Nueva reserva de vehículo', message: 'Andrea Villalba reservó la OROCH para hoy.', type: 'task', reference_type: 'tarea', reference_id: 'reserva_4', is_read: true },
  { title: 'Licitación en evaluación', message: 'OPL-003 pasó a presupuestos.', type: 'licitacion', reference_type: 'licitacion', reference_id: 'lic_3', is_read: true },
].concat(Array.from({ length: 25 }, (_, k) => {
  const o = orders[(k * 3) % orders.length]
  return { title: pickAt(['Nuevo pedido solicitado', 'Pedido derivado', 'Pedido finalizado', 'Te mencionaron en un comentario', 'Nueva tarea asignada'], k), message: `Novedad en ${o.rqi} (${o.obra}).`, type: pickAt(['order_created', 'order_status', 'order_status', 'mention', 'task'], k), reference_type: 'order', reference_id: o.id, is_read: k % 3 !== 0 }
})).map((x, i) => ({ id: `notif_${i + 1}`, user_id: 'user_1', ...x, created_at: iso(-i, 9 + i), updated_at: iso(-i, 9 + i) }))

const audit_logs: Row[] = []
orders.slice(0, 60).forEach((o, i) => {
  const u = users.find((x) => x.id === o.solicitante_id)!
  audit_logs.push({ id: id('al'), user_id: u.id, user_name: u.name, user_role: 'Usuario', action: 'crear', entity: 'order', entity_id: o.id, entity_name: o.rqi, description: `Creó el pedido ${o.rqi}`, metadata: null, ip_address: null, user_agent: null, created_at: o.created_at })
  if (o.current_area !== 'solicitados') audit_logs.push({ id: id('al'), user_id: 'user_2', user_name: 'Carolina Méndez', user_role: 'Compras', action: 'derivar', entity: 'order', entity_id: o.id, entity_name: o.rqi, description: `Derivó el pedido ${o.rqi} a Compras`, metadata: null, ip_address: null, user_agent: null, created_at: iso(-15 + i) })
})
licitaciones.slice(0, 30).forEach((l, i) => {
  audit_logs.push({ id: id('al'), user_id: l.creador_id, user_name: users.find((x) => x.id === l.creador_id)!.name, user_role: 'Usuario', action: 'crear', entity: 'licitacion', entity_id: l.id, entity_name: l.opl, description: `Creó la licitación ${l.opl}`, metadata: null, ip_address: null, user_agent: null, created_at: l.created_at })
})
audit_logs.push({ id: id('al'), user_id: 'user_1', user_name: 'Santiago López', user_role: 'Administrador', action: 'crear', entity: 'user', entity_id: 'user_10', entity_name: 'Paula Giménez', description: 'Creó el usuario Paula Giménez', metadata: null, ip_address: null, user_agent: null, created_at: iso(-30) })
audit_logs.sort((a, b) => b.created_at.localeCompare(a.created_at))

// ───────────────────────── Stock (API simulada) ─────────────────────────
const proveedores: Row[] = [
  ['prov_1', 'Corralón Norte SA', '30-70123456-1', 'Hernán Díaz', 'ventas@corralonnorte.com', '+54 351 555-2001'],
  ['prov_2', 'Electro Insumos SRL', '30-71234567-8', 'Silvia Rey', 'comercial@electroinsumos.com', '+54 351 555-2002'],
  ['prov_3', 'Aceros del Centro', '30-69876543-2', 'Julio Pérez', 'info@acerosdelcentro.com', '+54 351 555-2003'],
  ['prov_4', 'Hidro Tubos SA', '30-70555444-3', 'Marina Costa', 'ventas@hidrotubos.com', '+54 351 555-2004'],
  ['prov_5', 'Ferretería Industrial Cba', '30-71888999-0', 'Gustavo Lima', 'pedidos@ferrind.com', '+54 351 555-2005'],
].concat(Array.from({ length: 15 }, (_, k) => {
  const nm = pickAt(['Corralón', 'Distribuidora', 'Ferretería', 'Eléctrica', 'Hidráulica', 'Aceros', 'Pinturas'], k) + ' ' + pickAt(APELLIDOS, k * 3)
  return [`prov_${k + 6}`, nm, `30-7${String(1000000 + k * 7919).slice(0, 7)}-${k % 10}`, `${pickAt(NOMBRES, k)} ${pickAt(APELLIDOS, k)}`, `ventas@${sinAc(nm).replace(/ /g, '')}.com`, `+54 351 555-${2006 + k}`]
})).map(([pid, nombre, cuit, contacto, email, telefono], i) => ({ id: pid, nombre, cuit, contacto, email, telefono, createdAt: iso(-100 + i), updatedAt: iso(-10) }))

const materialSeed: Array<[string, string, string, string]> = [
  ['Cemento Portland (bolsa 50 kg)', 'bolsa', 'Cemento de uso general', 'prov_1'],
  ['Hierro del 12 (barra 12 m)', 'barra', 'Acero ADN 420', 'prov_3'],
  ['Hierro del 8 (barra 12 m)', 'barra', 'Acero ADN 420', 'prov_3'],
  ['Arena fina', 'm3', 'Arena lavada', 'prov_1'],
  ['Piedra partida 6-19', 'm3', 'Agregado grueso', 'prov_1'],
  ['Cable XLPE 3x240 mm2', 'm', 'Cable de media tensión', 'prov_2'],
  ['Bandeja portacables 300 mm', 'tramo', 'Chapa galvanizada', 'prov_2'],
  ['Cañería HF 6"', 'm', 'Hierro fundido', 'prov_4'],
  ['Válvula esclusa 6"', 'u', 'Bridada', 'prov_4'],
  ['Rociador K5.6', 'u', 'Respuesta rápida', 'prov_4'],
  ['Pintura epoxi gris 20 lts', 'lata', 'Alto tránsito', 'prov_5'],
  ['Casco de seguridad', 'u', 'Clase A', 'prov_5'],
]
const MAT_BASE: Array<[string, string]> = [['Tornillo autoperforante', 'caja'], ['Chapa trapezoidal', 'm2'], ['Cable unipolar', 'm'], ['Caño PVC', 'm'], ['Ladrillo hueco', 'u'], ['Cal hidratada', 'bolsa'], ['Pintura látex', 'lata'], ['Guante de seguridad', 'par'], ['Disco de corte', 'u'], ['Luminaria LED', 'u'], ['Tablero eléctrico', 'u'], ['Malla sima', 'm2'], ['Clavo 2"', 'kg'], ['Alambre de atar', 'kg'], ['Adhesivo cerámico', 'bolsa']]
for (let i = 12; i < 60; i++) {
  const [nb, um] = pickAt(MAT_BASE, i)
  materialSeed.push([`${nb} tipo ${String.fromCharCode(65 + (i % 8))}${i}`, um, 'Material de uso en obra', `prov_${1 + (i % 20)}`])
}
const materiales: Row[] = materialSeed.map(([nombre, unidadMedida, descripcion, proveedorId], i) => ({
  id: `mat_${i + 1}`, codigo: `MAT-${String(i + 1).padStart(4, '0')}`, nombre, unidadMedida, cantidad: 0, descripcion, proveedorId, imputacionId: null, createdAt: iso(-90 + i), updatedAt: iso(-5),
}))
const imputaciones: Row[] = []
obras.slice(0, 12).forEach((o, i) => {
  imputaciones.push({ id: `imp_${i}_1`, obraId: o.id, codigo: o.imputacion, descripcion: 'Materiales generales', createdAt: iso(-100), updatedAt: iso(-10) })
  imputaciones.push({ id: `imp_${i}_2`, obraId: o.id, codigo: `${o.imputacion.split('.').slice(0, 2).join('.')}.099`, descripcion: 'Insumos y herramientas', createdAt: iso(-100), updatedAt: iso(-10) })
})
const stocks: Row[] = []
imputaciones.forEach((imp, i) => {
  for (let k = 0; k < 8; k++) {
    const m = materiales[(i * 5 + k * 3) % materiales.length]
    stocks.push({ id: id('st'), imputacionId: imp.id, materialId: m.id, cantidadActual: [120, 45.5, 300, 18, 76.25, 9][(i + k) % 6], createdAt: iso(-60), updatedAt: iso(-3) })
  }
})
materiales.forEach((m) => { m.cantidad = stocks.filter((s) => s.materialId === m.id).reduce((a, s) => a + s.cantidadActual, 0) })
const movimientos: Row[] = []
for (let i = 0; i < 200; i++) {
  const st = stocks[i % stocks.length]
  const tipo = ['Entrada', 'Salida', 'Entrada', 'Ajuste', 'Salida'][i % 5]
  movimientos.push({
    id: `mov_${i + 1}`, imputacionId: st.imputacionId, materialId: st.materialId, tipoMovimiento: tipo,
    cantidad: [10, 5, 25.5, 2, 40][i % 5], fecha: iso(-Math.floor(i / 4), 8 + (i % 9)), usuario: ['Ricardo Funes', 'Diego Salinas', 'Carolina Méndez'][i % 3],
    observaciones: tipo === 'Ajuste' ? 'Ajuste por inventario' : tipo === 'Entrada' ? 'Ingreso por compra' : 'Consumo en obra',
  })
}
const compras: Row[] = [
  { id: 'compra_1', fecha: iso(-12), proveedorId: 'prov_1', observaciones: 'Reposición mensual de agregados', detalles: [{ materialId: 'mat_1', cantidad: 200, costoUnitario: 9500 }, { materialId: 'mat_4', cantidad: 15, costoUnitario: 28000 }] },
  { id: 'compra_2', fecha: iso(-9), proveedorId: 'prov_2', observaciones: 'Cableado Subestación', detalles: [{ materialId: 'mat_6', cantidad: 300, costoUnitario: 118000 }] },
  { id: 'compra_3', fecha: iso(-4), proveedorId: 'prov_4', observaciones: 'Red contra incendios', detalles: [{ materialId: 'mat_8', cantidad: 60, costoUnitario: 69000 }, { materialId: 'mat_9', cantidad: 8, costoUnitario: 210000 }] },
  { id: 'compra_4', fecha: iso(-2), proveedorId: 'prov_5', observaciones: '', detalles: [{ materialId: 'mat_12', cantidad: 40, costoUnitario: 7800 }] },
].concat(Array.from({ length: 20 }, (_, k) => ({
  id: `compra_${k + 5}`, fecha: iso(-(3 + k * 3)), proveedorId: `prov_${1 + ((k * 3) % 20)}`, observaciones: k % 3 ? 'Reposición de stock' : '',
  detalles: [0, 1, 2].slice(0, 1 + (k % 3)).map((j) => ({ materialId: `mat_${1 + ((k * 7 + j * 11) % 60)}`, cantidad: 10 + ((k * 13 + j * 7) % 90), costoUnitario: 2500 + ((k * 7919 + j * 331) % 90) * 1000 })),
}))).map((c) => ({ ...c, createdAt: c.fecha, updatedAt: c.fecha }))

export const buildSeed = (): { tables: Tables; stock: Tables } => ({
  tables: {
    roles, users, obras, obra_montos, orders, order_histories, comments, documents, entregas_parciales,
    licitaciones, licitacion_histories, tareas_logistica, notifications, audit_logs, configurations: [],
  },
  stock: { proveedores, materiales, imputaciones, stocks, movimientos, compras },
})

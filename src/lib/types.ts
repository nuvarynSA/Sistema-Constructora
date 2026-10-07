// Type definitions
export type ViewMode = 'kanban' | 'table'
export type Priority = 'Alta' | 'Media' | 'Baja'
export type OrderArea = 'solicitados' | 'compras' | 'logistica' | 'finalizado'
export type LicitacionProcess = 'solicitud' | 'compras' | 'presupuestos' | 'finalizado'

export interface User {
  id: string
  name: string
  email: string
  role_id: string
  area: string
  avatar: string
  phone?: string
  position?: string
  status: string
  last_login?: string
  created_at: string
  updated_at: string
  role?: Role
}

export interface Role {
  id: string
  name: string
  description: string
  permissions: string[]
  user_count: number
  created_at: string
  updated_at: string
}

export interface Order {
  id: string
  rqi: string
  obra: string
  obra_id?: string
  solicitante_id: string
  fecha_creacion: string
  fecha_necesidad: string
  fecha_entrega?: string
  fecha_finalizacion?: string
  estado: string
  estado_detallado?: string
  prioridad: string
  area_solicitud: string
  remito?: string
  remito_url?: string
  lugar_entrega: string
  detalle_materiales: string
  responsable_id?: string
  current_area: OrderArea
  obra_proyecto1?: string
  obra_proyecto2?: string
  obra_proyectos?: Array<{
    obraId?: string
    obra?: string
    imputacion?: string
    subrubro?: string
  }>
  monto_estimado?: number
  monto_oc?: number
  montos_oc?: number[]
  tipo_entrega: TipoEntrega
  estado_entrega: EstadoEntrega
  notas_entrega?: string
  created_at: string
  updated_at: string
  solicitante?: User
  responsable?: User
  obra_relacion?: Obra
  documents?: Document[]
  comments?: Comment[]
  history?: OrderHistory[]
  entregas_parciales?: EntregaParcial[]
}

export interface OrderHistory {
  id: string
  order_id: string
  fecha: string
  usuario_id: string
  accion: string
  tipo: string
  created_at: string
  usuario?: User
}

export interface Licitacion {
  id: string
  opl: string
  empresa: string
  obra: string
  fecha_creacion: string
  monto: number
  prioridad: string
  lugar_entrega: string
  detalle_items: string
  estado: string
  estado_detallado?: string
  area_solicitud: string
  current_process: LicitacionProcess
  creador_id: string
  responsable_id?: string
  created_at: string
  updated_at: string
  creador?: User
  responsable?: User
  documents?: Document[]
  comments?: Comment[]
  history?: LicitacionHistory[]
}

export interface LicitacionHistory {
  id: string
  licitacion_id: string
  fecha: string
  usuario_id: string
  accion: string
  tipo: string
  created_at: string
  usuario?: User
}

export interface Document {
  id: string
  nombre: string
  tipo: string
  fecha: string
  tamano: string
  url: string
  order_id?: string
  licitacion_id?: string
  created_at: string
  updated_at: string
}

export interface Comment {
  id: string
  content: string
  user_id: string
  order_id?: string
  licitacion_id?: string
  created_at: string
  updated_at: string
  user?: User
}

export interface Configuration {
  id: string
  key_name: string
  value: any
  created_at: string
  updated_at: string
}

export interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  type: string
  reference_type: string
  reference_id: string
  is_read: boolean
  created_at: string
}

export interface AuditLog {
  id: string
  user_id: string
  user_name: string
  user_role: string
  action: string
  entity: string
  entity_id?: string
  entity_name?: string
  description: string
  metadata?: any
  ip_address?: string
  user_agent?: string
  created_at: string
  user?: User
}

export interface ObraMonto {
  id: string
  obra_id: string
  monto: number
  nota?: string
  usuario_id?: string
  created_at: string
  usuario?: User
}

export interface Obra {
  id: string
  nombre: string
  imputacion: string
  monto_estimado: number
  monto_mano_obra_finalizada?: number
  monto_gastado: number
  descripcion?: string
  estado: string
  activa?: boolean
  fecha_inicio?: string
  fecha_fin_estimada?: string
  responsable_id?: string
  imagen_url?: string
  created_at: string
  updated_at: string
  responsable?: User
  orders?: Order[]
  obra_montos?: ObraMonto[]
}

export interface EntregaParcial {
  id: string
  order_id: string
  remito: string
  fecha_entrega: string
  detalle_entregado: string
  observaciones?: string
  usuario_id: string
  created_at: string
  usuario?: User
}

export interface Vehiculo {
  id: string
  nombre: string
  patente?: string
  tipo: string
  capacidad?: string
  estado: string
  observaciones?: string
  created_at: string
  updated_at: string
  reservas?: ReservaVehiculo[]
}

export interface ReservaVehiculo {
  id: string
  vehiculo_id: string
  usuario_id: string
  fecha_inicio: string
  fecha_fin: string
  motivo: string
  destino?: string
  order_id?: string
  estado: string
  observaciones?: string
  created_at: string
  updated_at: string
  vehiculo?: Vehiculo
  usuario?: User
  order?: Order
}

export type TareaEstado = 'solicitud' | 'en_curso' | 'programada' | 'finalizado'
export type TareaVehiculo =
  | 'SAVEIRO OOQ334'
  | 'KANGOO AF873XB'
  | 'KANGOO AF873WW'
  | 'KANGOO AE255GY'
  | 'OROCH AC698OV'
  | 'ALASKAN AE889PT'
  | 'MASTER AE255GZ'

export interface TareaLogistica {
  id: string
  tln: string // Código TLNºXX
  titulo?: string
  descripcion: string
  tipo?: string // Tarea, Consulta, Urgente
  prioridad: string // Alta, Media, Baja
  estado: string // solicitud, en_curso, finalizado
  solicitante_id: string
  fecha: string
  vehiculo?: string // KANGOO 1, KANGOO 2, MASTER
  asignado_id?: string
  creador_id?: string
  fecha_limite?: string
  order_id?: string
  created_at: string
  updated_at: string
  solicitante?: User
  asignado?: User
  creador?: User
}

export type TipoEntrega = 'Recibir' | 'Retirar'
export type EstadoEntrega = 'Pendiente' | 'Parcial' | 'Completo'

// Helper para convertir snake_case a camelCase si es necesario
export function toCamelCase<T>(obj: any): T {
  return obj
}

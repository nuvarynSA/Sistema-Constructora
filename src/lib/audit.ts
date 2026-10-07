import { createClient } from '@/lib/mock/client'
import type { User } from './types'

export interface AuditLogInput {
  action: 'crear' | 'editar' | 'eliminar' | 'derivar' | 'ver' | 'activar' | 'desactivar'
  entity: 'order' | 'licitacion' | 'user' | 'role' | 'document' | 'comment'
  entityId?: string
  entityName?: string
  description: string
  metadata?: any
}

/**
 * Registra una acción en el log de auditoría
 */
export async function logAuditAction(
  user: User,
  input: AuditLogInput
): Promise<void> {
  try {
    const dataClient = createClient()
    
    const auditLog = {
      id: crypto.randomUUID(),
      user_id: user.id,
      user_name: user.name,
      user_role: user.role?.name || 'Sin rol',
      action: input.action,
      entity: input.entity,
      entity_id: input.entityId || null,
      entity_name: input.entityName || null,
      description: input.description,
      metadata: input.metadata || null,
      ip_address: null, // Se puede obtener del request en el futuro
      user_agent: typeof window !== 'undefined' ? window.navigator.userAgent : null,
    }

    await dataClient.from('audit_logs').insert([auditLog])
  } catch (error) {
    console.error('Error al registrar en auditoría:', error)
    // No lanzamos error para no interrumpir la operación principal
  }
}

/**
 * Helper para registrar cambios en pedidos
 */
export async function logOrderAction(
  user: User,
  action: AuditLogInput['action'],
  orderId: string,
  orderRqi: string,
  description: string,
  metadata?: any
): Promise<void> {
  await logAuditAction(user, {
    action,
    entity: 'order',
    entityId: orderId,
    entityName: orderRqi,
    description,
    metadata,
  })
}

/**
 * Helper para registrar cambios en licitaciones
 */
export async function logLicitacionAction(
  user: User,
  action: AuditLogInput['action'],
  licitacionId: string,
  licitacionOpl: string,
  description: string,
  metadata?: any
): Promise<void> {
  await logAuditAction(user, {
    action,
    entity: 'licitacion',
    entityId: licitacionId,
    entityName: licitacionOpl,
    description,
    metadata,
  })
}

/**
 * Helper para registrar cambios en usuarios
 */
export async function logUserAction(
  user: User,
  action: AuditLogInput['action'],
  targetUserId: string,
  targetUserName: string,
  description: string,
  metadata?: any
): Promise<void> {
  await logAuditAction(user, {
    action,
    entity: 'user',
    entityId: targetUserId,
    entityName: targetUserName,
    description,
    metadata,
  })
}

/**
 * Helper para registrar cambios en roles
 */
export async function logRoleAction(
  user: User,
  action: AuditLogInput['action'],
  roleId: string,
  roleName: string,
  description: string,
  metadata?: any
): Promise<void> {
  await logAuditAction(user, {
    action,
    entity: 'role',
    entityId: roleId,
    entityName: roleName,
    description,
    metadata,
  })
}

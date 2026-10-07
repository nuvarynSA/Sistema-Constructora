'use client'

import { useAuth } from './use-auth'
import type { Order, Licitacion, OrderArea, LicitacionProcess, User } from '@/lib/types'
import { isAdminRoleName } from '@/lib/permissions'

/**
 * Hook para validar permisos basados en roles y áreas
 */

const areaToRoleMap: Record<OrderArea, string[]> = {
  'solicitados': ['Administrador', 'Compras'], // Solo Compras puede derivar desde solicitados
  'compras': ['Administrador', 'Compras'], // Solo Compras puede derivar a logística
  'logistica': ['Administrador', 'Logística'], // Solo Logística puede derivar a finalizado
  'finalizado': ['Administrador'], // Solo Admin puede modificar finalizados
}

const areaToUserAreaMap: Record<OrderArea, string[]> = {
  'solicitados': ['Compras'],
  'compras': ['Compras'],
  'logistica': ['Logística'],
  'finalizado': [],
}

const isAdminUser = (user?: User | null) => {
  return isAdminRoleName(user?.role?.name)
}

export const canDeriveOrderForUser = (order: Order, user?: User | null): boolean => {
  if (!user) return false
  if (isAdminUser(user)) return true
  if (order.current_area === 'finalizado') return false

  const allowedRoles = areaToRoleMap[order.current_area]
  const allowedAreas = areaToUserAreaMap[order.current_area]

  if (allowedRoles?.includes(user.role?.name || '')) {
    return true
  }

  if (allowedAreas && allowedAreas.length > 0 && user.area) {
    const userArea = user.area || ''
    return allowedAreas.some(area => userArea.includes(area))
  }

  return false
}

export function usePermissions() {
  const { userData } = useAuth()

  /**
   * Verifica si el usuario es administrador
   */
  const isAdmin = () => {
    return isAdminRoleName(userData?.role?.name)
  }

  /**
   * Mapeo de áreas de pedidos a roles y áreas de usuario
   * NUEVA LÓGICA:
   * - Solicitante: solo puede crear (en estado Pendiente)
   * - Compras: puede derivar de solicitados->compras y compras->logística
   * - Logística: puede derivar a finalizado y registrar entregas
   * - Admin: puede todo
   */
  /**
   * Mapeo de procesos de licitaciones a roles
   */
  const processToRoleMap: Record<LicitacionProcess, string[]> = {
    'solicitud': ['Administrador', 'Usuario'], // Cualquier usuario puede crear
    'compras': ['Administrador', 'Compras'],
    'presupuestos': ['Administrador', 'Presupuestos'],
    'finalizado': ['Administrador'],
  }

  /**
   * Verifica si el usuario puede modificar un pedido según su área actual
   */
  const canModifyOrder = (order: Order): boolean => {
    if (!userData) return false
    if (isAdmin()) return true

    const allowedRoles = areaToRoleMap[order.current_area]
    const allowedAreas = areaToUserAreaMap[order.current_area]
    
    // Verificar por rol
    if (allowedRoles?.includes(userData.role?.name || '')) {
      return true
    }
    
    // Verificar por área del usuario (verifica si el área del usuario contiene la palabra clave)
    if (allowedAreas && allowedAreas.length > 0 && userData.area) {
      const userArea = userData.area || ''
      return allowedAreas.some(area => {
        // Verifica si el área del usuario contiene la palabra clave
        // Ej: "Oficina Compras" contiene "Compras", "Oficina Logística" contiene "Logística"
        return userArea.includes(area)
      })
    }
    
    return false
  }

  /**
   * Verifica si el usuario puede derivar un pedido
   */
  const canDeriveOrder = (order: Order): boolean => {
    return canDeriveOrderForUser(order, userData)
  }

  /**
   * Verifica si el usuario puede eliminar un pedido
   */
  const canDeleteOrder = (order: Order): boolean => {
    if (!userData) return false
    return isAdmin()
  }

  /**
   * Verifica si el usuario puede crear un pedido
   */
  const canCreateOrder = (): boolean => {
    if (!userData) return false
    // Cualquier usuario autenticado puede crear pedidos
    return true
  }

  /**
   * Verifica si el usuario puede editar un pedido pendiente (primeras 2 horas)
   */
  const canEditPendingOrder = (order: Order): boolean => {
    if (!userData) return false
    if (isAdmin()) return true

    // Solo el solicitante puede editar mientras está pendiente
    if (order.estado_detallado === 'Pendiente' && order.solicitante_id === userData.id) {
      return true
    }

    return false
  }

  /**
   * Verifica si el usuario puede modificar una licitación según su proceso actual
   */
  const canModifyLicitacion = (licitacion: Licitacion): boolean => {
    if (!userData) return false
    if (isAdmin()) return true

    const allowedRoles = processToRoleMap[licitacion.current_process]
    return allowedRoles?.includes(userData.role?.name || '') || false
  }

  /**
   * Verifica si el usuario puede derivar una licitación
   */
  const canDeriveLicitacion = (licitacion: Licitacion): boolean => {
    if (!userData) return false
    if (isAdmin()) return true

    // Solo puede derivar si está en su proceso y no está finalizada
    if (licitacion.current_process === 'finalizado') return false
    
    const allowedRoles = processToRoleMap[licitacion.current_process]
    return allowedRoles?.includes(userData.role?.name || '') || false
  }

  /**
   * Verifica si el usuario puede eliminar una licitación
   */
  const canDeleteLicitacion = (licitacion: Licitacion): boolean => {
    if (!userData) return false
    return isAdmin()
  }

  /**
   * Verifica si el usuario tiene un permiso específico
   */
  const hasPermission = (permission: string): boolean => {
    if (!userData || !userData.role) return false
    if (isAdmin()) return true

    const permissions = userData.role.permissions
    
    if (Array.isArray(permissions)) {
      return permissions.includes(permission)
    }
    
    if (typeof permissions === 'object' && permissions !== null) {
      const permObj = permissions as Record<string, boolean>
      return permObj[permission] === true
    }
    
    return false
  }

  /**
   * Obtiene el mensaje de error cuando no tiene permisos
   */
  const getPermissionErrorMessage = (item: Order | Licitacion): string => {
    const currentArea = 'current_area' in item ? item.current_area : item.current_process
    const itemType = 'rqi' in item ? 'pedido' : 'licitación'
    
    return `Este ${itemType} está en el área/proceso "${currentArea}". Solo usuarios con el rol correspondiente o administradores pueden modificarlo.`
  }

  return {
    isAdmin,
    canModifyOrder,
    canDeriveOrder,
    canDeleteOrder,
    canCreateOrder,
    canEditPendingOrder,
    canModifyLicitacion,
    canDeriveLicitacion,
    canDeleteLicitacion,
    hasPermission,
    getPermissionErrorMessage,
    userData,
  }
}

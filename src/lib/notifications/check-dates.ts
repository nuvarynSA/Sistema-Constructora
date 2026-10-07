import { createClient } from '@/lib/mock/client'

export async function checkRQIApproachingDate(orderId?: string) {
  const dataClient = createClient()
  const now = new Date()
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)

  try {
    let query = dataClient
      .from('orders')
      .select('id, rqi, fecha_necesidad, solicitante_id, current_area')
      .lte('fecha_necesidad', threeDaysFromNow.toISOString())
      .gte('fecha_necesidad', now.toISOString())
      .neq('current_area', 'finalizado')

    if (orderId) {
      query = query.eq('id', orderId)
    }

    const { data: rqisProximas, error } = await query

    if (error) {
      console.error('Error al verificar RQI próximas:', error)
      return
    }

    if (!rqisProximas || rqisProximas.length === 0) {
      return
    }

    // Obtener usuarios del área de compras
    const { data: comprasUsers } = await dataClient
      .from('users')
      .select('id, area')
      .eq('status', 'Activo')

    const comprasUserIds = comprasUsers
      ?.filter(u => u.area && u.area.includes('Compras'))
      .map(u => u.id) || []

    // Verificar si ya existe una notificación reciente (últimas 24 horas) para evitar duplicados
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    for (const rqi of rqisProximas) {
      // Verificar si ya hay una notificación reciente para esta RQI
      const { data: existingNotifications } = await dataClient
        .from('notifications')
        .select('id')
        .eq('reference_id', rqi.id)
        .eq('type', 'rqi_approaching_date')
        .gte('created_at', yesterday.toISOString())
        .limit(1)

      if (existingNotifications && existingNotifications.length > 0) {
        continue // Ya existe una notificación reciente
      }

      const notifTs = now.toISOString()
      const notifications: Array<{
        id: string
        user_id: string
        title: string
        message: string
        type: string
        reference_id?: string
        reference_type?: string
        is_read: boolean
        created_at: string
        updated_at: string
      }> = []

      // Notificar al creador
      notifications.push({
        id: crypto.randomUUID(),
        user_id: rqi.solicitante_id,
        title: 'RQI próxima a fecha estimada',
        message: `La RQI ${rqi.rqi} está llegando a su fecha estimada. Revísala para evitar demoras.`,
        type: 'rqi_approaching_date',
        reference_id: rqi.id,
        reference_type: 'order',
        is_read: false,
        created_at: notifTs,
        updated_at: notifTs,
      })

      // Notificar al área de compras (excluyendo al creador si está en compras)
      comprasUserIds
        .filter(id => id !== rqi.solicitante_id)
        .forEach(userId => {
          notifications.push({
            id: crypto.randomUUID(),
            user_id: userId,
            title: 'RQI próxima a fecha estimada',
            message: `La RQI ${rqi.rqi} está llegando a su fecha estimada. Revísala para evitar demoras.`,
            type: 'rqi_approaching_date',
            reference_id: rqi.id,
            reference_type: 'order',
            is_read: false,
            created_at: notifTs,
            updated_at: notifTs,
          })
        })

      if (notifications.length > 0) {
        await dataClient.from('notifications').insert(notifications)
      }
    }
  } catch (error) {
    console.error('Error al verificar RQI próximas:', error)
  }
}

export async function checkObrasApproachingEnd(obraId?: string) {
  const dataClient = createClient()
  const now = new Date()
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  try {
    let query = dataClient
      .from('obras')
      .select('id, nombre, fecha_fin_estimada, estado')
      .not('fecha_fin_estimada', 'is', null)
      .lte('fecha_fin_estimada', sevenDaysFromNow.toISOString())
      .gte('fecha_fin_estimada', now.toISOString())
      .eq('estado', 'Activa')

    if (obraId) {
      query = query.eq('id', obraId)
    }

    const { data: obrasProximas, error } = await query

    if (error) {
      console.error('Error al verificar obras próximas:', error)
      return
    }

    if (!obrasProximas || obrasProximas.length === 0) {
      return
    }

    // Obtener todos los usuarios activos
    const { data: allUsers } = await dataClient
      .from('users')
      .select('id')
      .eq('status', 'Activo')

    if (!allUsers) {
      return
    }

    // Verificar si ya existe una notificación reciente (últimas 24 horas) para evitar duplicados
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    for (const obra of obrasProximas) {
      // Verificar si ya hay una notificación reciente para esta obra
      const { data: existingNotifications } = await dataClient
        .from('notifications')
        .select('id')
        .eq('reference_id', obra.id)
        .eq('type', 'obra_approaching_end')
        .gte('created_at', yesterday.toISOString())
        .limit(1)

      if (existingNotifications && existingNotifications.length > 0) {
        continue // Ya existe una notificación reciente
      }

      const notifTs = now.toISOString()
      const notifications = allUsers.map(u => ({
        id: crypto.randomUUID(),
        user_id: u.id,
        title: 'Obra próxima a finalización',
        message: `Una obra está próxima a su fecha de finalización. Verificá el avance para asegurar el cierre a tiempo.`,
        type: 'obra_approaching_end',
        reference_id: obra.id,
        reference_type: 'obra',
        is_read: false,
        created_at: notifTs,
        updated_at: notifTs,
      }))

      if (notifications.length > 0) {
        await dataClient.from('notifications').insert(notifications)
      }
    }
  } catch (error) {
    console.error('Error al verificar obras próximas:', error)
  }
}

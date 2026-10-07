import { createClient } from '@/lib/mock/client'

export async function createNotification(params: {
  userId: string
  title: string
  message: string
  type: string
  referenceId?: string
  referenceType?: 'order' | 'licitacion' | 'obra' | 'tarea'
}) {
  const dataClient = createClient()
  
  const now = new Date().toISOString()
  const { error } = await dataClient.from('notifications').insert({
    id: crypto.randomUUID(),
    user_id: params.userId,
    title: params.title,
    message: params.message,
    type: params.type,
    reference_id: params.referenceId,
    reference_type: params.referenceType,
    is_read: false,
    created_at: now,
    updated_at: now,
  })

  if (error) {
    console.error('Error creating notification:', error)
  }
}

export async function notifyAreaUsers(params: {
  area: string
  title: string
  message: string
  type: string
  referenceId?: string
  referenceType?: 'order' | 'licitacion' | 'obra' | 'tarea'
  excludeUserId?: string
}) {
  const dataClient = createClient()
  
  // Obtener usuarios del área destino
  const { data: users } = await dataClient
    .from('users')
    .select('id')
    .eq('area', params.area)
    .eq('status', 'Activo')

  if (!users) return

  // Crear notificación para cada usuario del área
  const now = new Date().toISOString()
  const notifications = users
    .filter(user => user.id !== params.excludeUserId)
    .map(user => ({
      id: crypto.randomUUID(),
      user_id: user.id,
      title: params.title,
      message: params.message,
      type: params.type,
      reference_id: params.referenceId,
      reference_type: params.referenceType,
      is_read: false,
      created_at: now,
      updated_at: now,
    }))

  if (notifications.length > 0) {
    await dataClient.from('notifications').insert(notifications)
  }
}

export async function notifyAllUsers(params: {
  title: string
  message: string
  type: string
  referenceId?: string
  referenceType?: 'order' | 'licitacion' | 'obra' | 'tarea'
  excludeUserId?: string
}) {
  const dataClient = createClient()
  
  const { data: users } = await dataClient
    .from('users')
    .select('id')
    .eq('status', 'Activo')

  if (!users) return

  const now = new Date().toISOString()
  const notifications = users
    .filter(user => user.id !== params.excludeUserId)
    .map(user => ({
      id: crypto.randomUUID(),
      user_id: user.id,
      title: params.title,
      message: params.message,
      type: params.type,
      reference_id: params.referenceId,
      reference_type: params.referenceType,
      is_read: false,
      created_at: now,
      updated_at: now,
    }))

  if (notifications.length > 0) {
    await dataClient.from('notifications').insert(notifications)
  }
}

export async function notifyComprasArea(params: {
  title: string
  message: string
  type: string
  referenceId?: string
  referenceType?: 'order' | 'licitacion' | 'obra' | 'tarea'
  excludeUserId?: string
}) {
  const dataClient = createClient()
  
  const { data: users } = await dataClient
    .from('users')
    .select('id, area')
    .eq('status', 'Activo')

  if (!users) return

  const comprasUsers = users.filter(user => 
    user.area && user.area.includes('Compras')
  )

  const now = new Date().toISOString()
  const notifications = comprasUsers
    .filter(user => user.id !== params.excludeUserId)
    .map(user => ({
      id: crypto.randomUUID(),
      user_id: user.id,
      title: params.title,
      message: params.message,
      type: params.type,
      reference_id: params.referenceId,
      reference_type: params.referenceType,
      is_read: false,
      created_at: now,
      updated_at: now,
    }))

  if (notifications.length > 0) {
    await dataClient.from('notifications').insert(notifications)
  }
}

export async function notifyLogisticaArea(params: {
  title: string
  message: string
  type: string
  referenceId?: string
  referenceType?: 'order' | 'licitacion' | 'obra' | 'tarea'
  excludeUserId?: string
}) {
  const dataClient = createClient()
  
  const { data: users } = await dataClient
    .from('users')
    .select('id, area')
    .eq('status', 'Activo')

  if (!users) return

  const logisticaUsers = users.filter(user => 
    user.area && user.area.includes('Logística')
  )

  const now = new Date().toISOString()
  const notifications = logisticaUsers
    .filter(user => user.id !== params.excludeUserId)
    .map(user => ({
      id: crypto.randomUUID(),
      user_id: user.id,
      title: params.title,
      message: params.message,
      type: params.type,
      reference_id: params.referenceId,
      reference_type: params.referenceType,
      is_read: false,
      created_at: now,
      updated_at: now,
    }))

  if (notifications.length > 0) {
    await dataClient.from('notifications').insert(notifications)
  }
}

export async function notifyMentionedUsers(params: {
  commentContent: string
  commentAuthorId: string
  commentAuthorName: string
  referenceId?: string
  referenceType?: 'order' | 'licitacion' | 'obra' | 'tarea'
}) {
  const dataClient = createClient()
  
  const mentionRegex = /@(\w+)/g
  const mentions: string[] = []
  let match

  while ((match = mentionRegex.exec(params.commentContent)) !== null) {
    mentions.push(match[1])
  }

  if (mentions.length === 0) return

  const { data: users } = await dataClient
    .from('users')
    .select('id, name, email')
    .eq('status', 'Activo')

  if (!users) return

  const mentionedUsers = users.filter(user => {
    const userNameLower = user.name.toLowerCase().replace(/\s+/g, '')
    const userEmailLower = user.email.toLowerCase().split('@')[0]
    return mentions.some(mention => {
      const mentionLower = mention.toLowerCase()
      return userNameLower.includes(mentionLower) || userEmailLower.includes(mentionLower)
    })
  })

  const now = new Date().toISOString()
  const notifications = mentionedUsers
    .filter(user => user.id !== params.commentAuthorId)
    .map(user => ({
      id: crypto.randomUUID(),
      user_id: user.id,
      title: 'Fuiste mencionado',
      message: `${params.commentAuthorName} te mencionó en un comentario.`,
      type: 'mention',
      reference_id: params.referenceId,
      reference_type: params.referenceType,
      is_read: false,
      created_at: now,
      updated_at: now,
    }))

  if (notifications.length > 0) {
    await dataClient.from('notifications').insert(notifications)
  }
}

export async function notifyOrderCreatorEvent(params: {
  orderId: string
  solicitanteId?: string
  title: string
  message: string
  type: string
  actorId?: string
  referenceType?: 'order' | 'licitacion' | 'obra' | 'tarea'
  skipIfActorIsCreator?: boolean
}) {
  const dataClient = createClient()

  let creatorId = params.solicitanteId

  if (!creatorId) {
    const { data: order } = await dataClient
      .from('orders')
      .select('solicitante_id')
      .eq('id', params.orderId)
      .maybeSingle()

    creatorId = order?.solicitante_id || undefined
  }

  if (!creatorId) return
  if (params.skipIfActorIsCreator !== false && params.actorId && params.actorId === creatorId) {
    return
  }

  const now = new Date().toISOString()
  const { error } = await dataClient.from('notifications').insert({
    id: crypto.randomUUID(),
    user_id: creatorId,
    title: params.title,
    message: params.message,
    type: params.type,
    reference_id: params.orderId,
    reference_type: params.referenceType || 'order',
    is_read: false,
    created_at: now,
    updated_at: now,
  })

  if (error) {
    console.error('Error notifying order creator:', error)
  }
}

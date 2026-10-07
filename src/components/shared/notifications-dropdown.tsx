'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/mock/client'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Bell, Check, Package, FileText } from 'lucide-react'
import { cn, formatDateTime } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import type { Notification } from '@/lib/types'

export function NotificationsDropdown() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const { userData } = useAuth()
  const dataClient = createClient()
  const router = useRouter()

  useEffect(() => {
    if (userData) {
      fetchNotifications()
      
      // Suscribirse a cambios en tiempo real
      const channel = dataClient
        .channel('notifications')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userData.id}`,
          },
          () => {
            fetchNotifications()
          }
        )
        .subscribe()

      return () => {
        dataClient.removeChannel(channel)
      }
    }
  }, [userData])

  const fetchNotifications = async () => {
    if (!userData) return

    const { data } = await dataClient
      .from('notifications')
      .select('*')
      .eq('user_id', userData.id)
      .order('created_at', { ascending: false })
      .limit(10)

    setNotifications(data || [])
    setUnreadCount(data?.filter(n => !n.is_read).length || 0)
  }

  const markAsRead = async (notificationId: string) => {
    await dataClient
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)

    fetchNotifications()
  }

  const markAllAsRead = async () => {
    if (!userData) return
    
    setLoading(true)
    await dataClient
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userData.id)
      .eq('is_read', false)

    await fetchNotifications()
    setLoading(false)
  }

  const handleNotificationClick = (notification: Notification) => {
    // Marcar como leída
    markAsRead(notification.id)

    // Navegar al pedido o licitación
    if (notification.reference_type === 'order') {
      router.push('/dashboard/pedidos')
    } else if (notification.reference_type === 'licitacion') {
      router.push('/dashboard/licitaciones')
    }
  }

  const getIcon = (type: string) => {
    if (type.includes('order')) {
      return <Package className="h-4 w-4 text-blue-600 dark:text-blue-400" />
    }
    return <FileText className="h-4 w-4 text-violet-600 dark:text-violet-400" />
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <>
              <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-background">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
              <span className="absolute top-0 right-0 h-3 w-3 bg-red-500 rounded-full animate-pulse"></span>
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-2 py-2">
          <DropdownMenuLabel className="p-0">
            Notificaciones
            {unreadCount > 0 && (
              <span className="ml-2 text-xs bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300 px-2 py-0.5 rounded-full">
                {unreadCount} nueva{unreadCount !== 1 ? 's' : ''}
              </span>
            )}
          </DropdownMenuLabel>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              disabled={loading}
              className="h-7 text-xs"
            >
              <Check className="h-3 w-3 mr-1" />
              Marcar todas
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        
        {notifications.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            No tienes notificaciones
          </div>
        ) : (
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={cn(
                  'cursor-pointer p-3 border-l-2 border-l-transparent',
                  !notification.is_read && 'bg-blue-50/80 dark:bg-blue-950/35 border-l-blue-500/70 dark:border-l-blue-400/70'
                )}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex gap-3 w-full">
                  <div className={cn(
                    'mt-0.5 rounded-md p-1.5',
                    !notification.is_read ? 'bg-blue-100/80 dark:bg-blue-900/35' : 'bg-muted/50'
                  )}>
                    {getIcon(notification.type)}
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className={cn('text-sm', !notification.is_read ? 'font-semibold' : 'font-normal')}>
                      {notification.title}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(notification.created_at)}
                    </p>
                  </div>
                  {!notification.is_read && (
                    <div className="h-2 w-2 bg-blue-500 dark:bg-blue-400 rounded-full mt-1"></div>
                  )}
                </div>
              </DropdownMenuItem>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

'use client'

import { useEffect } from 'react'

type ServiceWorkerCleanupProps = {
  enabled: boolean
}

const reloadKey = 'nexora:sw_cleanup_reloaded'

export function ServiceWorkerCleanup({ enabled }: ServiceWorkerCleanupProps) {
  useEffect(() => {
    if (!enabled) return
    if (!('serviceWorker' in navigator)) return

    let cancelled = false

    const cleanup = async () => {
      try {
        const hadController = Boolean(navigator.serviceWorker.controller)
        const registrations = await navigator.serviceWorker.getRegistrations()
        const hadRegistrations = registrations.length > 0

        await Promise.all(registrations.map((registration) => registration.unregister()))

        if ('caches' in window) {
          const keys = await caches.keys()
          await Promise.all(keys.map((key) => caches.delete(key)))
        }

        if (cancelled) return

        // A page reload is required to fully detach an active controller.
        if ((hadController || hadRegistrations) && sessionStorage.getItem(reloadKey) !== '1') {
          sessionStorage.setItem(reloadKey, '1')
          window.location.reload()
        }
      } catch (error) {
        console.warn('[ServiceWorkerCleanup] failed', error)
      }
    }

    cleanup()

    return () => {
      cancelled = true
    }
  }, [enabled])

  return null
}


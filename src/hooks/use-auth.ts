'use client'

import { useEffect, useState, useCallback } from 'react'
type AuthUser = { id: string; email?: string | null; [key: string]: any }
import { createClient } from '@/lib/mock/client'
import type { User } from '@/lib/types'

type AuthState = {
  user: AuthUser | null
  userData: User | null
  loading: boolean
}

const storageKey = 'nexora:userData'
let authState: AuthState = { user: null, userData: null, loading: true }
let initPromise: Promise<void> | null = null
let authSubscription: { unsubscribe: () => void } | null = null
let ensureUserDataPromise: Promise<User | null> | null = null
const listeners = new Set<() => void>()

const notify = () => {
  listeners.forEach((listener) => listener())
}

const setAuthState = (partial: Partial<AuthState>) => {
  authState = { ...authState, ...partial }
  notify()
}

const readCachedUser = () => {
  if (typeof window === 'undefined') return null
  const cached = window.localStorage.getItem(storageKey)
  if (!cached) return null
  try {
    const parsed = JSON.parse(cached) as User
    return parsed?.id ? parsed : null
  } catch {
    return null
  }
}

const writeCachedUser = (userData: User | null) => {
  if (typeof window === 'undefined') return
  if (userData) {
    window.localStorage.setItem(storageKey, JSON.stringify(userData))
  } else {
    window.localStorage.removeItem(storageKey)
  }
}

const fetchUserDetails = async (dataClient: ReturnType<typeof createClient>, email: string) => {
  const { data } = await dataClient
    .from('users')
    .select(
      `
      *,
      role:roles(*)
    `
    )
    .eq('email', email)
    .single()
  return data || null
}

const initAuth = async (dataClient: ReturnType<typeof createClient>) => {
  if (initPromise) return initPromise

  initPromise = (async () => {
    const cached = readCachedUser()
    if (cached && !authState.userData) {
      setAuthState({ userData: cached })
    }

    const { data: { session } } = await dataClient.auth.getSession()
    setAuthState({ user: session?.user ?? null })

    if (session?.user?.email) {
      const userDetails = await fetchUserDetails(dataClient, session.user.email)
      if (userDetails) {
        setAuthState({ userData: userDetails })
        writeCachedUser(userDetails)
      }
    }

    setAuthState({ loading: false })

    if (!authSubscription) {
      const { data } = dataClient.auth.onAuthStateChange((event, session) => {
        if (!session?.user) {
          setAuthState({ user: null, userData: null, loading: false })
          writeCachedUser(null)
          return
        }

        // Actualizamos el usuario sincrónicamente (está en el evento, sin red)
        setAuthState({ user: session.user })

        // IMPORTANTE: NO llamar a dataClient.from() directamente acá.
        // Hacer llamadas a la DB dentro de onAuthStateChange puede causar
        // deadlock con el auth lock cuando el token se acaba de refrescar.
        // Diferimos con setTimeout para salir del contexto del handler primero.
        if (session.user.email) {
          const emailSnapshot = session.user.email
          setTimeout(async () => {
            try {
              const userDetails = await fetchUserDetails(dataClient, emailSnapshot)
              if (userDetails) {
                setAuthState({ userData: userDetails })
                writeCachedUser(userDetails)
              }
            } catch {
              // Si falla, mantenemos el userData anterior en lugar de limpiar
            }
          }, 0)
        }
      })
      authSubscription = data.subscription
    }
  })().catch((error) => {
    console.error('Error initializing auth:', error)
    setAuthState({ loading: false })
  })

  return initPromise
}

export function useAuth() {
  const [state, setState] = useState<AuthState>(authState)
  const dataClient = createClient()

  const ensureUserData = useCallback(async () => {
    if (authState.userData) return authState.userData
    if (ensureUserDataPromise) return await ensureUserDataPromise

    const withTimeout = async <T,>(promise: Promise<T>, ms: number, label: string) => {
      let timeoutId: ReturnType<typeof setTimeout> | null = null
      const timeoutPromise = new Promise<T>((_resolve, reject) => {
        timeoutId = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
      })

      try {
        return await Promise.race([promise, timeoutPromise])
      } finally {
        if (timeoutId) clearTimeout(timeoutId)
      }
    }

    ensureUserDataPromise = (async () => {
      try {
        // Prefer reading the already-stored session first to avoid unnecessary refresh-token rotation.
        const { data: sessionData } = await dataClient.auth.getSession()
        let session = sessionData.session

        if (!session) {
          const { data: refreshData } = await withTimeout<any>(
            dataClient.auth.refreshSession(),
            8000,
            'dataClient.auth.refreshSession'
          )
          session = refreshData.session
        }

        const sessionUser = session?.user ?? null
        const email = sessionUser?.email
        if (!sessionUser || !email) {
          setAuthState({ user: null, userData: null, loading: false })
          writeCachedUser(null)
          return null
        }

        const userDetails = await fetchUserDetails(dataClient, email)
        if (userDetails) {
          setAuthState({ user: sessionUser, userData: userDetails, loading: false })
          writeCachedUser(userDetails)
          return userDetails
        }

        // Session exists but the user row couldn't be loaded. Don't block the UI indefinitely.
        setAuthState({ user: sessionUser, loading: false })
        return null
      } catch (error) {
        console.error('Error ensuring user data:', error)
        setAuthState({ loading: false })
        return authState.userData
      } finally {
        ensureUserDataPromise = null
      }
    })()

    return await ensureUserDataPromise
  }, [dataClient])

  const refreshUserData = useCallback(async () => {
    return await ensureUserData()
  }, [ensureUserData])

  useEffect(() => {
    const listener = () => setState(authState)
    listeners.add(listener)
    initAuth(dataClient)
    return () => {
      listeners.delete(listener)
    }
  }, [dataClient])

  useEffect(() => {
    const handleFocus = () => {
      refreshUserData()
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        handleFocus()
      }
    }

    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [refreshUserData])

  return { user: state.user, userData: state.userData, loading: state.loading, dataClient, refreshUserData, ensureUserData }
}

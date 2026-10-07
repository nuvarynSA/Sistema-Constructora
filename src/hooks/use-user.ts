'use client'

import { useAuth } from './use-auth'

export function useUser() {
  const { userData, loading } = useAuth()
  return { user: userData, loading }
}


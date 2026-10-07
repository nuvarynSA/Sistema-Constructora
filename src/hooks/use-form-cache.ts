import { useEffect, useRef } from 'react'

type SetValue<T> = (value: T | ((prev: T) => T)) => void

interface UseFormCacheOptions<T> {
  key: string
  value: T
  setValue: SetValue<T>
  enabled?: boolean
}

const safeParse = <T,>(raw: string): T | null => {
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export function useFormCache<T>({
  key,
  value,
  setValue,
  enabled = true,
}: UseFormCacheOptions<T>) {
  const hydratedRef = useRef(false)

  useEffect(() => {
    if (!enabled || hydratedRef.current) return
    if (typeof window === 'undefined') return
    const cached = safeParse<T>(window.localStorage.getItem(key) || '')
    if (cached) {
      setValue((prev) => ({ ...(prev as any), ...(cached as any) }))
    }
    hydratedRef.current = true
  }, [enabled, key, setValue])

  useEffect(() => {
    if (!enabled || !hydratedRef.current) return
    if (typeof window === 'undefined') return
    window.localStorage.setItem(key, JSON.stringify(value))
  }, [enabled, key, value])

  const clear = () => {
    if (typeof window === 'undefined') return
    window.localStorage.removeItem(key)
  }

  return { clear }
}

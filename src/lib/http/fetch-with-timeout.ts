export function createFetchWithTimeout(timeoutMs: number, baseFetch: typeof fetch = fetch): typeof fetch {
  if (timeoutMs <= 0) return baseFetch

  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const abortController = new AbortController()

    const onAbort = () => abortController.abort()
    if (init?.signal) {
      if (init.signal.aborted) {
        abortController.abort()
      } else {
        init.signal.addEventListener('abort', onAbort, { once: true })
      }
    }

    const timeoutId = setTimeout(() => abortController.abort(), timeoutMs)

    try {
      return await baseFetch(input, {
        ...init,
        signal: abortController.signal,
      })
    } finally {
      clearTimeout(timeoutId)
      if (init?.signal) {
        init.signal.removeEventListener('abort', onAbort)
      }
    }
  }
}


/* eslint-disable @typescript-eslint/no-explicit-any */
// MODO DEMO — se importa como efecto secundario desde el cliente de datos simulado.
// Intercepta fetch() para las rutas /api/* (y el "bucket" simulado) y responde en memoria.
import { handleApi, MOCK_API_HOSTS } from './mock-api'

declare global {
  interface Window { __nexoraMockInstalled?: boolean }
}

if (typeof window !== 'undefined' && !window.__nexoraMockInstalled) {
  window.__nexoraMockInstalled = true
  const realFetch = window.fetch.bind(window)

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
    const method = init?.method || (typeof input !== 'string' && !(input instanceof URL) ? input.method : 'GET') || 'GET'

    let isMock = false
    try {
      const u = new URL(url, window.location.origin)
      isMock = MOCK_API_HOSTS.includes(u.hostname) || (u.origin === window.location.origin && u.pathname.startsWith('/api/'))
    } catch { /* url inválida: dejar pasar */ }
    if (!isMock) return realFetch(input as any, init)

    await new Promise((r) => setTimeout(r, 120 + Math.random() * 180))
    const res = await handleApi(method, url, init?.body)
    if (!res) return realFetch(input as any, init)
    return new Response(JSON.stringify(res.body), { status: res.status, headers: { 'Content-Type': 'application/json' } })
  }

  // Prellena el email del login con el usuario demo
  try {
    if (!window.localStorage.getItem('nexora_email')) window.localStorage.setItem('nexora_email', 'admin@nexora.demo')
  } catch { /* noop */ }
}

export {}

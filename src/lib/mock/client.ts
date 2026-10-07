// Capa de datos de la demo: un cliente 100% en memoria (sin red ni base de datos).
import '@/lib/mock/install'
import { mockClient } from '@/lib/mock/mock-client'

export function createClient() {
  return mockClient as any
}

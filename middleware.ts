import { NextResponse } from 'next/server'

// Demo: no hay sesión de servidor; el acceso se simula en el navegador.
export function middleware() {
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}

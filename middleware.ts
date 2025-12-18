import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  // Middleware désactivé temporairement
  // Supabase JS utilise localStorage, pas les cookies
  // On gère l'auth directement dans les pages
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}

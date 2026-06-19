import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Single source of truth for admin email — must match lib/auth-helpers.ts
const OWNER_ADMIN_EMAIL = 'secondabenjamin.2000@gmail.com'

// Exact matches (e.g. '/' must not catch '/dashboard')
const PUBLIC_EXACT = new Set(['/', '/pricing'])
// Prefix matches — any path starting with these is public
const PUBLIC_PREFIX = [
  '/login', '/register',
  '/auth/callback',
  '/privacy', '/terms', '/security', '/support',
  '/deposit/success', '/deposit/cancel',
  '/api/auth', '/api/stripe/webhook', '/api/ui',
]

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  // Allow public paths
  const isPublic =
    PUBLIC_EXACT.has(pathname) ||
    PUBLIC_PREFIX.some(p => pathname.startsWith(p))
  if (isPublic) return supabaseResponse

  // Redirect unauthenticated users to login
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Protect /admin routes — email check is mandatory, no DB lookup required
  if (pathname.startsWith('/admin')) {
    const email = (user.email ?? '').toLowerCase()
    if (email !== OWNER_ADMIN_EMAIL) {
      // Authenticated non-owner → send to dashboard, not login
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}

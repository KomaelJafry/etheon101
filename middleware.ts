import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

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

  // Protect /admin routes — only admins
  if (pathname.startsWith('/admin')) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (!profile || profile.role !== 'admin') {
      return NextResponse.redirect(new URL('/login?error=admin_required', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}

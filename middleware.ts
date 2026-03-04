import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Map route prefixes to required role
const ROLE_ROUTES: Record<string, string> = {
  '/admin': 'ADMIN',
  '/coordinator': 'COORDINATOR',
  '/tenant': 'TENANT',
}

// Role → default landing page
const ROLE_HOME: Record<string, string> = {
  ADMIN: '/admin',
  COORDINATOR: '/coordinator',
  TENANT: '/tenant',
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // --- Auth-only routes: must be logged in ---
  const authRequiredPrefixes = ['/admin', '/coordinator', '/tenant', '/change-password']
  const needsAuth = authRequiredPrefixes.some((prefix) => pathname.startsWith(prefix))

  if (needsAuth && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // --- Role-based access control ---
  if (user) {
    // Check role-based routes
    for (const [prefix, requiredRole] of Object.entries(ROLE_ROUTES)) {
      if (pathname.startsWith(prefix)) {
        // Fetch user roles from profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('roles')
          .eq('id', user.id)
          .single()

        const roles: string[] = profile?.roles ?? []

        if (!roles.includes(requiredRole)) {
          // User doesn't have the required role — redirect to their correct home
          const firstRole = roles[0]
          const home = firstRole ? (ROLE_HOME[firstRole] ?? '/login') : '/login'
          return NextResponse.redirect(new URL(home, request.url))
        }
        break
      }
    }

    // If logged-in user hits auth pages, redirect to their dashboard
    if (pathname.startsWith('/auth/login') || pathname.startsWith('/auth/signup')) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('roles')
        .eq('id', user.id)
        .single()

      const firstRole = (profile?.roles as string[])?.[0]
      const home = firstRole ? (ROLE_HOME[firstRole] ?? '/login') : '/login'
      return NextResponse.redirect(new URL(home, request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    '/dashboard',
    '/auth/:path*',
    '/admin/:path*',
    '/coordinator/:path*',
    '/tenant/:path*',
    '/change-password',
  ],
}

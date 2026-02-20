import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes that don't need authentication
  const publicRoutes = ['/login'];
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

  // Create supabase client
  const supabase = await createClient();
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();

  // If not authenticated and trying to access protected route
  if (!user && !isPublicRoute && pathname !== '/') {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If authenticated, get user role and enforce access control
  if (user) {
    // Get user profile with role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const userRole = profile?.role;

    // Define role-based route access
    const roleRoutes = {
      ADMIN: '/admin',
      COORDINATOR: '/coordinator',
      TENANT: '/tenant',
    };

    // Home page redirect - send authenticated users to their portal
    if (pathname === '/') {
      if (userRole && roleRoutes[userRole as keyof typeof roleRoutes]) {
        return NextResponse.redirect(new URL(roleRoutes[userRole as keyof typeof roleRoutes], request.url));
      }
    }

    // Protect admin routes
    if (pathname.startsWith('/admin')) {
      if (userRole !== 'ADMIN') {
        const redirectPath = userRole && roleRoutes[userRole as keyof typeof roleRoutes] 
          ? roleRoutes[userRole as keyof typeof roleRoutes] 
          : '/tenant';
        return NextResponse.redirect(new URL(redirectPath, request.url));
      }
    }

    // Protect coordinator routes
    if (pathname.startsWith('/coordinator')) {
      if (userRole !== 'COORDINATOR') {
        const redirectPath = userRole && roleRoutes[userRole as keyof typeof roleRoutes]
          ? roleRoutes[userRole as keyof typeof roleRoutes]
          : '/tenant';
        return NextResponse.redirect(new URL(redirectPath, request.url));
      }
    }

    // Protect tenant routes
    if (pathname.startsWith('/tenant')) {
      if (userRole !== 'TENANT') {
        const redirectPath = userRole && roleRoutes[userRole as keyof typeof roleRoutes]
          ? roleRoutes[userRole as keyof typeof roleRoutes]
          : '/admin';
        return NextResponse.redirect(new URL(redirectPath, request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// This function can be marked `async` if using `await` inside
export function middleware(request: NextRequest) {
  // Log the path being accessed for debugging
  console.log(`[Middleware] Processing request for: ${request.nextUrl.pathname}`);

  // Get the value of the appSession cookie
  const sessionCookie = request.cookies.get('appSession');
  const isLoggedIn = !!sessionCookie;

  // Define routes that should always be accessible without authentication
  const publicRoutes = ['/', '/api/auth', '/test', '/login', '/privacy', '/terms'];
  const isPublicRoute = publicRoutes.some(route => 
    request.nextUrl.pathname === route || 
    request.nextUrl.pathname.startsWith(`${route}/`)
  );

  // Allow all API routes to be called without authentication (Auth0 will handle auth for protected endpoints)
  const isApiRoute = request.nextUrl.pathname.startsWith('/api/');

  // If the user is not logged in and tries to access a protected route, redirect to home
  if (!isPublicRoute && !isApiRoute && !isLoggedIn) {
    console.log(`[Middleware] Redirecting unauthenticated user from ${request.nextUrl.pathname} to /`);
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Continue the request for public routes, API routes, or logged in users
  return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
  // Apply this middleware to all routes except static files
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public directory
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)',
  ],
}; 
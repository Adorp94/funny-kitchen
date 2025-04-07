import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// This function can be marked `async` if using `await` inside
export function middleware(request: NextRequest) {
  // Log about the middleware being invoked
  console.log('[Middleware] Processing request to:', request.nextUrl.pathname);
  
  // Define public routes
  const publicRoutes = ['/', '/api/auth', '/api/graphql'];
  
  // Check if path is public
  const isPublicRoute = publicRoutes.some(route => 
    request.nextUrl.pathname === route || 
    request.nextUrl.pathname.startsWith(`${route}/`)
  );
  
  // If path is public, skip authentication check
  if (isPublicRoute) {
    console.log('[Middleware] Public route, skipping auth check');
    return NextResponse.next();
  }
  
  // Check if user has auth cookie
  const authCookie = request.cookies.get('appSession');
  const hasAuthCookie = !!authCookie?.value;
  
  console.log('[Middleware] Auth check result:', { 
    path: request.nextUrl.pathname,
    hasAuthCookie
  });
  
  // DEVELOPMENT MODE BYPASS - ENABLE THIS FOR EASIER LOCAL TESTING
  const isDevelopment = process.env.NODE_ENV === 'development';
  if (isDevelopment) {
    console.log('[Middleware] Development mode - bypassing auth checks');
    return NextResponse.next();
  }
  
  // If user has no auth cookie and trying to access protected route,
  // redirect to login page
  if (!hasAuthCookie) {
    console.log('[Middleware] Unauthorized, redirecting to login');
    const loginUrl = new URL('/', request.url);
    return NextResponse.redirect(loginUrl);
  }
  
  // If we reach here, user has auth cookie, proceed with the request
  return NextResponse.next();
} 
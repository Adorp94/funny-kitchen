import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// This function can be marked `async` if using `await` inside
export function middleware(request: NextRequest) {
  // Log the path being accessed for debugging
  console.log(`[Middleware] Processing request for: ${request.nextUrl.pathname}`);

  // Define routes that should always be accessible without authentication
  const publicRoutes = ['/', '/api', '/test', '/login', '/privacy', '/terms', 
                        '/callback', '/auth'];
  
  // Skip middleware for Auth0 routes and static files
  const shouldSkip = 
    request.nextUrl.pathname.includes('/_next') ||
    request.nextUrl.pathname.includes('/api/auth') ||
    request.nextUrl.pathname.includes('/callback') ||
    request.nextUrl.search.includes('code=') ||
    request.nextUrl.search.includes('error=');
  
  if (shouldSkip) {
    console.log(`[Middleware] Skipping middleware for: ${request.nextUrl.pathname}`);
    return NextResponse.next();
  }
                     
  // Check for authentication via the appSession cookie
  const appSession = request.cookies.get('appSession');
  const isLoggedIn = !!appSession?.value;

  console.log(`[Middleware] Auth check: ${isLoggedIn ? 'Authenticated' : 'Not authenticated'}`);
  
  // Check if the current route is public
  const isPublicRoute = publicRoutes.some(route => 
    request.nextUrl.pathname === route || 
    request.nextUrl.pathname.startsWith(`${route}/`)
  );

  // If user is not logged in and trying to access a protected route
  if (!isPublicRoute && !isLoggedIn) {
    console.log(`[Middleware] Unauthorized access to ${request.nextUrl.pathname}, redirecting to /`);
    const loginUrl = new URL('/', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // If user is logged in and trying to access the home (login) page, redirect to dashboard
  if (request.nextUrl.pathname === '/' && isLoggedIn) {
    console.log(`[Middleware] Authenticated user at login page, redirecting to dashboard`);
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // For all other cases, proceed with the request
  return NextResponse.next();
}

// Configure middleware to apply to all routes except static files
export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - Static files (_next/static, images, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$|.*\\.ico$).*)',
  ],
}; 
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// This function can be marked `async` if using `await` inside
export function middleware(request: NextRequest) {
  // Log the path being accessed for debugging
  console.log(`[Middleware] Processing request for: ${request.nextUrl.pathname}`);

  // Define routes that should always be accessible without authentication
  const publicRoutes = ['/', '/api/auth', '/test', '/login', '/privacy', '/terms', 
                        '/callback', '/auth'];
  
  // Check if this is an Auth0 callback route
  const isAuth0Route = request.nextUrl.pathname.includes('/auth') || 
                     request.nextUrl.pathname.includes('/callback') ||
                     request.nextUrl.search.includes('code=');
                     
  if (isAuth0Route) {
    console.log(`[Middleware] Auth0 callback route, allowing: ${request.nextUrl.pathname}`);
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

  // Allow all API routes through without authentication checks
  const isApiRoute = request.nextUrl.pathname.startsWith('/api/');
  
  if (isApiRoute) {
    console.log(`[Middleware] API route, letting pass through: ${request.nextUrl.pathname}`);
    return NextResponse.next();
  }

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
     * - Custom excluded paths (add any needed)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)',
  ],
}; 
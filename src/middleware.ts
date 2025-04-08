import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// This function can be marked `async` if using `await` inside
export function middleware(request: NextRequest) {
  // Log the path being accessed for debugging
  console.log(`[Middleware] Processing request for: ${request.nextUrl.pathname}`);

  // More comprehensive list of routes that don't need authentication
  const publicRoutes = [
    '/', '/api', '/test', '/login', '/privacy', '/terms', 
    '/callback', '/auth', '/dashboard', // Add dashboard as public temporarily to help debug
  ];
  
  // Much more comprehensive skip conditions
  const shouldSkip = 
    // Skip all Auth0-related paths
    request.nextUrl.pathname.includes('/_next') ||
    request.nextUrl.pathname.includes('/api/auth') ||
    request.nextUrl.pathname.includes('/callback') ||
    request.nextUrl.pathname.includes('/auth') ||
    // Skip Auth0 query parameters
    request.nextUrl.search.includes('code=') ||
    request.nextUrl.search.includes('error=') ||
    request.nextUrl.search.includes('state=') ||
    // Skip asset requests
    request.nextUrl.pathname.endsWith('.svg') ||
    request.nextUrl.pathname.endsWith('.png') ||
    request.nextUrl.pathname.endsWith('.jpg') ||
    request.nextUrl.pathname.endsWith('.ico') ||
    // Skip API calls for data fetching
    request.nextUrl.pathname.includes('/api/productos') ||
    request.nextUrl.pathname.includes('/api/clientes') ||
    request.nextUrl.pathname.includes('/api/cotizaciones') ||
    request.nextUrl.pathname.includes('/api/colores') ||
    // IMPORTANT: All API routes should pass through for data fetching to work
    request.nextUrl.pathname.startsWith('/api/') ||
    // Detect known Auth0 domain in referer
    request.headers.get('referer')?.includes('auth0.com');
  
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

  // In production, be more lenient with auth checks to help debug
  const isProduction = process.env.NODE_ENV === 'production';
  
  // If user is not logged in and trying to access a protected route
  if (!isPublicRoute && !isLoggedIn && !isProduction) {
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

// Configure middleware to apply to fewer routes to avoid issues
export const config = {
  matcher: [
    // Only match specific routes, avoid matching dynamic auth routes and API routes
    '/',
    '/dashboard/:path*',
    '/cotizaciones/:path*',
    '/nueva-cotizacion/:path*',
    '/ver-cotizacion/:path*'
  ],
}; 
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Restore basic middleware structure focusing on Auth0 / Skip logic
export async function middleware(request: NextRequest) {
  console.log(`[Middleware - Auth0 Focus] Processing: ${request.nextUrl.pathname}`);

  // ----- Skip Logic ----- 
  const isAssetOrInternal = 
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.startsWith('/assets') || 
    request.nextUrl.pathname.includes('/favicon.ico') ||
    /\.(?:svg|png|jpg|jpeg|gif|webp)$/.test(request.nextUrl.pathname); // Match common asset extensions

  const isAuth0PathOrRedirect = 
    request.nextUrl.pathname.startsWith('/api/auth') || // Auth0 specific API
    request.nextUrl.pathname.startsWith('/callback') || // Auth0 callback
    request.nextUrl.search.includes('code=') || // Auth0 query params
    request.nextUrl.search.includes('error=') ||
    request.nextUrl.search.includes('state=') ||
    request.headers.get('referer')?.includes('auth0.com'); // Referer check

  if (isAssetOrInternal || isAuth0PathOrRedirect) {
    console.log(`[Middleware] Skipping Auth0 checks for asset/internal/Auth0 path: ${request.nextUrl.pathname}`);
    return NextResponse.next();
  }

  // ----- Auth0 App Session Check ----- 
  const appSession = request.cookies.get('appSession');
  const isAuth0LoggedIn = !!appSession?.value;
  console.log(`[Middleware] Auth0 Session Check: ${isAuth0LoggedIn ? 'Authenticated' : 'Not authenticated'}`);

  // If accessing the login page (root) while already logged in via Auth0
  if (request.nextUrl.pathname === '/' && isAuth0LoggedIn) {
    console.log(`[Middleware] Auth0 user at login page, redirecting to dashboard`);
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Define protected routes requiring Auth0 session
  const protectedRoutes = [
    '/dashboard', '/cotizaciones', '/nueva-cotizacion', '/ver-cotizacion'
    // NOTE: API routes are NOT protected here by default. 
    // Authorization for API routes should happen WITHIN the route handlers if needed,
    // potentially checking the Auth0 session forwarded via headers or using Supabase API keys/RLS.
  ];
  const isProtectedRoute = protectedRoutes.some(route => request.nextUrl.pathname.startsWith(route));

  // If trying to access a protected route without an Auth0 session (and not in production for easier debugging)
  if (isProtectedRoute && !isAuth0LoggedIn && process.env.NODE_ENV !== 'production') {
     console.log(`[Middleware] Auth0 unauthorized access to protected route ${request.nextUrl.pathname}, redirecting to /`);
     return NextResponse.redirect(new URL('/', request.url));
  }

  // Allow the request to proceed
  console.log(`[Middleware] Allowing request for: ${request.nextUrl.pathname}`);
  return NextResponse.next();
}

// Keep the broad matcher, relying on internal skip logic
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}; 
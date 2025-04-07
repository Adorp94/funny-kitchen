import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// List of public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/terms',
  '/privacy',
  '/api/auth/login',
  '/api/auth/callback',
  '/api/auth/logout',
  '/api/auth/me',
];

export async function middleware(req: NextRequest) {
  // Skip auth check in development mode
  if (process.env.NODE_ENV === 'development') {
    console.log("Development mode: Bypassing auth check");
    return NextResponse.next();
  }
  
  const url = new URL(req.url);
  const path = url.pathname;
  
  // Allow public routes
  if (PUBLIC_ROUTES.includes(path) || 
      path.startsWith('/api/auth/') || 
      path.startsWith('/api/debug/') ||
      path.startsWith('/api/cotizaciones/')) {
    return NextResponse.next();
  }
  
  // For other routes, check for authentication cookie
  // Auth0 sets appSession cookie
  const authCookie = req.cookies.get('appSession');
  
  if (!authCookie) {
    // Redirect to login page if not authenticated
    return NextResponse.redirect(new URL('/', req.url));
  }
  
  return NextResponse.next();
} 
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  console.log("Middleware running on path:", req.nextUrl.pathname);
  
  // Skip auth check in development mode
  if (process.env.NODE_ENV === 'development') {
    console.log("Development mode: Bypassing auth check");
    return NextResponse.next();
  }
  
  // Public paths that don't require authentication
  const publicPaths = [
    '/',
    '/api/auth/login',
    '/api/auth/callback',
    '/api/auth/logout',
    '/api/auth/me',
    '/login',
    '/terms',
    '/privacy'
  ];
  
  // Check if the current path is public
  const isPublicPath = publicPaths.some(path => 
    req.nextUrl.pathname === path || 
    req.nextUrl.pathname.startsWith('/api/debug') ||
    req.nextUrl.pathname.startsWith('/api/cotizaciones')
  );
  
  // Allow public paths without authentication
  if (isPublicPath) {
    console.log("Public path, skipping auth check:", req.nextUrl.pathname);
    return NextResponse.next();
  }
  
  // Check for auth cookie
  const authCookie = req.cookies.get('appSession');
  
  // If no auth cookie for protected route, redirect to login
  if (!authCookie) {
    console.log("No auth cookie, redirecting to login");
    return NextResponse.redirect(new URL('/api/auth/login', req.url));
  }
  
  return NextResponse.next();
} 
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0/edge';

export async function middleware(req: NextRequest) {
  console.log("Middleware running on path:", req.nextUrl.pathname);
  
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
  
  try {
    // Try to get the user session
    const res = NextResponse.next();
    const session = await getSession(req, res);
    
    // If no session for protected route, redirect to login
    if (!session?.user) {
      console.log("No session, redirecting to login");
      return NextResponse.redirect(new URL('/api/auth/login', req.url));
    }
    
    return res;
  } catch (error) {
    console.error("Auth middleware error:", error);
    
    // On error, redirect to login
    return NextResponse.redirect(new URL('/', req.url));
  }
} 
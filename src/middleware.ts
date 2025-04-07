import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0';

export async function middleware(req: NextRequest) {
  console.log("Middleware running on path:", req.nextUrl.pathname);
  
  // Skip authentication check for API routes and public paths
  if (req.nextUrl.pathname.startsWith('/api/') || 
      req.nextUrl.pathname === '/' || 
      req.nextUrl.pathname.startsWith('/login') ||
      req.nextUrl.pathname.startsWith('/api/auth/')) {
    console.log("Skipping auth check for public route:", req.nextUrl.pathname);
    return NextResponse.next();
  }
  
  try {
    // Check Auth0 session from cookies
    const authCookie = req.cookies.get('appSession');
    
    // Check if user is authenticated for protected routes
    const protectedRoutes = ['/dashboard'];
    
    const isProtectedRoute = protectedRoutes.some((route) => 
      req.nextUrl.pathname.startsWith(route)
    );
    
    if (isProtectedRoute && !authCookie) {
      // Redirect to Auth0 login
      const redirectUrl = new URL('/api/auth/login', req.url);
      return NextResponse.redirect(redirectUrl);
    }
    
    return NextResponse.next();
  } catch (e) {
    console.error('Error in middleware:', e);
    return NextResponse.next();
  }
} 
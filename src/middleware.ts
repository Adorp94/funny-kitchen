import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  console.log("Middleware running on path:", req.nextUrl.pathname);
  
  // Skip authentication check for API routes in development
  if (process.env.NODE_ENV === 'development' && req.nextUrl.pathname.startsWith('/api/')) {
    console.log("Development mode: Skipping authentication check for API route");
    return NextResponse.next();
  }
  
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    
    // Check if user is authenticated for protected routes
    const protectedRoutes = ['/dashboard'];
    
    const isProtectedRoute = protectedRoutes.some((route) => 
      req.nextUrl.pathname.startsWith(route)
    );
    
    if (isProtectedRoute && !session) {
      // Redirect to the root path (/) instead of /login
      const redirectUrl = new URL('/', req.url);
      return NextResponse.redirect(redirectUrl);
    }
    
    return res;
  } catch (e) {
    console.error('Error in middleware:', e);
    return res;
  }
} 
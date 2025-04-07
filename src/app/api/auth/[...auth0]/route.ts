import { NextRequest, NextResponse } from 'next/server';
import { getSession, handleAuth as createHandleAuth } from '@auth0/nextjs-auth0';

const handler = createHandleAuth();

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const path = url.pathname;
    
    if (path.endsWith('/login')) {
      // Handle login
      const searchParams = url.searchParams;
      const returnTo = searchParams.get('returnTo') || '/dashboard';
      
      const res = await handler.login(req, {
        returnTo,
      });
      return res;
    }
    
    if (path.endsWith('/callback')) {
      // Handle callback from Auth0
      const res = await handler.callback(req);
      return res;
    }
    
    if (path.endsWith('/logout')) {
      // Handle logout
      const res = await handler.logout(req);
      return res;
    }
    
    if (path.endsWith('/me')) {
      // Get user profile
      const res = await handler.profile(req);
      return res;
    }
    
    // Default: redirect to login
    return NextResponse.redirect(new URL('/api/auth/login', req.url));
    
  } catch (error) {
    console.error('Auth0 API error:', error);
    return NextResponse.json(
      { error: 'Authentication error' },
      { status: 500 }
    );
  }
} 
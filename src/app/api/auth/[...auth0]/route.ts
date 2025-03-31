import { NextRequest, NextResponse } from 'next/server';
import { AuthClient } from '@auth0/nextjs-auth0/server';

// Create a simple Auth0 client
const auth0 = new AuthClient({
  routes: {
    login: { returnTo: '/dashboard' },
    callback: { defaultReturnTo: '/dashboard' },
    logout: { returnTo: '/' }
  }
});

export async function GET(req: NextRequest) {
  const { pathname } = new URL(req.url);
  
  try {
    if (pathname.endsWith('/login')) {
      return auth0.login(req);
    }
    if (pathname.endsWith('/callback')) {
      return auth0.callback(req);
    }
    if (pathname.endsWith('/logout')) {
      return auth0.logout(req);
    }
    if (pathname.endsWith('/me')) {
      return auth0.profile(req);
    }
    
    // Default: redirect to login
    return auth0.login(req);
  } catch (error) {
    console.error('Auth0 API error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
} 
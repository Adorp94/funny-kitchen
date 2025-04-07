import { NextRequest, NextResponse } from 'next/server';
import { handleAuth, handleLogin, handleCallback, handleLogout, handleProfile } from '@auth0/nextjs-auth0';

// Create handler for Auth0 endpoints
export const GET = handleAuth({
  login: handleLogin({
    returnTo: '/dashboard',
  }),
  callback: handleCallback({
    redirectUri: process.env.AUTH0_BASE_URL + '/api/auth/callback',
    defaultReturnTo: '/dashboard',
  }),
  logout: handleLogout({
    returnTo: '/',
  }),
  profile: handleProfile(),
  onError: (error, req) => {
    console.error("Auth0 error:", error);
    return NextResponse.json(
      { error: 'Authentication error: ' + error.message },
      { status: 500 }
    );
  }
}); 
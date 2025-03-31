import { handleAuth } from '@auth0/nextjs-auth0';
import { NextRequest } from 'next/server';

// Create handlers for each auth route
const handler = handleAuth();

export const GET = async (req: NextRequest) => {
  const { pathname } = new URL(req.url);
  
  // Route to the appropriate handler based on the pathname
  if (pathname.endsWith('/login')) {
    return handler.login(req);
  }
  if (pathname.endsWith('/callback')) {
    return handler.callback(req);
  }
  if (pathname.endsWith('/logout')) {
    return handler.logout(req);
  }
  if (pathname.endsWith('/me')) {
    return handler.profile(req);
  }
  
  // Default handler for other routes
  return handler.login(req);
}; 
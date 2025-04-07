import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  console.log("[Auth Callback] Called with URL:", request.url);
  
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state') || '/dashboard';
  
  if (!code) {
    console.error("[Auth Callback] No code in callback");
    return NextResponse.redirect(new URL('/', url.origin));
  }
  
  try {
    // Log success
    console.log("[Auth Callback] Received Auth0 callback with code, redirecting to:", state);
    
    // Set a temporary cookie to indicate successful callback
    const response = NextResponse.redirect(new URL(state, url.origin));
    response.cookies.set('auth_callback_processed', 'true', {
      maxAge: 60, // 1 minute
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });
    
    return response;
  } catch (error) {
    console.error("[Auth Callback] Error processing callback:", error);
    return NextResponse.redirect(new URL('/?error=callback_failed', url.origin));
  }
} 
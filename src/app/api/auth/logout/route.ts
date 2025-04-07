import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  console.log("[Auth Logout] Called with URL:", request.url);
  
  const url = new URL(request.url);
  const origin = url.origin;
  
  try {
    // Extract Auth0 configuration from environment variables
    const auth0Domain = process.env.NEXT_PUBLIC_AUTH0_DOMAIN || "dev-av1unzc74ll0psau.us.auth0.com";
    const auth0ClientId = process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID || "y3zkQqmOiFGAV3OzU4bF5LIl631V6Jxb";
    const auth0RedirectUri = origin;
    
    // Log the logout operation
    console.log("[Auth Logout] Processing logout request");
    
    // Clear the session cookie - setting maxAge to 0 or expires in the past
    const isProduction = process.env.NODE_ENV === 'production';
    
    // Create the Auth0 logout URL
    const logoutUrl = new URL(`https://${auth0Domain}/v2/logout`);
    logoutUrl.searchParams.append('client_id', auth0ClientId);
    logoutUrl.searchParams.append('returnTo', auth0RedirectUri);
    
    console.log("[Auth Logout] Redirecting to Auth0 logout:", logoutUrl.toString());
    
    // Create response with redirect and cookie clearing
    const response = NextResponse.redirect(logoutUrl.toString());
    
    // Clear cookies
    response.cookies.set('appSession', '', { 
      maxAge: 0,
      path: '/',
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' as const : 'lax' as const
    });
    
    response.cookies.set('auth_callback_processed', '', { 
      maxAge: 0,
      path: '/',
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' as const : 'lax' as const
    });
    
    return response;
  } catch (error) {
    console.error("[Auth Logout] Error processing logout:", error);
    return NextResponse.redirect(new URL('/', origin));
  }
} 
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  console.log("[Auth Callback] Called with URL:", request.url);
  
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state') || '/dashboard';
  const error = url.searchParams.get('error');
  const errorDescription = url.searchParams.get('error_description');
  
  if (error) {
    console.error(`[Auth Callback] Auth0 returned error: ${error}`, errorDescription);
    return NextResponse.redirect(new URL(`/?error=${encodeURIComponent(error)}&error_description=${encodeURIComponent(errorDescription || '')}`, url.origin));
  }
  
  if (!code) {
    console.error("[Auth Callback] No code in callback");
    return NextResponse.redirect(new URL('/?error=no_code', url.origin));
  }
  
  try {
    // Extract Auth0 configuration from environment variables
    const auth0Domain = process.env.NEXT_PUBLIC_AUTH0_DOMAIN || "dev-av1unzc74ll0psau.us.auth0.com";
    const auth0ClientId = process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID || "y3zkQqmOiFGAV3OzU4bF5LIl631V6Jxb";
    const auth0ClientSecret = process.env.AUTH0_CLIENT_SECRET || "u_fwS3g2q1m_6Rl5nDxILy-VLckNbIG2TbMHT_SL8psibDt96v33lfA7a9CYSKN2";
    const auth0RedirectUri = `${url.origin}/api/auth/callback`;
    
    console.log("[Auth Callback] Using configuration:", { 
      domain: auth0Domain, 
      clientId: auth0ClientId,
      redirectUri: auth0RedirectUri,
      secretLength: auth0ClientSecret ? auth0ClientSecret.length : 0
    });
    
    // Exchange code for token
    const tokenUrl = `https://${auth0Domain}/oauth/token`;
    console.log("[Auth Callback] Exchanging code for token at:", tokenUrl);
    
    const tokenRequestBody = {
      grant_type: 'authorization_code',
      client_id: auth0ClientId,
      client_secret: auth0ClientSecret,
      code,
      redirect_uri: auth0RedirectUri
    };
    
    console.log("[Auth Callback] Token request payload (excluding secret):", {
      ...tokenRequestBody,
      client_secret: tokenRequestBody.client_secret ? "REDACTED" : "MISSING"
    });
    
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tokenRequestBody)
    });
    
    console.log("[Auth Callback] Token response status:", tokenResponse.status);
    
    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      let parsedError;
      try {
        parsedError = JSON.parse(errorData);
      } catch (e) {
        parsedError = { error: 'unknown_error', error_description: errorData };
      }
      
      console.error('[Auth Callback] Token exchange failed:', {
        status: tokenResponse.status,
        error: parsedError
      });
      
      // Redirect with detailed error information
      const errorParams = new URLSearchParams({
        error: parsedError.error || 'token_exchange_failed',
        error_description: parsedError.error_description || `Status: ${tokenResponse.status}`,
        error_detail: JSON.stringify(parsedError)
      });
      
      return NextResponse.redirect(new URL(`/?${errorParams.toString()}`, url.origin));
    }
    
    const tokenData = await tokenResponse.json();
    console.log("[Auth Callback] Token received successfully:", {
      access_token_present: !!tokenData.access_token,
      id_token_present: !!tokenData.id_token,
      refresh_token_present: !!tokenData.refresh_token,
      expires_in: tokenData.expires_in
    });
    
    // Set a secure session cookie
    const maxAge = 7 * 24 * 60 * 60; // 1 week in seconds
    const tokenValue = JSON.stringify({
      access_token: tokenData.access_token,
      id_token: tokenData.id_token,
      refresh_token: tokenData.refresh_token,
      expires_at: Date.now() + (tokenData.expires_in * 1000)
    });
    const encodedToken = Buffer.from(tokenValue).toString('base64');
    
    // Configure cookie security based on environment
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = {
      maxAge,
      path: '/',
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' as const : 'lax' as const
    };
    
    console.log("[Auth Callback] Setting cookies with options:", {
      ...cookieOptions,
      isProduction,
      tokenLength: encodedToken.length
    });
    
    // Create response with redirect and cookie
    const response = NextResponse.redirect(new URL(state, url.origin));
    response.cookies.set('appSession', encodedToken, cookieOptions);
    response.cookies.set('auth_callback_processed', 'true', { ...cookieOptions, maxAge: 60 });
    
    console.log("[Auth Callback] Redirecting to:", state);
    return response;
  } catch (error) {
    console.error("[Auth Callback] Error processing callback:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';
    
    return NextResponse.redirect(
      new URL(`/?error=callback_processing_failed&error_description=${encodeURIComponent(errorMessage)}&stack=${encodeURIComponent(errorStack)}`, url.origin)
    );
  }
} 
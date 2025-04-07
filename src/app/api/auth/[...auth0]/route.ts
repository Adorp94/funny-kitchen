export async function GET(request: Request) {
  const url = new URL(request.url);
  const path = url.pathname;
  const origin = url.origin;
  
  console.log("[Auth API] Route called:", { path, origin, searchParams: Object.fromEntries(url.searchParams) });
  
  // Extract Auth0 configuration from environment variables
  const auth0Domain = process.env.AUTH0_ISSUER_BASE_URL?.replace('https://', '') || 'dev-av1unzc74ll0psau.us.auth0.com';
  const auth0ClientId = process.env.AUTH0_CLIENT_ID || 'y3zkQqmOiFGAV3OzU4bF5LIl631V6Jxb';
  const auth0ClientSecret = process.env.AUTH0_CLIENT_SECRET || 'u_fwS3g2q1m_6Rl5nDxILy-VLckNbIG2TbMHT_SL8psibDt96v33lfA7a9CYSKN2';
  const auth0RedirectUri = `${origin}/api/auth/callback`;
  const auth0PostLogoutRedirectUri = origin;
  
  const returnTo = url.searchParams.get('returnTo') || '/dashboard';
  const connection = url.searchParams.get('connection') || '';
  
  // Handle login route
  if (path.endsWith('/login')) {
    console.log("[Auth API] Processing login request with returnTo:", returnTo);
    const loginUrl = new URL(`https://${auth0Domain}/authorize`);
    loginUrl.searchParams.append('client_id', auth0ClientId);
    loginUrl.searchParams.append('redirect_uri', auth0RedirectUri);
    loginUrl.searchParams.append('response_type', 'code');
    loginUrl.searchParams.append('scope', 'openid profile email');
    loginUrl.searchParams.append('state', returnTo);
    
    // Add connection parameter for social logins if specified
    if (connection) {
      console.log(`[Auth API] Using connection: ${connection}`);
      loginUrl.searchParams.append('connection', connection);
    }
    
    console.log("[Auth API] Redirecting to Auth0 login:", loginUrl.toString());
    return Response.redirect(loginUrl.toString());
  }
  
  // Handle callback route
  if (path.endsWith('/callback')) {
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state') || '/dashboard';
    
    console.log("[Auth API] Callback received:", { code: !!code, state });
    
    if (!code) {
      console.error("[Auth API] No code in callback");
      return Response.redirect(new URL('/', origin).toString());
    }
    
    try {
      // Exchange code for token
      const tokenUrl = `https://${auth0Domain}/oauth/token`;
      console.log("[Auth API] Exchanging code for token at:", tokenUrl);
      
      // Create token request payload
      const tokenRequestBody = {
        grant_type: 'authorization_code',
        client_id: auth0ClientId,
        client_secret: auth0ClientSecret,
        code,
        redirect_uri: auth0RedirectUri
      };
      
      console.log("[Auth API] Token request payload:", tokenRequestBody);
      
      const tokenResponse = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tokenRequestBody)
      });
      
      console.log("[Auth API] Token response status:", tokenResponse.status);
      
      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error('[Auth API] Token exchange error:', tokenResponse.status, errorText);
        throw new Error(`Failed to exchange code for token: ${errorText}`);
      }
      
      const tokenData = await tokenResponse.json();
      console.log("[Auth API] Token received successfully:", {
        access_token_present: !!tokenData.access_token,
        access_token_length: tokenData.access_token ? tokenData.access_token.length : 0,
        id_token_present: !!tokenData.id_token,
        id_token_length: tokenData.id_token ? tokenData.id_token.length : 0,
        token_type: tokenData.token_type,
        expires_in: tokenData.expires_in
      });
      
      // Set the session cookie with a long expiration (1 week)
      const maxAge = 7 * 24 * 60 * 60; // 1 week in seconds
      
      // Create a combined token to store both access_token and id_token
      const combinedToken = JSON.stringify({
        access_token: tokenData.access_token,
        id_token: tokenData.id_token
      });
      
      // Use Base64 encoding for the cookie value to handle special characters
      const encodedToken = Buffer.from(combinedToken).toString('base64');
      console.log("[Auth API] Token encoded successfully, length:", encodedToken.length);
      
      // Set secure cookie options based on environment
      const isProduction = process.env.NODE_ENV === 'production';
      const cookieValue = `appSession=${encodedToken}; Path=/; HttpOnly; Max-Age=${maxAge}; SameSite=${isProduction ? 'None' : 'Lax'}${isProduction ? '; Secure' : ''}`;
      console.log("[Auth API] Cookie settings:", { 
        isProduction, 
        maxAge, 
        sameSite: isProduction ? 'None' : 'Lax',
        secure: isProduction
      });
      
      // Create absolute URL for redirect
      const redirectUrl = new URL(state.startsWith('/') ? state : `/${state}`, origin);
      console.log("[Auth API] Redirecting after auth to:", redirectUrl.toString());
      
      // Return a response with both redirect and cookie
      return new Response(null, {
        status: 302,
        headers: {
          'Location': redirectUrl.toString(),
          'Set-Cookie': cookieValue
        }
      });
    } catch (error) {
      console.error('[Auth API] Callback error:', error);
      return Response.redirect(new URL('/', origin).toString());
    }
  }
  
  // Handle logout route
  if (path.endsWith('/logout')) {
    const logoutUrl = new URL(`https://${auth0Domain}/v2/logout`);
    logoutUrl.searchParams.append('client_id', auth0ClientId);
    logoutUrl.searchParams.append('returnTo', auth0PostLogoutRedirectUri);
    
    // Clear the session cookie - use same settings as when setting for consistency
    const isProduction = process.env.NODE_ENV === 'production';
    const clearCookie = `appSession=; Path=/; HttpOnly; Max-Age=0; SameSite=${isProduction ? 'None' : 'Lax'}${isProduction ? '; Secure' : ''}`;
    
    console.log("[Auth API] Logging out, redirecting to:", logoutUrl.toString());
    return new Response(null, {
      status: 302,
      headers: {
        'Location': logoutUrl.toString(),
        'Set-Cookie': clearCookie
      }
    });
  }
  
  // Handle user profile route
  if (path.endsWith('/me')) {
    const cookies = request.headers.get('cookie') || '';
    const sessionCookie = cookies.split(';').find(c => c.trim().startsWith('appSession='));
    const encodedToken = sessionCookie?.split('=')[1];
    
    console.log("[Auth API] Cookie check result:", { 
      cookiesPresent: cookies.length > 0,
      sessionCookieFound: !!sessionCookie,
      encodedTokenLength: encodedToken?.length
    });
    
    if (!encodedToken) {
      console.log("[Auth API] No auth token found in cookies");
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    try {
      // Decode the Base64 encoded combined token
      const combinedToken = JSON.parse(Buffer.from(encodedToken, 'base64').toString());
      const { access_token, id_token } = combinedToken;
      
      console.log("[Auth API] Decoded token:", {
        access_token_present: !!access_token,
        id_token_present: !!id_token
      });
      
      if (!access_token) {
        throw new Error('No access token in cookie');
      }
      
      // Get user info from Auth0
      const userInfoUrl = `https://${auth0Domain}/userinfo`;
      const userInfoResponse = await fetch(userInfoUrl, {
        headers: { Authorization: `Bearer ${access_token}` }
      });
      
      console.log("[Auth API] User info API response status:", userInfoResponse.status);
      
      if (!userInfoResponse.ok) {
        const errorText = await userInfoResponse.text();
        console.error('[Auth API] User info error:', userInfoResponse.status, errorText);
        throw new Error('Failed to get user info');
      }
      
      const userInfo = await userInfoResponse.json();
      console.log("[Auth API] User info retrieved successfully:", {
        user_id: userInfo.sub,
        email: userInfo.email
      });
      
      // Return the user info with the tokens
      return Response.json({
        ...userInfo,
        id_token, // Include the ID token for client-side use
      });
    } catch (error) {
      console.error('[Auth API] Error fetching user info:', error);
      return Response.json({ error: 'Failed to get user info' }, { status: 500 });
    }
  }
  
  // Default case - not found
  return Response.json({ error: 'Not found' }, { status: 404 });
} 
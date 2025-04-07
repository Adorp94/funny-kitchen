export async function GET(request: Request) {
  const url = new URL(request.url);
  const path = url.pathname;
  const origin = url.origin;
  
  console.log("Auth0 API route called:", { path, origin });
  
  // Extract Auth0 configuration from environment variables
  const auth0Domain = process.env.AUTH0_DOMAIN || '';
  const auth0ClientId = process.env.AUTH0_CLIENT_ID || '';
  const auth0ClientSecret = process.env.AUTH0_CLIENT_SECRET || '';
  const auth0RedirectUri = process.env.AUTH0_REDIRECT_URI || 'http://localhost:3000/api/auth/callback';
  const auth0PostLogoutRedirectUri = process.env.AUTH0_POST_LOGOUT_REDIRECT_URI || 'http://localhost:3000';
  
  const returnTo = url.searchParams.get('returnTo') || '/dashboard';
  
  // Handle login route
  if (path.endsWith('/login')) {
    const loginUrl = new URL(`https://${auth0Domain}/authorize`);
    loginUrl.searchParams.append('client_id', auth0ClientId);
    loginUrl.searchParams.append('redirect_uri', auth0RedirectUri);
    loginUrl.searchParams.append('response_type', 'code');
    loginUrl.searchParams.append('scope', 'openid profile email');
    loginUrl.searchParams.append('state', returnTo);
    
    console.log("Redirecting to Auth0 login:", loginUrl.toString());
    return Response.redirect(loginUrl.toString());
  }
  
  // Handle callback route
  if (path.endsWith('/callback')) {
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state') || '/dashboard';
    
    console.log("Auth0 callback received:", { code: !!code, state });
    
    if (!code) {
      console.error("No code in callback");
      return Response.redirect(new URL('/', origin).toString());
    }
    
    try {
      // Exchange code for token
      const tokenUrl = `https://${auth0Domain}/oauth/token`;
      const tokenResponse = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'authorization_code',
          client_id: auth0ClientId,
          client_secret: auth0ClientSecret,
          code,
          redirect_uri: auth0RedirectUri
        })
      });
      
      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error('Token exchange error:', tokenResponse.status, errorText);
        throw new Error(`Failed to exchange code for token: ${errorText}`);
      }
      
      const tokenData = await tokenResponse.json();
      console.log("Token received:", { 
        access_token: !!tokenData.access_token,
        id_token: !!tokenData.id_token,
        token_type: tokenData.token_type
      });
      
      // Set the session cookie with a long expiration (1 week)
      const maxAge = 7 * 24 * 60 * 60; // 1 week in seconds
      const cookieValue = `appSession=${tokenData.access_token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;
      
      // Create absolute URL for redirect
      const redirectUrl = new URL(state.startsWith('/') ? state : `/${state}`, origin);
      console.log("Redirecting after auth to:", redirectUrl.toString());
      
      // Return a response with both redirect and cookie
      return new Response(null, {
        status: 302,
        headers: {
          'Location': redirectUrl.toString(),
          'Set-Cookie': cookieValue
        }
      });
    } catch (error) {
      console.error('Auth callback error:', error);
      return Response.redirect(new URL('/', origin).toString());
    }
  }
  
  // Handle logout route
  if (path.endsWith('/logout')) {
    const logoutUrl = new URL(`https://${auth0Domain}/v2/logout`);
    logoutUrl.searchParams.append('client_id', auth0ClientId);
    logoutUrl.searchParams.append('returnTo', auth0PostLogoutRedirectUri);
    
    // Clear the session cookie
    const clearCookie = 'appSession=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0';
    
    console.log("Logging out, redirecting to:", logoutUrl.toString());
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
    const token = sessionCookie?.split('=')[1];
    
    if (!token) {
      console.log("No auth token found in cookies");
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    try {
      // Get user info from Auth0
      const userInfoUrl = `https://${auth0Domain}/userinfo`;
      const userInfoResponse = await fetch(userInfoUrl, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!userInfoResponse.ok) {
        const errorText = await userInfoResponse.text();
        console.error('User info error:', userInfoResponse.status, errorText);
        throw new Error('Failed to get user info');
      }
      
      const userInfo = await userInfoResponse.json();
      console.log("User info retrieved:", { sub: userInfo.sub, email: userInfo.email });
      return Response.json(userInfo);
    } catch (error) {
      console.error('Error fetching user info:', error);
      return Response.json({ error: 'Failed to get user info' }, { status: 500 });
    }
  }
  
  // Default case - not found
  return Response.json({ error: 'Not found' }, { status: 404 });
} 
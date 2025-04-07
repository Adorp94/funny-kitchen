export async function GET(request: Request) {
  const url = new URL(request.url);
  const path = url.pathname;
  
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
    
    return Response.redirect(loginUrl.toString());
  }
  
  // Handle callback route
  if (path.endsWith('/callback')) {
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state') || '/dashboard';
    
    if (!code) {
      return Response.redirect('/');
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
        throw new Error('Failed to exchange code for token');
      }
      
      const tokenData = await tokenResponse.json();
      
      // Set the session cookie
      const headers = new Headers();
      headers.append('Set-Cookie', `appSession=${tokenData.access_token}; Path=/; HttpOnly; SameSite=Lax`);
      
      // Redirect to the originally requested URL (stored in state)
      return new Response(null, {
        status: 302,
        headers: {
          Location: state,
          ...Object.fromEntries(headers.entries())
        }
      });
    } catch (error) {
      console.error('Auth callback error:', error);
      return Response.redirect('/');
    }
  }
  
  // Handle logout route
  if (path.endsWith('/logout')) {
    const logoutUrl = new URL(`https://${auth0Domain}/v2/logout`);
    logoutUrl.searchParams.append('client_id', auth0ClientId);
    logoutUrl.searchParams.append('returnTo', auth0PostLogoutRedirectUri);
    
    // Clear the session cookie
    const headers = new Headers();
    headers.append('Set-Cookie', 'appSession=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
    
    return new Response(null, {
      status: 302,
      headers: {
        Location: logoutUrl.toString(),
        ...Object.fromEntries(headers.entries())
      }
    });
  }
  
  // Handle user profile route
  if (path.endsWith('/me')) {
    const cookies = request.headers.get('cookie') || '';
    const sessionCookie = cookies.split(';').find(c => c.trim().startsWith('appSession='));
    const token = sessionCookie?.split('=')[1];
    
    if (!token) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    try {
      // Get user info from Auth0
      const userInfoUrl = `https://${auth0Domain}/userinfo`;
      const userInfoResponse = await fetch(userInfoUrl, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!userInfoResponse.ok) {
        throw new Error('Failed to get user info');
      }
      
      const userInfo = await userInfoResponse.json();
      return Response.json(userInfo);
    } catch (error) {
      console.error('Error fetching user info:', error);
      return Response.json({ error: 'Failed to get user info' }, { status: 500 });
    }
  }
  
  // Default case - not found
  return Response.json({ error: 'Not found' }, { status: 404 });
} 
export const authConfig = {
  issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL,
  baseURL: process.env.AUTH0_BASE_URL,
  clientID: process.env.AUTH0_CLIENT_ID,
  clientSecret: process.env.AUTH0_CLIENT_SECRET,
  secret: process.env.AUTH0_SECRET,
  routes: {
    callback: '/api/auth/callback',
    login: '/api/auth/login', 
    postLogoutRedirect: '/',
  },
  authorizationParams: {
    scope: 'openid profile email',
    response_type: 'code',
  },
  session: {
    absoluteDuration: 86400, // 24 hours in seconds
    cookie: {
      sameSite: 'lax',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
    },
  },
}; 
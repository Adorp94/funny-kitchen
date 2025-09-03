# Supabase Authentication Best Practices Guide

This guide provides a comprehensive setup for Supabase Authentication with Next.js App Router, covering invitation flows, React hydration safety, and production deployment.

## Table of Contents
- [Environment Setup](#environment-setup)
- [Supabase Configuration](#supabase-configuration)
- [Code Implementation](#code-implementation)
- [React Hydration Safety](#react-hydration-safety)
- [Invitation Flow](#invitation-flow)
- [Production Deployment](#production-deployment)
- [Troubleshooting](#troubleshooting)

## Environment Setup

### Required Environment Variables

Create `.env.local` for development and configure production environment:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000  # Development
# NEXT_PUBLIC_APP_URL=https://your-app.vercel.app  # Production
```

### Next.js Configuration

Update `next.config.js` for proper Supabase SSR support:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@supabase/ssr', '@supabase/supabase-js'],
  experimental: {
    // Keep empty for now
  },
  // Remove 'output: standalone' for Vercel deployment
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  }
};

module.exports = nextConfig;
```

## Supabase Configuration

### 1. Dashboard Settings

**Authentication Settings** (Settings → Authentication):
- **Site URL**: Your production URL (`https://your-app.vercel.app`)
- **Redirect URLs**: Add both development and production:
  ```
  http://localhost:3000/**
  https://your-app.vercel.app/**
  ```

### 2. Database Setup

Create user profiles table with RLS:

```sql
-- User profiles table
CREATE TABLE user_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin')),
  permissions JSONB DEFAULT '{"dashboard": true}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can read own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all profiles" ON user_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- Auto-create profile trigger
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (user_id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_profile();
```

### 3. Email Templates

**Invite User Template** (Authentication → Email Templates):
```html
<h2>¡Hola! 😎</h2>

<p>Te invitamos a unirte al equipo de [Your App Name]. Haz clic en el enlace de abajo para crear tu contraseña y acceder al sistema:</p>

<p><a href="{{ .ConfirmationURL }}">Crear mi contraseña</a></p>

<p>¡Bienvenido al equipo!</p>

<p>Si el enlace no funciona, copia y pega esta URL en tu navegador:</p>
<p>{{ .ConfirmationURL }}</p>
```

## Code Implementation

### 1. Supabase Client Configuration

**`/src/lib/supabase/client.ts`**:
```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

**`/src/lib/supabase/server.ts`**:
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server component, ignore
          }
        },
      },
    }
  )
}
```

### 2. Middleware for Route Protection

**`/middleware.ts`**:
```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            supabaseResponse.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Redirect unauthenticated users to login
  if (!user && !request.nextUrl.pathname.startsWith('/login') && 
      !request.nextUrl.pathname.startsWith('/auth') &&
      !request.nextUrl.pathname.startsWith('/reset-password')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Redirect authenticated users away from auth pages
  if (user && (request.nextUrl.pathname.startsWith('/login') || 
               request.nextUrl.pathname === '/')) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

## React Hydration Safety

### 1. Hydration Hook

**`/src/hooks/use-hydration.ts`**:
```typescript
'use client'

import { useEffect, useState } from 'react'

/**
 * Hook to detect when component has hydrated on the client
 * Prevents hydration mismatches by ensuring server and client render the same initially
 */
export function useHydration() {
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  return isHydrated
}
```

### 2. Auth Context with Hydration Safety

**`/src/contexts/auth-context.tsx`**:
```typescript
'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User, Session } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { useHydration } from '@/hooks/use-hydration'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const isHydrated = useHydration()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // Only run after hydration to prevent server/client mismatch
    if (!isHydrated) return

    let isMounted = true

    // Get initial session
    const getSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (!isMounted) return

        if (error) {
          console.error('Error getting session:', error)
          setSession(null)
          setUser(null)
          setLoading(false)
          return
        }

        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)
      } catch (err) {
        console.error('Failed to get session:', err)
        if (isMounted) {
          setSession(null)
          setUser(null)
          setLoading(false)
        }
      }
    }

    getSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return

        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
          setSession(session)
          setUser(session?.user ?? null)
          setLoading(false)

          if (event === 'SIGNED_OUT') {
            setTimeout(() => {
              if (isMounted && typeof window !== 'undefined') {
                window.location.href = '/login'
              }
            }, 100)
          } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            router.refresh()
          }
        }
      }
    )

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [isHydrated, router, supabase.auth])

  const signOut = async () => {
    setLoading(true)
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Error signing out:', error)
      setLoading(false)
    }
  }

  const value = {
    user,
    session,
    loading,
    signOut,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
```

### 3. Layout Wrapper with Hydration Safety

**`/src/components/layout-wrapper.tsx`**:
```typescript
'use client'

import { useAuth } from '@/contexts/auth-context'
import { usePathname } from 'next/navigation'
import { useHydration } from '@/hooks/use-hydration'

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const pathname = usePathname()
  const isHydrated = useHydration()

  // Routes that don't require authentication
  const publicRoutes = ['/login', '/reset-password', '/auth']
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))

  // Prevent hydration mismatch by showing loading until hydrated and auth is ready
  if (!isHydrated || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex items-center space-x-2">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <span className="text-lg text-gray-600">Cargando...</span>
        </div>
      </div>
    )
  }

  // If it's a public route or user is not authenticated, show content without sidebar
  if (isPublicRoute || !user) {
    return <>{children}</>
  }

  // If user is authenticated and it's not a public route, show app layout
  return (
    <div className="app-layout">
      {/* Your authenticated layout here */}
      {children}
    </div>
  )
}
```

## Invitation Flow

### 1. Auth Callback Handler

**`/src/app/auth/callback/route.ts`**:
```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const next = searchParams.get('next')
  const type = searchParams.get('type')
  
  const supabase = await createClient()

  // Handle token_hash flow (invitations, magic links)
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ 
      token_hash, 
      type: type as any 
    })
    
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()
      const isNewUser = user && (!user.email_confirmed_at || 
        (Date.now() - new Date(user.created_at).getTime()) < 10 * 60 * 1000)
      
      let redirectUrl = '/dashboard'
      
      if (type === 'recovery') {
        redirectUrl = '/reset-password/confirm'
      } else if (type === 'invite' || isNewUser) {
        redirectUrl = '/reset-password/confirm'
      } else if (next) {
        redirectUrl = next
      }
      
      return NextResponse.redirect(`${origin}${redirectUrl}`)
    }
  }
  
  // Handle PKCE code flow
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      const redirectUrl = next || '/dashboard'
      return NextResponse.redirect(`${origin}${redirectUrl}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
```

### 2. Password Creation with Auto-Login

**`/src/app/reset-password/confirm/page.tsx`**:
```typescript
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function ConfirmResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isNewUser, setIsNewUser] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // Check if user is newly created (via invitation)
  useEffect(() => {
    const checkUserStatus = async () => {
      // Check URL for invitation indicators
      const urlParams = new URLSearchParams(window.location.search)
      const isFromInvite = urlParams.get('type') === 'invite' || 
                          window.location.pathname.includes('reset-password/confirm')
      
      const { data: { user } } = await supabase.auth.getUser()
      
      // If user just authenticated via invitation token or is recently created
      const isRecent = user?.created_at && 
        (Date.now() - new Date(user.created_at).getTime()) < 10 * 60 * 1000 // 10 minutes
      
      if (user && (isFromInvite || !user.email_confirmed_at || isRecent)) {
        setIsNewUser(true)
      }
    }
    checkUserStatus()
  }, [supabase])

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      setLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      })

      if (error) {
        setError(error.message)
        return
      }

      // For new users (invitations), redirect to dashboard after password creation
      // For existing users (password reset), they need to log in again
      if (isNewUser) {
        // Force a session refresh to ensure the user is properly authenticated
        await supabase.auth.refreshSession()
        router.push('/dashboard?message=account-created')
      } else {
        router.push('/login?message=password-updated')
      }
    } catch (err) {
      console.error('Update password error:', err)
      setError('Ocurrió un error inesperado. Por favor intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        <h2 className="text-2xl font-bold text-center mb-6">
          {isNewUser ? 'Crear Contraseña' : 'Nueva Contraseña'}
        </h2>
        
        <form onSubmit={handleUpdatePassword} className="space-y-4">
          {error && (
            <div className="text-red-600 text-sm">{error}</div>
          )}
          
          <div>
            <label htmlFor="password">
              {isNewUser ? 'Contraseña' : 'Nueva Contraseña'}
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
          
          <div>
            <label htmlFor="confirmPassword">Confirmar Contraseña</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Actualizando...' : (isNewUser ? 'Crear Contraseña' : 'Actualizar Contraseña')}
          </button>
        </form>
      </div>
    </div>
  )
}
```

### 3. Admin Actions for User Invitations

**`/src/app/actions/admin-actions.ts`**:
```typescript
"use server"

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function createUserWithInvite(userData: {
  email: string
  role: 'admin' | 'user'
  permissions: Record<string, boolean>
}) {
  try {
    const supabase = await createClient()
    
    // Verify admin permissions
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'No autorizado' }
    }

    // Create admin client
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    
    if (!serviceRoleKey || !supabaseUrl) {
      return { 
        success: false, 
        error: 'Configuración del servidor incompleta' 
      }
    }

    const adminClient = createAdminClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Create user
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email: userData.email,
      email_confirm: false,
    })

    if (createError || !newUser.user) {
      return { success: false, error: createError?.message || 'Error al crear usuario' }
    }

    // Send invitation
    const appUrl = process.env.NODE_ENV === 'production' 
      ? process.env.NEXT_PUBLIC_APP_URL || 'https://your-app.vercel.app'
      : 'http://localhost:3000'
        
    const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
      userData.email,
      { redirectTo: `${appUrl}/auth/callback?type=invite` }
    )

    if (inviteError) {
      console.error('Failed to send invitation email:', inviteError)
    }

    // Create user profile
    const { error: profileError } = await supabase
      .from('user_profiles')
      .upsert({
        user_id: newUser.user.id,
        email: userData.email,
        role: userData.role,
        permissions: userData.permissions,
        created_by: user.id
      }, { onConflict: 'user_id' })

    if (profileError) {
      await adminClient.auth.admin.deleteUser(newUser.user.id)
      return { success: false, error: 'Error al crear el perfil de usuario' }
    }

    return { 
      success: true, 
      data: { id: newUser.user.id, email: newUser.user.email }
    }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido'
    }
  }
}
```

## Production Deployment

### 1. Environment Variables

**Vercel Environment Variables**:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

### 2. Supabase Dashboard Production Settings

1. **Authentication Settings**:
   - Site URL: `https://your-app.vercel.app`
   - Redirect URLs: `https://your-app.vercel.app/**`

2. **RLS Policies**: Ensure all policies are properly configured

3. **API Settings**: Verify CORS settings if needed

## Troubleshooting

### Common Issues

**1. React Hydration Error #310**
- Ensure all contexts use the `useHydration` hook
- Don't access `sessionStorage` or `localStorage` until after hydration
- Wait for `isHydrated` before running client-side only code

**2. Invitation Emails with Localhost URLs**
- Check Supabase Dashboard Site URL setting
- Verify `NEXT_PUBLIC_APP_URL` environment variable
- Ensure redirect URLs are configured for production

**3. Users Stuck on Login After Password Creation**
- Verify new user detection logic in password reset page
- Check that session refresh is called for new users
- Ensure proper redirect flow for invitation vs password reset

**4. Auth State Not Persisting**
- Verify cookie settings in Supabase client configuration
- Check middleware configuration
- Ensure RLS policies allow proper access

### Debug Commands

```bash
# Check environment variables
echo $NEXT_PUBLIC_SUPABASE_URL
echo $NEXT_PUBLIC_APP_URL

# Test Supabase connection
curl -X GET 'https://your-project.supabase.co/rest/v1/' \
  -H "apikey: your-anon-key"

# Check user authentication
# (Use browser dev tools to inspect auth.users table)
```

### Best Practices Summary

1. ✅ Always use hydration safety in client components
2. ✅ Configure proper environment variables for each environment
3. ✅ Set correct Site URL and Redirect URLs in Supabase Dashboard
4. ✅ Use server-side Supabase client for admin operations
5. ✅ Implement proper RLS policies for security
6. ✅ Handle both PKCE and token_hash authentication flows
7. ✅ Distinguish between new users (invitations) and existing users (password reset)
8. ✅ Add proper error handling and user feedback
9. ✅ Test the complete flow in both development and production
10. ✅ Use middleware for route protection when needed

This guide provides a solid foundation for implementing Supabase Auth with Next.js App Router, ensuring a smooth user experience and robust security.
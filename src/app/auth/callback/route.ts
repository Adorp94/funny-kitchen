import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const next = searchParams.get('next')
  const type = searchParams.get('type') // Check the auth flow type
  
  // Debug: Log all parameters to understand what we're receiving
  console.log('Auth callback URL:', request.url)
  console.log('Auth callback params:', Object.fromEntries(searchParams.entries()))
  console.log('Type parameter:', type)
  console.log('Has code:', !!code, 'Has token_hash:', !!token_hash)
  
  // Handle the case where the email template sends type=email instead of type=invite
  // This is a workaround for default Supabase email templates
  let actualType = type
  if (token_hash && !actualType) {
    // If no type is specified but we have a token_hash, assume it's an email confirmation
    actualType = 'email'
  }

  const supabase = await createClient()

  // Handle token_hash flow (invitations, magic links, etc.)
  if (token_hash && actualType) {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type: actualType as any })
    
    if (!error) {
      // Check if this is a new user (likely an invitation) by checking their session
      const { data: { user } } = await supabase.auth.getUser()
      const isNewUser = user && !user.email_confirmed_at
      
      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'
      
      // Determine redirect URL based on context
      let redirectUrl = '/dashboard' // default
      
      if (actualType === 'recovery' || next?.includes('reset-password')) {
        // This is a password recovery, redirect to password update page
        redirectUrl = '/reset-password/confirm'
      } else if (actualType === 'invite' || isNewUser) {
        // This is an invitation or new user, redirect to password creation page
        redirectUrl = '/reset-password/confirm'
      } else if (actualType === 'email' && isNewUser) {
        // This could be an invitation using the default email template
        redirectUrl = '/reset-password/confirm'
      } else if (next) {
        redirectUrl = next
      }
      
      console.log('Redirecting to:', redirectUrl, 'for type:', actualType, 'isNewUser:', isNewUser)
      
      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${redirectUrl}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${redirectUrl}`)
      } else {
        return NextResponse.redirect(`${origin}${redirectUrl}`)
      }
    } else {
      console.error('Token verification error:', error)
    }
  }
  
  // Handle PKCE code flow
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Check if this is a new user (likely an invitation) by checking their session
      const { data: { user } } = await supabase.auth.getUser()
      const isNewUser = user && !user.email_confirmed_at
      
      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'
      
      // Determine redirect URL based on context
      let redirectUrl = '/dashboard' // default
      
      if (actualType === 'recovery' || next?.includes('reset-password')) {
        // This is a password recovery, redirect to password update page
        redirectUrl = '/reset-password/confirm'
      } else if (actualType === 'invite' || actualType === 'signup' || isNewUser) {
        // This is an invitation, signup, or new user, redirect to password creation page
        redirectUrl = '/reset-password/confirm'
      } else if (next) {
        redirectUrl = next
      }
      
      console.log('PKCE: Redirecting to:', redirectUrl, 'for type:', actualType, 'isNewUser:', isNewUser)
      
      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${redirectUrl}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${redirectUrl}`)
      } else {
        return NextResponse.redirect(`${origin}${redirectUrl}`)
      }
    } else {
      console.error('PKCE exchange error:', error)
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
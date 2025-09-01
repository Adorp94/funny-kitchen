import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

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
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { pathname } = request.nextUrl

  // Handle auth routes first - no need to check authentication
  if (pathname.startsWith('/auth') || pathname.startsWith('/reset-password')) {
    return supabaseResponse
  }

  try {
    // Use getSession instead of getUser for better performance and reliability
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      console.error('Middleware auth error:', error.message)
      // If there's an auth error, allow the request to proceed
      // The individual pages will handle authentication
      return supabaseResponse
    }

    const user = session?.user

    // If user is not authenticated and trying to access protected route
    if (!user && !pathname.startsWith('/login') && pathname !== '/') {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('redirectedFrom', pathname)
      return NextResponse.redirect(url)
    }

    // If user is authenticated and trying to access auth routes, redirect to dashboard
    if (user && (pathname.startsWith('/login') || pathname === '/')) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }

    return supabaseResponse

  } catch (error) {
    console.error('Middleware error:', error)
    // On any error, let the request proceed and let individual pages handle auth
    return supabaseResponse
  }
}

// Match all routes except API routes and static assets
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - static assets
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
} 
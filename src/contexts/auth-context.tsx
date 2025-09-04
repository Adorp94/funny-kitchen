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
    if (!isHydrated) {
      console.log('[AuthContext] Not hydrated yet, skipping auth initialization')
      return
    }

    console.log('[AuthContext] Starting auth initialization after hydration')
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

        console.log('Initial session:', { session: !!session, user: session?.user?.email })
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

    // Listen for auth changes - but wait for initial session to be processed first
    let initialSessionProcessed = false
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return

        console.log('Auth state changed:', event, session?.user?.email || 'no user')
        
        // Handle INITIAL_SESSION first without triggering re-renders during hydration
        if (event === 'INITIAL_SESSION') {
          console.log('Processing INITIAL_SESSION, marking as processed')
          initialSessionProcessed = true
          return
        }
        
        // Skip other events until INITIAL_SESSION is processed to prevent hydration issues
        if (!initialSessionProcessed) {
          console.log('Skipping auth event until INITIAL_SESSION is processed:', event)
          return
        }
        
        // Only update state for specific events to avoid multiple renders
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
          setSession(session)
          setUser(session?.user ?? null)
          setLoading(false)

          // Handle auth state changes
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
    // The onAuthStateChange listener will handle the rest
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
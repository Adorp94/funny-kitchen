'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User, Session } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

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
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    let mounted = true

    // Get initial session
    const getSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (!mounted) return // Component was unmounted

        if (error) {
          console.error('Error getting session:', error)
          // Don't throw error, just set empty state
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
        if (mounted) {
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
        if (!mounted) return // Component was unmounted

        console.log('Auth state changed:', event, session?.user?.email || 'no user')
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)

        // Handle auth state changes
        if (event === 'SIGNED_OUT') {
          // Use timeout to prevent immediate redirect during component unmounting
          setTimeout(() => {
            if (mounted && typeof window !== 'undefined') {
              window.location.href = '/login'
            }
          }, 100)
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          router.refresh()
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [router, supabase.auth])

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
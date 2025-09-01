'use client'

import React, { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Lock } from 'lucide-react'

export default function ConfirmResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isNewUser, setIsNewUser] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // Check if user is newly created (via invitation) or came from invitation flow
  React.useEffect(() => {
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
        console.log('Setting as new user - fromInvite:', isFromInvite, 'emailConfirmed:', !!user.email_confirmed_at, 'isRecent:', isRecent)
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
        console.log('New user password created, redirecting to dashboard')
        router.push('/dashboard?message=account-created')
      } else {
        console.log('Password updated, redirecting to login')
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            {isNewUser ? 'Crear Contraseña' : 'Nueva Contraseña'}
          </CardTitle>
          <CardDescription className="text-center">
            {isNewUser ? 'Configura tu contraseña para acceder al sistema' : 'Ingresa tu nueva contraseña'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">{isNewUser ? 'Contraseña' : 'Nueva Contraseña'}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="pl-10"
                  minLength={6}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="pl-10"
                  minLength={6}
                />
              </div>
            </div>
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Actualizando...
                </>
              ) : (
                isNewUser ? 'Crear Contraseña' : 'Actualizar Contraseña'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
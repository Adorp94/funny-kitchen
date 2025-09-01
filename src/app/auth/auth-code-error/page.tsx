import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

export default function AuthCodeErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <AlertTriangle className="h-12 w-12 text-red-500" />
          </div>
          <CardTitle className="text-2xl font-bold">
            Error de Autenticación
          </CardTitle>
          <CardDescription>
            Hubo un problema al procesar el enlace de autenticación
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <div className="space-y-2 text-sm text-gray-600">
            <p>Esto puede suceder si:</p>
            <ul className="text-left space-y-1 ml-4">
              <li>• El enlace ha expirado</li>
              <li>• El enlace ya fue utilizado</li>
              <li>• El enlace está dañado</li>
            </ul>
          </div>
          
          <div className="space-y-2">
            <Button asChild className="w-full">
              <Link href="/login">
                Volver al Inicio de Sesión
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/reset-password">
                Solicitar Nuevo Enlace
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
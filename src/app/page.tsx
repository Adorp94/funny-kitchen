"use client";

import { useEffect, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { FaGoogle } from 'react-icons/fa';
import Image from 'next/image';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const { loginWithRedirect, isAuthenticated, isLoading } = useAuth0();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // If already authenticated, redirect to dashboard
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  // Handle email sign in
  const handleSignIn = async () => {
    setLoading(true);
    await loginWithRedirect({
      authorizationParams: {
        screen_hint: 'login',
      }
    });
  };

  // Handle Google sign in
  const handleGoogleSignIn = async () => {
    setLoading(true);
    await loginWithRedirect({
      authorizationParams: {
        connection: 'google-oauth2',
      }
    });
  };

  // Show loading indicator while Auth0 is loading or redirect is happening
  if (isLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 flex flex-col sm:flex-row">
        {/* Left side: Login */}
        <div className="w-full sm:w-1/2 flex flex-col justify-center items-center p-8">
          <div className="w-full max-w-md space-y-8">
            <div className="text-center">
              <Image
                src="/logo-fk.png"
                alt="Funny Kitchen Logo"
                width={100}
                height={100}
                className="mx-auto"
              />
              <h2 className="mt-6 text-3xl font-bold text-gray-900">
                Bienvenido a Funny Kitchen
              </h2>
              <p className="mt-2 text-gray-600">
                Inicia sesión para acceder al sistema
              </p>
            </div>

            <div className="mt-8 space-y-4">
              <Button
                onClick={handleSignIn}
                className="w-full py-6 text-lg"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Iniciar sesión con correo
              </Button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">O continúa con</span>
                </div>
              </div>

              <Button
                onClick={handleGoogleSignIn}
                variant="outline"
                className="w-full py-6 text-lg"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FaGoogle className="mr-2 h-5 w-5" />
                )}
                Google
              </Button>
            </div>
          </div>
        </div>

        {/* Right side: Image */}
        <div className="hidden sm:block sm:w-1/2 bg-gradient-to-r from-blue-500 to-indigo-600">
          <div className="h-full flex items-center justify-center p-8">
            <div className="text-center text-white">
              <h1 className="text-4xl font-bold mb-4">
                Gestión de cotizaciones
              </h1>
              <p className="text-xl">
                Administra tus cotizaciones de forma sencilla y eficiente
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
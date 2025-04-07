"use client";

import { useEffect, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { Loader2, Mail } from 'lucide-react';

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth0();
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    // Function to check authentication from various sources
    const checkAuth = async () => {
      try {
        // Check Auth0 SDK state
        if (isAuthenticated) {
          console.log("[Home] Auth0 SDK reports user is authenticated");
          localStorage.setItem('app_auth_checked', 'true');
          window.location.href = '/dashboard';
          return;
        }

        // Check for session cookie
        const hasCookie = document.cookie.split(';').some(item => item.trim().startsWith('appSession='));
        console.log("[Home] Session cookie present:", hasCookie);
        
        if (hasCookie) {
          // Verify cookie with API
          try {
            console.log("[Home] Verifying cookie validity with API...");
            const response = await fetch('/api/auth/me', {
              credentials: 'include',
              cache: 'no-store'
            });
            
            if (response.ok) {
              console.log("[Home] API verified user is authenticated");
              localStorage.setItem('app_auth_checked', 'true');
              window.location.href = '/dashboard';
              return;
            } else {
              console.log("[Home] API could not verify user, clearing stored auth state");
              localStorage.removeItem('app_auth_checked');
            }
          } catch (error) {
            console.error("[Home] Error verifying auth with API:", error);
          }
        }
        
        // If we reach here, user is not authenticated
        console.log("[Home] User is not authenticated, showing login page");
        localStorage.removeItem('app_auth_checked');
        setCheckingAuth(false);
      } catch (error) {
        console.error("[Home] Error in auth check:", error);
        setCheckingAuth(false);
      }
    };

    // Only run auth check if Auth0 has finished loading
    if (!isLoading) {
      console.log("[Home] Auth0 has loaded, checking authentication...");
      checkAuth();
    }
  }, [isAuthenticated, isLoading]);

  // Handle email sign in - go directly to Auth0 login
  const handleSignIn = () => {
    setLoading(true);
    console.log("[Home] Starting direct login flow");
    // Store in localStorage that we're coming from the login flow
    localStorage.setItem('login_initiated', 'true');
    window.location.href = '/api/auth/login?returnTo=/dashboard';
  };

  // Handle Google sign in - go directly to Auth0 login with Google connection
  const handleGoogleSignIn = () => {
    setLoading(true);
    console.log("[Home] Starting Google login flow");
    // Store in localStorage that we're coming from the login flow
    localStorage.setItem('login_initiated', 'true');
    window.location.href = '/api/auth/login?connection=google-oauth2&returnTo=/dashboard';
  };

  // Show loading indicator while checking authentication
  if (isLoading || checkingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center">
          <Loader2 className="h-12 w-12 animate-spin text-emerald-600" />
          <p className="mt-4 text-gray-600">Verificando sesión...</p>
        </div>
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
                ) : (
                  <Mail className="mr-2 h-5 w-5" />
                )}
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
                  <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                    <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                      <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"/>
                      <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"/>
                      <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"/>
                      <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"/>
                    </g>
                  </svg>
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
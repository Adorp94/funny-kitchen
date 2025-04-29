"use client";

import { useEffect, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { Loader2, Mail } from 'lucide-react';

export default function Home() {
  const { isAuthenticated, isLoading, loginWithRedirect } = useAuth0();
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showHealth, setShowHealth] = useState(false);
  const [healthData, setHealthData] = useState<any>(null);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const router = useRouter();

  // Add an error boundary
  useEffect(() => {
    try {
      console.log("[Home] Initializing with auth status:", { isLoading, isAuthenticated });
      
      // Check for URL parameters
      if (typeof window !== 'undefined') {
        // Check if we're in the error state coming back from Auth0
        const url = new URL(window.location.href);
        const errorDescription = url.searchParams.get('error_description');
        if (errorDescription) {
          console.error('[Home] Auth0 returned error:', errorDescription);
          setError(errorDescription);
        }
      }
    } catch (err) {
      console.error('[Home] Error in initialization:', err);
      setError(`Error initializing page: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, []);

  // Add loading timeout to avoid infinite loading state
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (isLoading || checkingAuth) {
      timer = setTimeout(() => {
        console.log("[Home] Loading timeout reached after 10 seconds");
        setLoadingTimeout(true);
        setCheckingAuth(false);
      }, 10000); // 10 seconds timeout
    }
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isLoading, checkingAuth]);

  // Fetch health endpoint data
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await fetch('/api/health');
        if (response.ok) {
          const data = await response.json();
          console.log("[Home] Health check data:", data);
          setHealthData(data);
        } else {
          console.error("[Home] Health check failed:", response.status);
          setHealthData({ status: 'error', message: `API returned ${response.status}` });
        }
      } catch (err) {
        console.error("[Home] Health check error:", err);
        setHealthData({ status: 'error', message: String(err) });
      }
    };
    
    checkHealth();
  }, []);

  useEffect(() => {
    // Simple authentication check
    const checkAuth = async () => {
      try {
        // If authenticated with Auth0, redirect to dashboard
        if (isAuthenticated) {
          console.log("[Home] User is authenticated, redirecting to dashboard");
          router.push('/dashboard');
          return;
        }
        
        // Otherwise, show login page
        setCheckingAuth(false);
      } catch (error) {
        console.error("[Home] Error in auth check:", error);
        setCheckingAuth(false);
        setError(`Authentication check error: ${error instanceof Error ? error.message : String(error)}`);
      }
    };

    // Only run auth check if Auth0 has finished loading
    if (!isLoading) {
      checkAuth();
    }
  }, [isAuthenticated, isLoading, router]);

  // Handle email sign in - go directly to Auth0 login
  const handleSignIn = () => {
    try {
      setLoading(true);
      console.log("[Home] Starting direct login flow");
      
      // Ensure origin is within Auth0's allowed callback URLs
      const allowedOrigins = ['https://funny-kitchen.vercel.app', 'http://localhost:3000'];
      const currentOrigin = window.location.origin;
      const redirectUri = allowedOrigins.includes(currentOrigin) 
        ? currentOrigin 
        : 'https://funny-kitchen.vercel.app';
        
      console.log("[Home] Using origin for login:", redirectUri);
      
      // Use Auth0's loginWithRedirect method - explicit redirect_uri helps with production
      loginWithRedirect({
        appState: { returnTo: "/dashboard" },
        authorizationParams: {
          redirect_uri: redirectUri
        }
      });
    } catch (err) {
      console.error("[Home] Login error:", err);
      setError(`Login error: ${err instanceof Error ? err.message : String(err)}`);
      setLoading(false);
    }
  };

  // Handle sign up - go directly to Auth0 signup screen
  const handleSignUp = () => {
    try {
      setLoading(true);
      console.log("[Home] Starting sign up flow");
      
      // Ensure origin is within Auth0's allowed callback URLs
      const allowedOrigins = ['https://funny-kitchen.vercel.app', 'http://localhost:3000'];
      const currentOrigin = window.location.origin;
      const redirectUri = allowedOrigins.includes(currentOrigin) 
        ? currentOrigin 
        : 'https://funny-kitchen.vercel.app';
        
      console.log("[Home] Using origin for signup:", redirectUri);
      
      // Use Auth0's loginWithRedirect method with screen_hint set to signup
      loginWithRedirect({
        appState: { returnTo: "/dashboard" },
        authorizationParams: {
          redirect_uri: redirectUri,
          screen_hint: 'signup'  // This is crucial to show the signup screen
        }
      });
    } catch (err) {
      console.error("[Home] Signup error:", err);
      setError(`Signup error: ${err instanceof Error ? err.message : String(err)}`);
      setLoading(false);
    }
  };

  // Handle Google sign in - go directly to Auth0 login with Google connection
  const handleGoogleSignIn = () => {
    try {
      setLoading(true);
      console.log("[Home] Starting Google login flow");
      
      // Ensure origin is within Auth0's allowed callback URLs
      const allowedOrigins = ['https://funny-kitchen.vercel.app', 'http://localhost:3000'];
      const currentOrigin = window.location.origin;
      const redirectUri = allowedOrigins.includes(currentOrigin) 
        ? currentOrigin 
        : 'https://funny-kitchen.vercel.app';
        
      console.log("[Home] Using origin for Google login:", redirectUri);
      
      // Use Auth0's loginWithRedirect method with Google connection
      loginWithRedirect({
        appState: { returnTo: "/dashboard" },
        authorizationParams: {
          redirect_uri: redirectUri,
          connection: 'google-oauth2'
        }
      });
    } catch (err) {
      console.error("[Home] Google login error:", err);
      setError(`Google login error: ${err instanceof Error ? err.message : String(err)}`);
      setLoading(false);
    }
  };

  // Show loading indicator while checking authentication
  if ((isLoading || checkingAuth) && !loadingTimeout) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center">
          <Loader2 className="h-12 w-12 animate-spin text-emerald-600" />
          <p className="mt-4 text-gray-600">Verificando sesión...</p>
          {process.env.NODE_ENV !== 'production' && (
            <div className="mt-4 text-xs text-gray-500">
              <p>isLoading: {String(isLoading)}</p>
              <p>checkingAuth: {String(checkingAuth)}</p>
              <p>isAuthenticated: {String(isAuthenticated)}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Show timeout message if loading took too long
  if (loadingTimeout) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-yellow-50 p-6 rounded-xs shadow-xs max-w-lg w-full">
          <h2 className="text-yellow-700 text-xl font-bold mb-4">Tiempo de espera agotado</h2>
          <p className="text-yellow-600 mb-4">
            La verificación de la sesión está tomando más tiempo del esperado. Puede que haya un problema con el servicio de autenticación.
          </p>
          <div className="space-y-4">
            <Button 
              className="w-full"
              onClick={() => window.location.reload()}
            >
              Intentar de nuevo
            </Button>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => {
                localStorage.clear();
                sessionStorage.clear();
                // Clear cookies by setting them to expire
                document.cookie.split(";").forEach(c => {
                  document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
                });
                window.location.href = '/';
              }}
            >
              Reiniciar sesión
            </Button>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => setShowHealth(!showHealth)}
            >
              {showHealth ? 'Ocultar diagnóstico' : 'Mostrar diagnóstico'}
            </Button>
            {showHealth && healthData && (
              <div className="mt-4 p-4 bg-gray-100 rounded-xs text-sm overflow-auto">
                <pre>{JSON.stringify(healthData, null, 2)}</pre>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-red-50 p-6 rounded-xs shadow-xs max-w-lg w-full">
          <h2 className="text-red-700 text-xl font-bold mb-4">Error de autenticación</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <div className="space-y-4">
            <Button 
              className="w-full"
              onClick={() => window.location.href = '/'}
            >
              Intentar de nuevo
            </Button>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => setShowHealth(!showHealth)}
            >
              {showHealth ? 'Ocultar diagnóstico' : 'Mostrar diagnóstico'}
            </Button>
            {showHealth && healthData && (
              <div className="mt-4 p-4 bg-gray-100 rounded-xs text-sm overflow-auto">
                <pre>{JSON.stringify(healthData, null, 2)}</pre>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex flex-col">
      {/* Health check button - only in development */}
      {process.env.NODE_ENV !== 'production' && (
        <div className="absolute top-2 right-2">
          <button 
            onClick={() => setShowHealth(!showHealth)}
            className="text-xs text-gray-500 underline"
          >
            {showHealth ? 'Hide Health' : 'Health Check'}
          </button>
          {showHealth && healthData && (
            <div className="mt-2 p-2 bg-gray-100 rounded-xs text-xs overflow-auto w-64">
              <pre>{JSON.stringify(healthData, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
      
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
                Inicia sesión o crea una cuenta para acceder al sistema
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

              <Button
                onClick={handleSignUp}
                variant="outline"
                className="w-full py-6 text-lg border-emerald-600 text-emerald-600 hover:bg-emerald-50"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <svg 
                    className="mr-2 h-5 w-5" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24" 
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                )}
                Crear cuenta nueva
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
        <div className="hidden sm:block sm:w-1/2 bg-linear-to-r from-blue-500 to-indigo-600">
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
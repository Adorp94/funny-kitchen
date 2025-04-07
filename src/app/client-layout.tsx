"use client";

import React, { useEffect, useState } from "react";
import { Auth0Provider } from "@auth0/auth0-react";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { usePathname } from "next/navigation";

interface ClientLayoutProps {
  children: React.ReactNode;
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initTimeout, setInitTimeout] = useState(false);
  const pathname = usePathname();
  const isSignIn = pathname === "/";

  // Initialize on client-side only
  useEffect(() => {
    setIsMounted(true);
    console.log("[ClientLayout] Mounted, pathname:", pathname);
    
    // Set a timeout to detect stalled initialization
    const timer = setTimeout(() => {
      if (!window.location.search.includes('error')) {
        console.log("[ClientLayout] Initialization timeout reached after 15 seconds");
        setInitTimeout(true);
      }
    }, 15000); // 15 seconds
    
    return () => clearTimeout(timer);
  }, [pathname]);

  // Get the origin for redirect_uri
  const origin = 
    typeof window !== 'undefined' && window.location.origin
      ? window.location.origin
      : 'http://localhost:3000';
  
  // Auth0 configuration
  const domain = process.env.NEXT_PUBLIC_AUTH0_DOMAIN || "dev-av1unzc74ll0psau.us.auth0.com";
  const clientId = process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID || "y3zkQqmOiFGAV3OzU4bF5LIl631V6Jxb";
  
  // Log Auth0 configuration for debugging
  useEffect(() => {
    if (isMounted) {
      console.log("[Auth0] Configuration:", {
        domain,
        clientId,
        redirect_uri: origin,
        isMounted,
        location: typeof window !== 'undefined' ? window.location.href : 'unknown',
        environment: process.env.NODE_ENV,
        timeout: initTimeout
      });
      
      // Add a global error handler to catch any uncaught errors
      if (typeof window !== 'undefined') {
        window.onerror = function(message, source, lineno, colno, error) {
          console.error("[Global Error]", { message, source, lineno, colno, error });
          setError(`Error: ${message}`);
          return false;
        };
      }
    }
  }, [domain, clientId, origin, isMounted, initTimeout]);
  
  // Don't render anything during SSR
  if (!isMounted) {
    return null;
  }

  // Show timeout message if Auth0 initialization takes too long
  if (initTimeout && !error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-yellow-50 p-6 rounded-lg shadow-md max-w-lg w-full">
          <h2 className="text-yellow-700 text-xl font-bold mb-4">Problema de inicialización</h2>
          <p className="text-yellow-600 mb-4">
            La inicialización del servicio de autenticación está tomando más tiempo del esperado.
          </p>
          <div className="space-y-4">
            <button 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded"
              onClick={() => window.location.reload()}
            >
              Recargar la página
            </button>
            <button 
              className="w-full border border-gray-300 hover:bg-gray-50 py-2 px-4 rounded"
              onClick={() => {
                // Clear all storage
                localStorage.clear();
                sessionStorage.clear();
                // Clear cookies
                document.cookie.split(";").forEach(c => {
                  document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
                });
                window.location.href = '/';
              }}
            >
              Limpiar caché y reiniciar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Provide a fallback UI for debugging
  const debugContent = (
    <div className="p-6 bg-white rounded shadow m-4">
      <h2 className="text-xl font-bold mb-4">Auth0 Debug Information</h2>
      <p className="mb-2">Domain: {domain}</p>
      <p className="mb-2">Client ID: {clientId}</p>
      <p className="mb-2">Redirect URI: {origin}</p>
      <p className="mb-2">Is Mounted: {String(isMounted)}</p>
      <p className="mb-2">Environment: {process.env.NODE_ENV}</p>
      <hr className="my-4" />
      {error && (
        <div className="bg-red-50 p-4 text-red-700 rounded mt-4">
          <h3 className="font-bold">Auth Error</h3>
          <p>{error}</p>
        </div>
      )}
    </div>
  );

  return (
    <>
      {error ? (
        <div className="bg-red-50 p-4 text-red-700 rounded m-4">
          <h2 className="font-bold">Auth Error</h2>
          <p>{error}</p>
          {debugContent}
          <div className="mt-4">
            <button
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              onClick={() => window.location.href = '/'}
            >
              Volver al inicio
            </button>
          </div>
        </div>
      ) : (
        <Auth0Provider
          domain={domain}
          clientId={clientId}
          authorizationParams={{
            redirect_uri: origin,
            scope: "openid profile email"
          }}
          cacheLocation="localstorage"
          onError={(error) => {
            console.error("[Auth0] Error:", error);
            setError(error.message || "An error occurred with authentication");
          }}
        >
          <div id="auth0-debug" style={{ display: 'none' }}>{debugContent}</div>
          {!isSignIn && <Header />}
          <main className="min-h-screen bg-gray-50">{children}</main>
          {!isSignIn && <Footer />}
        </Auth0Provider>
      )}
    </>
  );
} 
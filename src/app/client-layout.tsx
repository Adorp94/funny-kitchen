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
  const pathname = usePathname();
  const isSignIn = pathname === "/";

  // Initialize on client-side only
  useEffect(() => {
    setIsMounted(true);
    console.log("[ClientLayout] Mounted, pathname:", pathname);
  }, [pathname]);

  // Auth0 configuration
  const domain = process.env.NEXT_PUBLIC_AUTH0_DOMAIN || "dev-av1unzc74ll0psau.us.auth0.com";
  const clientId = process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID || "y3zkQqmOiFGAV3OzU4bF5LIl631V6Jxb";
  
  // Get allowed origins from env or fallback to the default ones
  const allowedOrigins = ['https://funny-kitchen.vercel.app', 'http://localhost:3000'];
  
  // Ensure origin is allowed - this addresses a common Auth0 production issue
  // If the current origin isn't in allowed origins, default to the first one in production
  const isAllowedOrigin = typeof window !== 'undefined' && allowedOrigins.includes(window.location.origin);
  const finalOrigin = isAllowedOrigin 
    ? window.location.origin 
    : (process.env.NODE_ENV === 'production' ? allowedOrigins[0] : 'http://localhost:3000');
  
  // Log Auth0 configuration for debugging
  useEffect(() => {
    if (isMounted) {
      console.log("[Auth0] Configuration:", {
        domain,
        clientId,
        redirect_uri: finalOrigin,
        isMounted,
        location: typeof window !== 'undefined' ? window.location.href : 'unknown',
        environment: process.env.NODE_ENV,
        isAllowedOrigin,
        finalOrigin
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
  }, [domain, clientId, finalOrigin, isMounted, isAllowedOrigin]);
  
  // Don't render anything during SSR
  if (!isMounted) {
    return null;
  }

  // Provide a fallback UI for debugging
  const debugContent = (
    <div className="p-6 bg-white rounded shadow m-4">
      <h2 className="text-xl font-bold mb-4">Auth0 Debug Information</h2>
      <p className="mb-2">Domain: {domain}</p>
      <p className="mb-2">Client ID: {clientId}</p>
      <p className="mb-2">Redirect URI: {finalOrigin}</p>
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
            redirect_uri: finalOrigin,
            scope: "openid profile email"
          }}
          cacheLocation="localstorage"
          // Reduce token refresh to prevent stalled auth in production
          useRefreshTokens={false} 
          // Add missing callback handler
          onRedirectCallback={(appState) => {
            console.log("[Auth0] Redirect callback triggered, state:", 
                       appState ? `returnTo: ${appState.returnTo}` : 'none');
            if (appState && appState.returnTo) {
              window.location.href = appState.returnTo;
            }
          }}
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
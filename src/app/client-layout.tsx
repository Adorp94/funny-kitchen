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
       console.log("[Auth0] Configuration:", { domain, clientId, finalOrigin, isMounted, isAllowedOrigin });
      // Restore window.onerror
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
    <div className="p-6 bg-white rounded-xs shadow-xs m-4">
      <h2 className="text-xl font-bold mb-4">Auth0 Debug Information</h2>
      <p className="mb-2">Domain: {domain}</p>
      <p className="mb-2">Client ID: {clientId}</p>
      <p className="mb-2">Redirect URI: {finalOrigin}</p>
      <p className="mb-2">Is Mounted: {String(isMounted)}</p>
      <p className="mb-2">Environment: {process.env.NODE_ENV}</p>
      <hr className="my-4" />
      {error && (
        <div className="bg-red-50 p-4 text-red-700 rounded-xs mt-4">
          <h3 className="font-bold">Auth Error</h3>
          <p>{error}</p>
        </div>
      )}
    </div>
  );

  return (
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={{
        redirect_uri: finalOrigin,
        scope: "openid profile email"
      }}
      cacheLocation="localstorage"
      useRefreshTokens={false} 
      onRedirectCallback={(appState) => {
        console.log("[Auth0] Redirect callback triggered, state:", appState);
        if (appState && appState.returnTo) {
          window.location.href = appState.returnTo;
        }
      }}
      onError={(error) => {
        console.error("[Auth0] Error:", error);
        setError(error.message || "An error occurred with authentication");
      }}
    >
      {isMounted && !error ? (
        <>
          {!isSignIn && <Header />}
          <div className="w-full mx-auto px-6 sm:px-8 lg:px-10">
            <div className="flex flex-col min-h-[calc(100vh-theme(space.16)-theme(space.16))] ">
              <main className="flex-1">
                {children}
              </main>
            </div>
          </div>
          {!isSignIn && <Footer />}
        </>
      ) : error ? (
        debugContent
      ) : (
        null
      )}
    </Auth0Provider>
  );
} 
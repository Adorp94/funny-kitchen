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
        redirect_uri: `${origin}/api/auth/callback`,
        isMounted,
        location: typeof window !== 'undefined' ? window.location.href : 'unknown'
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
  }, [domain, clientId, origin, isMounted]);
  
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
      <p className="mb-2">Redirect URI: {`${origin}/api/auth/callback`}</p>
      <p className="mb-2">Is Mounted: {String(isMounted)}</p>
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
        </div>
      ) : (
        <Auth0Provider
          domain={domain}
          clientId={clientId}
          authorizationParams={{
            redirect_uri: `${origin}/api/auth/callback`,
          }}
          cacheLocation="localstorage"
          useRefreshTokens={true}
          useRefreshTokensFallback={true}
          cookieDomain={typeof window !== 'undefined' ? window.location.hostname : undefined}
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
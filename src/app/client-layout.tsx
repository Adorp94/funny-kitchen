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
        redirect_uri: origin,
        isMounted
      });
    }
  }, [domain, clientId, origin, isMounted]);
  
  // Don't render anything during SSR
  if (!isMounted) {
    return null;
  }

  return (
    <>
      {error ? (
        <div className="bg-red-50 p-4 text-red-700 rounded m-4">
          <h2 className="font-bold">Auth Error</h2>
          <p>{error}</p>
        </div>
      ) : (
        <Auth0Provider
          domain={domain}
          clientId={clientId}
          authorizationParams={{
            redirect_uri: origin,
          }}
          cacheLocation="localstorage"
          onError={(error) => {
            console.error("[Auth0] Error:", error);
            setError(error.message || "An error occurred with authentication");
          }}
        >
          {!isSignIn && <Header />}
          <main className="min-h-screen bg-gray-50">{children}</main>
          {!isSignIn && <Footer />}
        </Auth0Provider>
      )}
    </>
  );
} 
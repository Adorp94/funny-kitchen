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
      : 'http://localhost:3001';
  
  // Don't render anything during SSR
  if (!isMounted) {
    return null;
  }

  return (
    <Auth0Provider
      domain={process.env.NEXT_PUBLIC_AUTH0_DOMAIN || "dev-av1unzc74ll0psau.us.auth0.com"}
      clientId={process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID || "y3zkQqmOiFGAV3OzU4bF5LIl631V6Jxb"}
      authorizationParams={{
        redirect_uri: `${origin}/api/auth/callback`,
        audience: process.env.NEXT_PUBLIC_AUTH0_AUDIENCE,
      }}
      cacheLocation="localstorage"
      useRefreshTokens={true}
    >
      {!isSignIn && <Header />}
      <main className="min-h-screen bg-gray-50">{children}</main>
      {!isSignIn && <Footer />}
    </Auth0Provider>
  );
} 
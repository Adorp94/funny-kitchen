"use client";

import { Header } from "@/components/layout/header";
import { Auth0Provider } from '@auth0/auth0-react';
import { Toaster } from "react-hot-toast";
import { usePathname } from "next/navigation";

// Remove AuthGuard import since we're using middleware
// import AuthGuard from "./auth-guard";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  
  // Determine if we're on the sign-in page (root path)
  const isSignInPage = pathname === "/";
  
  // Define the correct redirect URI based on environment
  const redirectUri = typeof window !== 'undefined' 
    ? `${window.location.origin}/api/auth/callback`
    : 'http://localhost:3000/api/auth/callback';

  return (
    <Auth0Provider
      domain="dev-av1unzc74ll0psau.us.auth0.com"
      clientId="y3zkQqmOiFGAV3OzU4bF5LIl631V6Jxb"
      authorizationParams={{
        redirect_uri: redirectUri,
        // No explicit connection to allow user choice
        screen_hint: 'signin',
        scope: 'openid profile email',
      }}
      useRefreshTokens={true}
      cacheLocation="localstorage"
    >
      {/* Only render header if not on sign-in page */}
      {!isSignInPage && <Header />}
      
      <main className={isSignInPage ? "min-h-screen" : "pt-4 px-4 md:px-8 lg:px-12 max-w-[1440px] mx-auto"}>
        {children}
      </main>
      
      <Toaster position="bottom-right" />
    </Auth0Provider>
  );
} 
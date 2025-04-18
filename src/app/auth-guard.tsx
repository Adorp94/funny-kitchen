"use client";

import { useEffect, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useRouter, usePathname } from "next/navigation";

// List of public routes that don't require authentication
const publicRoutes = ["/", "/login", "/privacy", "/terms", "/test"];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, error } = useAuth0();
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthChecked, setIsAuthChecked] = useState(false);

  // Check if the current route requires authentication
  const isPublicRoute = publicRoutes.some(route => 
    pathname === route || pathname.startsWith(`${route}/`)
  );
  
  // Log auth state for debugging
  useEffect(() => {
    console.log("[AuthGuard] Auth state:", { 
      isAuthenticated, 
      isLoading, 
      pathname,
      isPublicRoute,
      error: error ? error.message : null
    });
  }, [isAuthenticated, isLoading, pathname, isPublicRoute, error]);

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated && !isPublicRoute) {
        // Redirect to home/login page if not authenticated and not on a public route
        console.log("[AuthGuard] Not authenticated, redirecting to home");
        router.push("/");
      }
      setIsAuthChecked(true);
    }
  }, [isAuthenticated, isLoading, isPublicRoute, pathname, router]);

  // Show loading state while checking authentication
  if (isLoading || !isAuthChecked) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
          <p className="mt-4 text-gray-600">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  // If not authenticated and trying to access a protected route, render nothing
  // The useEffect will handle the redirect
  if (!isAuthenticated && !isPublicRoute) {
    return null;
  }

  // Render children only if authenticated or on a public route
  return <>{children}</>;
} 
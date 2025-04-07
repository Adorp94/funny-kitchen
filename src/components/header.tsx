"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth0 } from "@auth0/auth0-react";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Menu, X, FileText, ShoppingBag, Users, LogIn, DollarSign } from "lucide-react";
import LogoutButton from "@/components/auth/logout-button";

// Navigation items
const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Cotizaciones",
    href: "/dashboard/cotizaciones",
    icon: FileText,
  },
  {
    name: "Finanzas",
    href: "/dashboard/finanzas",
    icon: DollarSign,
  }
];

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isLoading, isAuthenticated } = useAuth0();
  const [hasCookie, setHasCookie] = useState(false);
  
  // Check for appSession cookie
  useEffect(() => {
    const cookieExists = document.cookie.split(';').some(item => item.trim().startsWith('appSession='));
    setHasCookie(cookieExists);
    console.log("[Header] Session cookie present:", cookieExists);
  }, []);
  
  // Add debug logging for authentication state
  useEffect(() => {
    console.log("[Header] Auth state:", { 
      isAuthenticated, 
      isLoading, 
      hasCookie,
      user: user ? { email: user.email, name: user.name } : null 
    });
  }, [isAuthenticated, isLoading, user, hasCookie]);
  
  // Check if a given path is active
  const isActive = (path: string) => {
    // Special case for dashboard paths
    if (path === "/dashboard") {
      // Only consider active if we're on the dashboard home page exactly
      return pathname === "/dashboard";
    }
    
    // For other paths, check if the current path starts with the given path
    return pathname === path || pathname.startsWith(path);
  };
  
  // Handle login via backend API
  const handleLogin = () => {
    window.location.href = `/api/auth/login?returnTo=${pathname}`;
  };

  // Handle Google login via backend API 
  const handleGoogleLogin = () => {
    window.location.href = `/api/auth/login?connection=google-oauth2&returnTo=${pathname}`;
  };

  // If still loading auth state, show a minimal loading indicator
  if (isLoading && !hasCookie) {
    return (
      <header className="w-full bg-white border-b border-gray-100">
        <div className="flex h-16 items-center justify-between max-w-[1440px] mx-auto px-6 sm:px-8 lg:px-10">
          <div className="flex items-center">
            <Link href="/dashboard" className="flex items-center">
              <img src="/logo.png" alt="Funny Kitchen" className="h-10 object-contain" />
            </Link>
          </div>
          <div className="h-10 w-10 rounded-full bg-gray-200 animate-pulse"></div>
        </div>
      </header>
    );
  }

  // Consider user authenticated if either Auth0 state reports authenticated or we have a cookie
  const isAuthorized = isAuthenticated || hasCookie;

  return (
    <header className="w-full bg-white border-b border-gray-100">
      <div className="flex h-16 items-center justify-between max-w-[1440px] mx-auto px-6 sm:px-8 lg:px-10">
        {/* Left section with logo */}
        <div className="flex items-center">
          <Link href="/dashboard" className="flex items-center mr-10">
            <img
              src="/logo.png"
              alt="Funny Kitchen"
              className="h-10 object-contain"
            />
          </Link>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`px-3 py-2 rounded-md text-sm font-medium flex items-center transition-colors ${
                  isActive(item.href)
                    ? "text-emerald-600 bg-emerald-50"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                <item.icon className="mr-2 h-4 w-4" />
                {item.name}
              </Link>
            ))}
          </nav>
        </div>
        
        {/* Right section with authentication */}
        <div className="flex items-center space-x-4">
          {isAuthorized ? (
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-gray-700 hidden sm:inline-block">
                {user?.name || user?.email || 'Usuario'}
              </span>
              <LogoutButton variant="outline" />
            </div>
          ) : (
            <div className="flex gap-2">
              <Button 
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleLogin}
              >
                <LogIn className="mr-2 h-4 w-4" />
                <span className="whitespace-nowrap">Iniciar Sesión</span>
              </Button>
              <Button
                variant="outline"
                onClick={handleGoogleLogin}
              >
                <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                  <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                    <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"/>
                    <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"/>
                    <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"/>
                    <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"/>
                  </g>
                </svg>
                Google
              </Button>
            </div>
          )}
          
          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden rounded-md"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
            <span className="sr-only">Toggle menu</span>
          </Button>
        </div>
      </div>
      
      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 py-2 px-4">
          <nav className="flex flex-col space-y-1 max-w-[1440px] mx-auto">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive(item.href)
                    ? "text-emerald-600 bg-emerald-50"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <item.icon className="mr-2 h-4 w-4" />
                {item.name}
              </Link>
            ))}
            
            {/* Mobile authentication */}
            {!isAuthorized && (
              <div className="px-3 py-3 mt-2 space-y-2">
                <Button 
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={handleLogin}
                >
                  <LogIn className="mr-2 h-4 w-4" />
                  <span className="whitespace-nowrap">Iniciar Sesión</span>
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleGoogleLogin}
                >
                  <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                    <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                      <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"/>
                      <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"/>
                      <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"/>
                      <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"/>
                    </g>
                  </svg>
                  Google
                </Button>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
} 
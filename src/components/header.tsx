"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth0 } from "@auth0/auth0-react";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Menu, FileText, ShoppingBag, Users, LogIn, DollarSign, LogOut, User as UserIcon } from "lucide-react";
import LogoutButton from "@/components/auth/logout-button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

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

  // Helper to get initials
  const getInitials = (name = '') => {
    const names = name.split(' ');
    const initials = names.map(n => n[0]).join('');
    return initials.toUpperCase().substring(0, 2); // Max 2 initials
  };

  // If still loading auth state, show a minimal loading indicator
  if (isLoading && !hasCookie) {
    return (
      <header className="w-full bg-white border-b border-border h-16">
        <div className="flex h-full items-center justify-between">
          <div className="flex items-center">
            <Link href="/dashboard" className="flex items-center">
              <img src="/logo.png" alt="Funny Kitchen" className="h-10 object-contain" />
            </Link>
          </div>
          <div className="h-8 w-8 rounded-full bg-muted animate-pulse mr-4"></div>
        </div>
      </header>
    );
  }

  // Consider user authenticated if either Auth0 state reports authenticated or we have a cookie
  const isAuthorized = isAuthenticated || hasCookie;

  return (
    <header className="w-full bg-background sticky top-0 z-40 border-b border-border">
      <div className="w-full mx-auto px-6 sm:px-8 lg:px-10">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Link href="/dashboard" className="flex items-center mr-6 flex-shrink-0">
              <img
                src="/logo.png"
                alt="Funny Kitchen"
                className="h-9 object-contain"
              />
            </Link>
            
            <nav className="hidden md:flex items-center space-x-6">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "px-3 py-2 rounded-md text-sm flex items-center transition-colors",
                    isActive(item.href)
                      ? "font-semibold text-primary"
                      : "font-medium text-muted-foreground hover:text-foreground"
                  )}
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="hidden md:flex items-center space-x-3">
              {isAuthorized ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user?.picture} alt={user?.name || 'User'} />
                        <AvatarFallback>
                          {user?.name ? getInitials(user.name) : <UserIcon className="h-4 w-4" />}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {user?.name || 'Usuario'}
                        </p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {user?.email}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                      {/* Add other links here if needed, e.g., Profile, Settings */}
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <LogoutButton>
                       <DropdownMenuItem className="cursor-pointer">
                         <LogOut className="mr-2 h-4 w-4" />
                         <span>Cerrar Sesión</span>
                       </DropdownMenuItem>
                     </LogoutButton>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="flex gap-2">
                  <Button 
                    variant="default"
                    size="sm"
                    onClick={handleLogin}
                  >
                    <LogIn className="mr-2 h-4 w-4" />
                    Iniciar Sesión
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGoogleLogin}
                  >
                    <svg className="h-4 w-4 mr-1.5" viewBox="0 0 24 24">
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
            </div>
            
            <div className="md:hidden">
              <Sheet>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-md"
                  >
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Toggle menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-full max-w-xs p-4">
                  <SheetHeader className="mb-4 border-b pb-4">
                    <Link href="/dashboard" className="flex items-center">
                      <img src="/logo.png" alt="Funny Kitchen" className="h-8 object-contain" />
                    </Link>
                    <SheetTitle className="sr-only">Menú Principal</SheetTitle>
                  </SheetHeader>
                  <nav className="flex flex-col space-y-2">
                    {navigation.map((item) => (
                      <SheetClose asChild key={item.name}>
                        <Link
                          href={item.href}
                          className={cn(
                            "flex items-center px-3 py-2 rounded-md text-base font-medium transition-colors",
                            isActive(item.href)
                              ? "text-emerald-600 bg-emerald-50"
                              : "text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                          )}
                        >
                          <item.icon className="mr-3 h-5 w-5" />
                          {item.name}
                        </Link>
                      </SheetClose>
                    ))}
                    
                    <div className="border-t pt-4 mt-4 space-y-2">
                      {isAuthorized ? (
                        <>
                          <div className="px-3 py-2 text-sm font-medium text-gray-700">
                            {user?.name || user?.email || 'Usuario'}
                          </div>
                          <SheetClose asChild>
                            <LogoutButton variant="ghost" className="w-full justify-start">
                              <LogOut className="mr-2 h-4 w-4" />
                              Cerrar Sesión
                            </LogoutButton>
                          </SheetClose>
                        </>
                      ) : (
                        <>
                          <SheetClose asChild>
                            <Button 
                              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white justify-start"
                              onClick={handleLogin}
                            >
                              <LogIn className="mr-2 h-4 w-4" />
                              Iniciar Sesión
                            </Button>
                          </SheetClose>
                          <SheetClose asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-start"
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
                              <span className="ml-2">Google</span>
                            </Button>
                          </SheetClose>
                        </>
                      )}
                    </div>
                  </nav>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
} 
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isLoading, loginWithRedirect } = useAuth0();
  
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
          {isLoading ? (
            <div className="h-10 w-10 rounded-full bg-gray-200 animate-pulse"></div>
          ) : user ? (
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-gray-700 hidden sm:inline-block">
                {user.name || user.email}
              </span>
              <LogoutButton variant="outline" />
            </div>
          ) : (
            <Button 
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => loginWithRedirect()}
            >
              <LogIn className="mr-2 h-4 w-4" />
              <span className="whitespace-nowrap">Iniciar Sesión</span>
            </Button>
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
            {!user && !isLoading && (
              <div className="px-3 py-3 mt-2">
                <Button 
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => loginWithRedirect()}
                >
                  <LogIn className="mr-2 h-4 w-4" />
                  <span className="whitespace-nowrap">Iniciar Sesión</span>
                </Button>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
} 
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
// import { useAuth0 } from "@auth0/auth0-react";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Menu, X, FileText, ShoppingBag, Users, LogIn, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
// import UserDropdown from "@/components/auth/user-dropdown";

// Improved navigation items for a more general app with multiple modules
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
  // Productos and Clientes modules temporarily disabled
  // {
  //   name: "Productos",
  //   href: "/dashboard/productos",
  //   icon: ShoppingBag,
  // },
  // {
  //   name: "Clientes",
  //   href: "/dashboard/clientes",
  //   icon: Users,
  // }
];

const LayoutHeader = () => {
  // const { isAuthenticated, isLoading } = useAuth0();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Check if a given path is active
  const isActive = (path: string) => {
    // Add null check for pathname
    return pathname ? pathname === path || pathname.startsWith(path) : false;
  };
  
  // Mobile menu navigation logic
  const handleMobileLinkClick = () => {
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
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
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <nav className="flex items-center">
            {/* Remove UserDropdown and conditional rendering */}
            {/* {!isLoading && isAuthenticated && (
              <UserDropdown />
            )} */}
          </nav>
          
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
        <div className="absolute top-16 left-0 w-full bg-white shadow-md py-4 px-6 md:hidden z-40">
          <nav className="flex flex-col space-y-3">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                onClick={handleMobileLinkClick}
                className={cn(
                  "flex items-center px-3 py-2 rounded-md text-base font-medium transition-colors",
                  isActive(item.href)
                    ? "bg-muted text-primary font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <item.icon className={cn(
                  "mr-3 h-5 w-5", 
                  isActive(item.href) ? "text-primary" : "text-muted-foreground"
                )} />
                {item.name}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
};

export default LayoutHeader;
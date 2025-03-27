"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { ShoppingCart, LayoutDashboard, ClipboardList, ChefHat, Users, Settings, User, LogOut, Menu, X, Plus } from "lucide-react";
import { useCart } from "@/contexts/cart-context";

// Navigation items
const navigation = [
  {
    name: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    name: "Cotizaciones",
    href: "/cotizaciones",
    icon: ClipboardList,
  },
  {
    name: "Productos",
    href: "/productos",
    icon: ChefHat,
  },
  {
    name: "Clientes",
    href: "/clientes",
    icon: Users,
  },
];

export function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { totalItems } = useCart();
  
  // Check if a given path is active
  const isActive = (path: string) => {
    if (path === "/" && pathname !== "/") return false;
    return pathname === path || pathname.startsWith(path);
  };

  return (
    <header className="w-full mx-auto max-w-[1440px]">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        {/* Left section with logo */}
        <div className="flex items-center">
          <Link href="/" className="flex items-center mr-6">
            <Image
              src="/logo.png"
              alt="Funny Kitchen"
              width={36}
              height={36}
              className="mr-2"
            />
            <span className="font-medium text-xl">Funny Kitchen</span>
          </Link>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive(item.href)
                    ? "text-teal-700 bg-teal-50"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                {item.name}
              </Link>
            ))}
          </nav>
        </div>
        
        {/* Right section with actions */}
        <div className="flex items-center space-x-2">
          {/* Create New Quotation Button */}
          <Link href="/nueva-cotizacion" className="hidden sm:flex">
            <Button 
              size="sm" 
              className="bg-teal-500 hover:bg-teal-600 text-white rounded-lg"
            >
              <Plus className="mr-1 h-4 w-4" />
              Nueva cotización
            </Button>
          </Link>
          
          {/* Settings Link */}
          <Link 
            href="/configuracion" 
            className={`p-2 rounded-lg ${
              isActive("/configuracion")
                ? "text-teal-700 bg-teal-50"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            }`}
          >
            <Settings className="h-5 w-5" />
            <span className="sr-only">Configuración</span>
          </Link>
          
          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon"
                className="rounded-lg hover:bg-gray-50"
              >
                <User className="h-5 w-5 text-gray-600" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="flex items-center justify-start gap-2 p-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-100">
                  <User className="h-4 w-4 text-teal-700" />
                </div>
                <div className="flex flex-col space-y-0.5">
                  <p className="text-sm font-medium">Admin</p>
                  <p className="text-xs text-gray-500">admin@funnykitchen.mx</p>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/configuracion" className="cursor-pointer w-full">
                  <Settings className="mr-2 h-4 w-4" />
                  Configuración
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <LogOut className="mr-2 h-4 w-4" /> 
                <span>Cerrar sesión</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden rounded-lg"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
            <span className="sr-only">Toggle menu</span>
          </Button>
        </div>
      </div>
      
      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 py-2 px-4">
          <nav className="flex flex-col space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive(item.href)
                    ? "text-teal-700 bg-teal-50"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <item.icon className="mr-2 h-5 w-5" />
                {item.name}
              </Link>
            ))}
            <Link
              href="/nueva-cotizacion"
              className="flex items-center px-3 py-2 mt-2 rounded-lg text-sm font-medium bg-teal-500 text-white hover:bg-teal-600 transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Plus className="mr-2 h-5 w-5" />
              Nueva cotización
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
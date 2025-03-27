"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, ClipboardList, Menu, X, Plus } from "lucide-react";

// Simplified navigation items
const navigation = [
  {
    name: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    name: "Nueva Cotización",
    href: "/nueva-cotizacion",
    icon: ClipboardList,
  }
];

export function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
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
              src="/assets/logo.svg"
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
          </nav>
        </div>
      )}
    </header>
  );
}
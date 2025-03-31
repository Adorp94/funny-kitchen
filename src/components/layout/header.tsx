"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, ClipboardCheck, Menu, X, Plus, BarChart3, FileText } from "lucide-react";

// Improved navigation items
const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard/cotizaciones",
    icon: BarChart3,
  },
  {
    name: "Nueva Cotización",
    href: "/nueva-cotizacion",
    icon: FileText,
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
    <header className="w-full mx-auto max-w-[1440px] bg-white border-b border-gray-100">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        {/* Left section with logo */}
        <div className="flex items-center">
          <Link href="/dashboard/cotizaciones" className="flex items-center mr-8">
            <img
              src="/logo.png"
              alt="Funny Kitchen"
              className="h-8 mr-2"
            />
            <span className="font-semibold text-lg text-gray-800">Funny Kitchen</span>
          </Link>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-4">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`px-3 py-2 rounded-md text-sm font-medium flex items-center transition-colors ${
                  isActive(item.href)
                    ? "text-teal-700 bg-teal-50"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                <item.icon className="mr-2 h-4 w-4" />
                {item.name}
              </Link>
            ))}
          </nav>
        </div>
        
        {/* Right section with actions */}
        <div className="flex items-center">
          {/* Create New Quotation Button */}
          <Link href="/nueva-cotizacion" className="hidden sm:flex">
            <Button 
              size="sm" 
              className="bg-teal-600 hover:bg-teal-700 text-white rounded-md"
            >
              <Plus className="mr-1 h-4 w-4" />
              Nueva cotización
            </Button>
          </Link>
          
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
          <nav className="flex flex-col space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive(item.href)
                    ? "text-teal-700 bg-teal-50"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <item.icon className="mr-2 h-4 w-4" />
                {item.name}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
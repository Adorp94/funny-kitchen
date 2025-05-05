"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Menu, FileText, ShoppingBag, Users, DollarSign } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
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

const Header = () => {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Check if a given path is active
  const isActive = (path: string) => pathname === path;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white shadow-sm">
      <nav className="container mx-auto flex items-center justify-between p-4">
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
                  "px-3 py-2 rounded-md text-sm font-medium flex items-center transition-colors",
                  isActive(item.href)
                    ? "bg-muted text-primary font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <item.icon className={cn(
                    "mr-2 h-4 w-4",
                    isActive(item.href) ? "text-primary" : "text-muted-foreground"
                  )} 
                />
                {item.name}
              </Link>
            ))}
          </nav>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="md:hidden">
            <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
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
                            ? "bg-muted text-primary font-semibold"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        )}
                      >
                        <item.icon className={cn(
                            "mr-3 h-5 w-5",
                            isActive(item.href) ? "text-primary" : "text-muted-foreground"
                          )} 
                        />
                        {item.name}
                      </Link>
                    </SheetClose>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Header; 
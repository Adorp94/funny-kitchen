"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Header } from "@/components/layout/header";
import { Toaster } from "react-hot-toast";
import { CartProvider } from "@/contexts/cart-context";
import { FloatingCart } from "@/components/cart/floating-cart";
import { initializeApp } from "@/lib/app-init";
import { usePathname } from "next/navigation";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  
  // Handle scroll event to add shadow to header when scrolled
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  
  // Initialize app resources on mount
  useEffect(() => {
    initializeApp();
  }, []);

  return (
    <CartProvider>
      <div className="flex flex-col min-h-screen bg-white">
        {/* Header with Navigation */}
        <div 
          className={`fixed top-0 left-0 right-0 z-40 bg-white transition-shadow duration-200 ${
            scrolled ? "shadow-md" : ""
          }`}
        >
          <Header />
        </div>
        
        {/* Main content with padding for fixed header */}
        <main className="flex-1 pt-16 bg-white">
          {/* Page container with nice max-width constraint */}
          <div className="mx-auto w-full max-w-[1440px]">
            {children}
          </div>
        </main>

        {/* Footer - Simple and elegant */}
        <footer className="py-6 px-4 sm:px-6 border-t border-gray-100">
          <div className="mx-auto w-full max-w-[1440px]">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="flex items-center mb-4 md:mb-0">
                <Image
                  src="/logo.png"
                  alt="Funny Kitchen"
                  width={24}
                  height={24}
                  className="mr-2"
                />
                <span className="text-sm text-gray-500">© {new Date().getFullYear()} Funny Kitchen</span>
              </div>
              <div className="flex space-x-4 text-sm text-gray-500">
                <Link href="/ayuda" className="hover:text-gray-900 transition-colors">Ayuda</Link>
                <Link href="/privacidad" className="hover:text-gray-900 transition-colors">Privacidad</Link>
                <Link href="/terminos" className="hover:text-gray-900 transition-colors">Términos</Link>
              </div>
            </div>
          </div>
        </footer>
      </div>

      {/* Floating cart */}
      <FloatingCart />
      
      {/* Toast notifications */}
      <Toaster 
        position="top-center"
        toastOptions={{
          className: 'rounded-md shadow-md px-3 py-3 bg-white border border-gray-100',
          duration: 3000,
          style: {
            fontWeight: 500,
            fontSize: '14px',
          }
        }}
      />
    </CartProvider>
  );
} 
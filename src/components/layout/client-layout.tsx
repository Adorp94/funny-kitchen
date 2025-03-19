"use client";

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Navigation } from "@/components/layout/navigation";
import { Toaster } from "react-hot-toast";
import { CartProvider } from "@/contexts/cart-context";
import { FloatingCart } from "@/components/cart/floating-cart";
import { initializeApp } from "@/lib/app-init";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  // Initialize app resources on mount
  useEffect(() => {
    initializeApp();
  }, []);

  return (
    <CartProvider>
      <div className="flex h-screen">
        {/* Sidebar */}
        <div className="w-16 lg:w-40 h-full bg-white border-r border-gray-200 flex flex-col p-2">
          <div className="flex justify-center py-3 mb-2">
            <Link href="/">
              <div className="relative h-8 w-8 lg:h-10 lg:w-10">
                <Image
                  src="/favicon.ico"
                  alt="Funny Kitchen"
                  fill
                  sizes="(max-width: 768px) 32px, 40px"
                  className="object-contain"
                />
              </div>
            </Link>
          </div>
          <Navigation />
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-auto bg-gray-50 text-slate-800">
          <main className="min-h-screen">{children}</main>
        </div>
      </div>

      {/* Floating cart */}
      <FloatingCart />
      
      {/* Toast notifications */}
      <Toaster position="top-right" />
    </CartProvider>
  );
} 
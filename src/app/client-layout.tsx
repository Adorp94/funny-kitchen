"use client";
import React, { useEffect, useState } from "react";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { usePathname } from "next/navigation";

interface ClientLayoutProps {
  children: React.ReactNode;
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  const [isMounted, setIsMounted] = useState(false);
  const pathname = usePathname();
  const isSignIn = pathname === "/";

  // Initialize on client-side only
  useEffect(() => {
    setIsMounted(true);
    console.log("[ClientLayout] Mounted, pathname:", pathname);
  }, [pathname]);

  // Don't render anything during SSR
  if (!isMounted) {
    return null;
  }

  return (
    <>
      {!isSignIn && <Header />}
      <div className="w-full mx-auto px-6 sm:px-8 lg:px-10">
        <div className="flex flex-col min-h-[calc(100vh-theme(space.16)-theme(space.16))] ">
          <main className="flex-1">
            {children}
          </main>
        </div>
      </div>
      {!isSignIn && <Footer />}
    </>
  );
} 
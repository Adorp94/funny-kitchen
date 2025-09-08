import "@/app/globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Toaster } from "@/components/ui/sonner";
import { ProductosProvider } from "@/contexts/productos-context";
import { AuthProvider } from "@/contexts/auth-context";
import { Separator } from "@/components/ui/separator";
import { DynamicBreadcrumb } from "@/components/dynamic-breadcrumb";
import { LayoutWrapper } from "@/components/layout-wrapper";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Funny Kitchen - Sistema de Cotizaciones",
  description: "Sistema de gestión de cotizaciones para Funny Kitchen",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={`${inter.className} antialiased text-sm`}>
        <AuthProvider>
          <ProductosProvider>
            <LayoutWrapper>{children}</LayoutWrapper>
            <Toaster />
          </ProductosProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
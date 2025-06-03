import "@/app/globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Funny Kitchen - Sistema de Cotizaciones",
  description: "Sistema de gestión de cotizaciones para Funny Kitchen",
};

import { ClientLayout } from "@/components/layout/client-layout";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={`${inter.className} antialiased text-foreground min-h-screen bg-gray-50/70`}>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
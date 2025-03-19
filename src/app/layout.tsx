import "@/app/globals.css";
import type { Metadata } from "next";
import { ClientLayout } from "@/components/layout/client-layout";

export const metadata: Metadata = {
  title: "Funny Kitchen",
  description: "Sistema de cotizaciones para Funny Kitchen",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-gray-50">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
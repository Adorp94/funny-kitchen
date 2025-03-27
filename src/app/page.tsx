"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  ClipboardList,
  FileText
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate data loading
    const timeout = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timeout);
  }, []);

  return (
    <main className="flex-1 p-6 overflow-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Link 
          href="/nueva-cotizacion"
          className="inline-flex items-center justify-center rounded-md font-medium bg-teal-500 text-white hover:bg-teal-600 h-10 px-4 py-2 transition-colors"
        >
          Nueva cotización
        </Link>
      </div>

      <div className="bg-white rounded-lg p-6 border border-gray-100 shadow-sm mb-8">
        <h2 className="text-lg font-medium mb-4">Versión Simplificada</h2>
        <p className="text-gray-600 mb-4">
          Esta es una versión simplificada de la aplicación Funny Kitchen diseñada para demostrar la funcionalidad básica del sistema de creación de cotizaciones.
        </p>
        <p className="text-gray-600 mb-6">
          Actualmente solo está disponible la funcionalidad para crear una nueva cotización con información básica del cliente.
        </p>
        <Link 
          href="/nueva-cotizacion"
          className="inline-flex items-center justify-center rounded-md font-medium bg-teal-500 text-white hover:bg-teal-600 h-10 px-4 py-2 transition-colors"
        >
          Crear Nueva Cotización
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Cotizaciones</CardTitle>
            <ClipboardList className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-5 w-16 bg-gray-200 animate-pulse rounded"></div>
            ) : (
              <div className="text-2xl font-bold">1</div>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Versión simplificada de demostración
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Acciones rápidas</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Link 
            href="/nueva-cotizacion"
            className="inline-flex items-center justify-center h-24 flex-col rounded-md font-medium border border-input bg-white hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <ClipboardList className="h-6 w-6 mb-2" />
            <span>Nueva cotización</span>
          </Link>
          <div 
            className="inline-flex items-center justify-center h-24 flex-col rounded-md font-medium border border-input bg-gray-50 text-gray-400 cursor-not-allowed"
          >
            <FileText className="h-6 w-6 mb-2" />
            <span>Ver cotizaciones (próximamente)</span>
          </div>
        </div>
      </div>
    </main>
  );
}
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  ChefHat,
  ClipboardList,
  CircleDollarSign,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

interface DashboardData {
  totalCotizaciones: number;
  pendientesCotizaciones: number;
  aceptadasCotizaciones: number;
  totalClientes: number;
  totalProductos: number;
  ventasMes: number;
}

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<DashboardData>({
    totalCotizaciones: 0,
    pendientesCotizaciones: 0,
    aceptadasCotizaciones: 0,
    totalClientes: 0,
    totalProductos: 0,
    ventasMes: 0,
  });

  useEffect(() => {
    // Simulating data loading
    const timeout = setTimeout(() => {
      setData({
        totalCotizaciones: 32,
        pendientesCotizaciones: 12,
        aceptadasCotizaciones: 20,
        totalClientes: 28,
        totalProductos: 45,
        ventasMes: 124500,
      });
      setIsLoading(false);
    }, 1500);

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
              <div className="text-2xl font-bold">{data.totalCotizaciones}</div>
            )}
            <p className="text-xs text-gray-500 mt-1">
              {data.pendientesCotizaciones} pendientes, {data.aceptadasCotizaciones} aceptadas
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-5 w-16 bg-gray-200 animate-pulse rounded"></div>
            ) : (
              <div className="text-2xl font-bold">{data.totalClientes}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Total de clientes registrados
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Productos</CardTitle>
            <ChefHat className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-5 w-16 bg-gray-200 animate-pulse rounded"></div>
            ) : (
              <div className="text-2xl font-bold">{data.totalProductos}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              En catálogo
            </p>
          </CardContent>
        </Card>
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Ventas del mes</CardTitle>
            <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-7 w-32 bg-gray-200 animate-pulse rounded"></div>
            ) : (
              <div className="text-3xl font-bold">{formatCurrency(data.ventasMes)}</div>
            )}
            <div className="flex items-center mt-2">
              <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
              <p className="text-xs text-green-500">+8% mes anterior</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Acciones rápidas</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Link 
            href="/nueva-cotizacion"
            className="inline-flex items-center justify-center h-24 flex-col rounded-md font-medium border border-input bg-white hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <ClipboardList className="h-6 w-6 mb-2" />
            <span>Nueva cotización</span>
          </Link>
          <Link 
            href="/clientes"
            className="inline-flex items-center justify-center h-24 flex-col rounded-md font-medium border border-input bg-white hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <Users className="h-6 w-6 mb-2" />
            <span>Ver clientes</span>
          </Link>
          <Link 
            href="/productos"
            className="inline-flex items-center justify-center h-24 flex-col rounded-md font-medium border border-input bg-white hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <ChefHat className="h-6 w-6 mb-2" />
            <span>Administrar productos</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
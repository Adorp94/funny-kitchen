"use client";

import React, { useEffect, useState } from 'react';
import Link from "next/link";
import { ProtectedRoute } from "@/components/protected-route";
import { usePermissions } from "@/hooks/use-permissions";
import { FileText, DollarSign, Package, Factory } from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const DashboardSkeleton = () => {
  const MetricCardSkeleton = () => (
    <Card className="border-0 shadow-sm bg-card">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <Skeleton className="h-6 w-16" />
      </CardContent>
    </Card>
  );

  return (
    <div className="flex flex-col flex-1 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-6 w-32 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>

      <div className="w-full max-w-sm">
        <MetricCardSkeleton />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-0 shadow-sm bg-card">
          <CardHeader className="pb-3">
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center space-x-3 p-3">
                  <Skeleton className="h-8 w-8 rounded-lg" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-24 mb-1" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-card">
          <CardHeader className="pb-3">
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center justify-between p-3">
                  <div className="flex items-center space-x-3">
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <Skeleton className="h-3 w-12" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Module cards configuration
const moduleCards = [
  {
    title: "Cotizaciones",
    description: "Gestiona tus cotizaciones",
    icon: FileText,
    href: "/dashboard/cotizaciones",
  },
  {
    title: "Producción", 
    description: "Seguimiento de órdenes",
    icon: Factory,
    href: "/produccion",
  },
  {
    title: "Finanzas",
    description: "Ingresos y egresos", 
    icon: DollarSign,
    href: "/dashboard/finanzas",
  },
];

export default function DashboardPage() {
  const { hasAccess } = usePermissions();
  const [metrics, setMetrics] = useState<{
    totalCotizaciones: number;
    valorTotal: number;
    productosUnicos: number;
  } | null>(null);
  const [isDataLoading, setIsDataLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setIsDataLoading(true);
        const response = await fetch('/api/cotizaciones/count');
        if (response.ok) {
          const data = await response.json();
          setMetrics({
            totalCotizaciones: data.total || 0,
            valorTotal: data.valorTotal || 0,
            productosUnicos: data.productosUnicos || 0,
          });
        } else {
          setMetrics(null);
        }
      } catch (error) {
        console.error('Error fetching metrics:', error);
        setMetrics(null);
      } finally {
        setIsDataLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  if (isDataLoading) {
    return <DashboardSkeleton />;
  }

  // Filter modules based on user permissions
  const accessibleModules = moduleCards.filter(module => {
    // Map module hrefs to permission keys
    if (module.href === "/dashboard/cotizaciones") return hasAccess("cotizaciones");
    if (module.href === "/produccion") return hasAccess("produccion");
    if (module.href === "/dashboard/finanzas") return hasAccess("finanzas");
    return true; // Default allow for unknown modules
  });

  return (
    <ProtectedRoute requiredModule="dashboard">
      <div className="flex flex-col flex-1 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-foreground"> 
              Dashboard
            </h1>
            <p className="text-sm text-muted-foreground">
              Resumen general de la actividad de Funny Kitchen.
            </p>
          </div>
        </div>

      <div className="w-full max-w-sm">
        {metrics ? (
          <Card className="border-0 shadow-sm bg-white dark:bg-gray-900/50 border-l-4 border-l-emerald-500">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Cotizaciones Totales
                </CardTitle>
                <div className="p-1.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-md">
                  <FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{metrics.totalCotizaciones}</div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-0 shadow-sm bg-red-50 dark:bg-red-950/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-red-600 dark:text-red-400">
                Error
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-red-600/80 dark:text-red-400/80">
                No se pudieron cargar las métricas
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-0 shadow-sm bg-white dark:bg-gray-900/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100">Módulos del Sistema</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 gap-3">
              {accessibleModules.map((module, index) => {
                const iconBackgrounds = [
                  "bg-emerald-50 dark:bg-emerald-900/20",
                  "bg-purple-50 dark:bg-purple-900/20",
                  "bg-amber-50 dark:bg-amber-900/20",
                  "bg-blue-50 dark:bg-blue-900/20"
                ];
                const iconColors = [
                  "text-emerald-600 dark:text-emerald-400",
                  "text-purple-600 dark:text-purple-400",
                  "text-amber-600 dark:text-amber-400",
                  "text-blue-600 dark:text-blue-400"
                ];
                const borderColors = [
                  "hover:border-emerald-200 dark:hover:border-emerald-800",
                  "hover:border-purple-200 dark:hover:border-purple-800",
                  "hover:border-amber-200 dark:hover:border-amber-800",
                  "hover:border-blue-200 dark:hover:border-blue-800"
                ];
                return (
                  <Link
                    key={module.title}
                    href={module.href}
                    className={`flex items-center space-x-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${borderColors[index]}`}
                  >
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconBackgrounds[index]}`}>
                      <module.icon className={`h-4 w-4 ${iconColors[index]}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{module.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{module.description}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white dark:bg-gray-900/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100">Accesos Rápidos</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {hasAccess("cotizaciones") && (
                <Link
                  href="/nueva-cotizacion"
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-teal-50 dark:hover:bg-teal-900/10 hover:border-teal-200 dark:hover:border-teal-800 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <FileText className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Nueva Cotización</span>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">Ctrl+N</span>
                </Link>
              )}
              
              {hasAccess("produccion") && (
                <Link
                  href="/produccion"
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-rose-50 dark:hover:bg-rose-900/10 hover:border-rose-200 dark:hover:border-rose-800 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <Factory className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Ver Producción</span>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">Ctrl+P</span>
                </Link>
              )}
              
              {hasAccess("finanzas") && (
                <Link
                  href="/dashboard/finanzas"
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <DollarSign className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Finanzas</span>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">Ctrl+F</span>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      </div>
    </ProtectedRoute>
  );
} 
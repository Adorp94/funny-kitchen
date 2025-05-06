"use client";

import React, { useEffect, useState, Suspense } from 'react';
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FileText, ShoppingBag, Users, TrendingUp, ClipboardList, DollarSign, Loader2 } from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface DashboardMetrics {
  cotizaciones: number;
  ingresos: number;
  egresos: number;
}

function DashboardPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);

  useEffect(() => {
    // ... existing logic for search params ...
  }, [searchParams]);

  useEffect(() => {
    if (isDataLoading) {
      console.log("[Dashboard] User is authorized, fetching dashboard data");
      setIsDataLoading(true);
      
      const fetchDashboardData = async () => {
        try {
          // Fetch real metrics from the database
          const [cotizacionesRes, ingresosRes, egresosRes] = await Promise.all([
            fetch('/api/cotizaciones/count'),
            fetch('/api/pagos/total'),
            fetch('/api/egresos/total')
          ]);
          
          let cotizacionesCount = 0;
          let ingresosTotal = 0;
          let egresosTotal = 0;
          
          if (cotizacionesRes.ok) {
            const cotizacionesData = await cotizacionesRes.json();
            cotizacionesCount = cotizacionesData.count || 0;
          }
          
          if (ingresosRes.ok) {
            const ingresosData = await ingresosRes.json();
            ingresosTotal = ingresosData.total || 0;
          }
          
          if (egresosRes.ok) {
            const egresosData = await egresosRes.json();
            egresosTotal = egresosData.total || 0;
          }
          
          setMetrics({
            cotizaciones: cotizacionesCount,
            ingresos: ingresosTotal,
            egresos: egresosTotal,
          });
        } catch (error) {
          console.error("[Dashboard] Error fetching dashboard data:", error);
          setMetrics({ cotizaciones: 0, ingresos: 0, egresos: 0 });
        } finally {
          setIsDataLoading(false);
        }
      };
      
      fetchDashboardData();
    }
  }, [isDataLoading]);

  const handleNavigate = (path: string) => {
    router.push(path);
  };

  const MetricCardSkeleton = () => (
    <Card className="p-4 shadow-sm">
      <CardHeader className="p-0 mb-1 flex flex-row items-center justify-between space-y-0 pb-1">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-4" />
      </CardHeader>
      <CardContent className="p-0">
        <Skeleton className="h-7 w-16" />
      </CardContent>
    </Card>
  );

  const ModuleCardSkeleton = () => (
    <Card className="flex flex-col h-full shadow-sm p-5">
      <CardHeader className="flex flex-col items-center p-0 pb-3">
        <Skeleton className="h-9 w-9 rounded-lg mb-2" />
        <Skeleton className="h-5 w-3/4 mb-1" />
        <Skeleton className="h-3 w-1/2" />
      </CardHeader>
      <CardContent className="flex-1 p-0 mb-3">
        <Skeleton className="h-3 w-full mb-1" />
        <Skeleton className="h-3 w-5/6 mb-1" />
        <Skeleton className="h-3 w-4/6" />
      </CardContent>
      <CardFooter className="p-0">
        <Skeleton className="h-9 w-full" />
      </CardFooter>
    </Card>
  );

  return (
    <div className="flex flex-col flex-1 py-6 md:py-8 gap-y-6 md:gap-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-100 mb-1"> 
          Dashboard Principal
        </h1>
        <p className="text-sm text-muted-foreground">
          Un resumen de la actividad reciente de Funny Kitchen.
        </p>
      </header>

      <section>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          {isDataLoading ? (
            <>
              <MetricCardSkeleton />
              <MetricCardSkeleton />
              <MetricCardSkeleton />
            </>
          ) : metrics ? (
            <>
              <Card className="shadow-sm p-4">
                <CardHeader className="p-0 flex flex-row items-center justify-between space-y-0 pb-1">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Cotizaciones
                  </CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="p-0">
                  <div className="text-2xl font-bold">
                    {metrics.cotizaciones}
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-sm p-4">
                <CardHeader className="p-0 flex flex-row items-center justify-between space-y-0 pb-1">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Ingresos
                  </CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="p-0">
                  <div className="text-2xl font-bold">
                    ${metrics.ingresos.toLocaleString()}
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-sm p-4">
                <CardHeader className="p-0 flex flex-row items-center justify-between space-y-0 pb-1">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Egresos
                  </CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="p-0">
                  <div className="text-2xl font-bold">
                    ${metrics.egresos.toLocaleString()}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
             <p className="text-destructive col-span-3">Error al cargar las métricas.</p>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold tracking-tight text-gray-900 dark:text-gray-100 mb-4 md:mb-5">
           Módulos Principales
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          {isDataLoading ? (
             <>
               <ModuleCardSkeleton />
               <ModuleCardSkeleton />
               <ModuleCardSkeleton />
               <ModuleCardSkeleton />
               <ModuleCardSkeleton />
               <ModuleCardSkeleton />
             </>
          ) : (
            <>
             <Card className="group flex flex-col h-full shadow-sm transition-shadow hover:shadow-md p-5">
               <CardHeader className="flex flex-col items-center p-0 pb-3">
                 <div className="bg-emerald-100 dark:bg-emerald-900/30 rounded-lg p-2 mb-2">
                   <FileText className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                 </div>
                 <CardTitle className="text-base font-semibold text-center">Cotizaciones</CardTitle> 
                 <CardDescription className="text-center text-xs mt-1">Gestiona tus cotizaciones</CardDescription>
               </CardHeader>
               <CardContent className="flex-1 p-0 mb-4">
                 <p className="text-xs text-muted-foreground text-center">
                   Crea, edita y administra tus cotizaciones. Revisa el estado de las pendientes.
                 </p>
               </CardContent>
               <CardFooter className="p-0">
                 <Button 
                   variant="outline"
                   size="sm" 
                   className="w-full"
                   onClick={() => handleNavigate('/dashboard/cotizaciones')}
                 >
                   Ir a Cotizaciones
                 </Button>
               </CardFooter>
             </Card>
             
             <Card className="group flex flex-col h-full shadow-sm transition-shadow hover:shadow-md p-5">
                <CardHeader className="flex flex-col items-center p-0 pb-3">
                  <div className="bg-red-100 dark:bg-red-900/30 rounded-lg p-2 mb-2">
                    <DollarSign className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                  <CardTitle className="text-base font-semibold text-center">Finanzas</CardTitle> 
                  <CardDescription className="text-center text-xs mt-1">Ingresos y Egresos</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 p-0 mb-4">
                  <p className="text-xs text-muted-foreground text-center">
                    Registra y visualiza tus movimientos financieros, pagos y gastos.
                  </p>
                </CardContent>
                <CardFooter className="p-0">
                  <Button 
                    variant="outline"
                    size="sm" 
                    className="w-full"
                    onClick={() => handleNavigate('/dashboard/finanzas')}
                  >
                    Ir a Finanzas
                  </Button>
                </CardFooter>
              </Card>

              <Card className="group flex flex-col h-full shadow-sm p-5 opacity-60 cursor-not-allowed">
                <CardHeader className="flex flex-col items-center p-0 pb-3">
                  <div className="bg-blue-100 dark:bg-blue-900/30 rounded-lg p-2 mb-2">
                    <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <CardTitle className="text-base font-semibold text-center">Clientes</CardTitle> 
                  <CardDescription className="text-center text-xs mt-1">Administra tus clientes</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 p-0 mb-4">
                  <p className="text-xs text-muted-foreground text-center">
                    Consulta, añade y modifica la información de contacto y datos de tus clientes.
                  </p>
                </CardContent>
                <CardFooter className="p-0">
                  <Button 
                    variant="outline"
                    size="sm" 
                    className="w-full"
                    disabled
                    title="Módulo en desarrollo"
                  >
                    Ir a Clientes
                  </Button>
                </CardFooter>
              </Card>

              <Card className="group flex flex-col h-full shadow-sm p-5 opacity-60 cursor-not-allowed">
                <CardHeader className="flex flex-col items-center p-0 pb-3">
                  <div className="bg-yellow-100 dark:bg-yellow-900/30 rounded-lg p-2 mb-2">
                    <ShoppingBag className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <CardTitle className="text-base font-semibold text-center">Inventario</CardTitle> 
                  <CardDescription className="text-center text-xs mt-1">Controla tu stock</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 p-0 mb-4">
                  <p className="text-xs text-muted-foreground text-center">
                    Gestiona productos, materiales y niveles de stock para una mejor planificación.
                  </p>
                </CardContent>
                <CardFooter className="p-0">
                  <Button 
                    variant="outline"
                    size="sm" 
                    className="w-full"
                    disabled
                    title="Módulo en desarrollo"
                  >
                    Ir a Inventario
                  </Button>
                </CardFooter>
              </Card>
              
              <Card className="group flex flex-col h-full shadow-sm transition-shadow hover:shadow-md p-5">
                <CardHeader className="flex flex-col items-center p-0 pb-3">
                  <div className="bg-purple-100 dark:bg-purple-900/30 rounded-lg p-2 mb-2">
                    <ClipboardList className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <CardTitle className="text-base font-semibold text-center">Producción</CardTitle> 
                  <CardDescription className="text-center text-xs mt-1">Seguimiento de órdenes</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 p-0 mb-4">
                  <p className="text-xs text-muted-foreground text-center">
                    Visualiza y gestiona el estado de las órdenes en la cola de producción.
                  </p>
                </CardContent>
                <CardFooter className="p-0">
                  <Button 
                    variant="outline"
                    size="sm" 
                    className="w-full"
                    onClick={() => handleNavigate('/produccion')}
                  >
                    Ir a Producción
                  </Button>
                </CardFooter>
              </Card>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

// Define DashboardSkeleton component
const DashboardSkeleton = () => {
  const MetricCardSkeleton = () => (
    <Card className="p-4 shadow-sm">
      <CardHeader className="p-0 mb-1 flex flex-row items-center justify-between space-y-0 pb-1">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-4" />
      </CardHeader>
      <CardContent className="p-0">
        <Skeleton className="h-7 w-16" />
      </CardContent>
    </Card>
  );

  const ModuleCardSkeleton = () => (
    <Card className="flex flex-col h-full shadow-sm p-5">
      <CardHeader className="flex flex-col items-center p-0 pb-3">
        <Skeleton className="h-9 w-9 rounded-lg mb-2" />
        <Skeleton className="h-5 w-3/4 mb-1" />
        <Skeleton className="h-3 w-1/2" />
      </CardHeader>
      <CardContent className="flex-1 p-0 mb-3">
        <Skeleton className="h-3 w-full mb-1" />
        <Skeleton className="h-3 w-5/6 mb-1" />
        <Skeleton className="h-3 w-4/6" />
      </CardContent>
      <CardFooter className="p-0">
        <Skeleton className="h-9 w-full" />
      </CardFooter>
    </Card>
  );

  return (
    <div className="flex flex-col flex-1 py-6 md:py-8 gap-y-6 md:gap-y-8">
      <header>
        <Skeleton className="h-7 w-1/2 mb-2" /> 
        <Skeleton className="h-4 w-3/4" />
      </header>
      <section>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          <MetricCardSkeleton />
          <MetricCardSkeleton />
          <MetricCardSkeleton />
        </div>
      </section>
      <section>
        <Skeleton className="h-6 w-1/3 mb-4 md:mb-5" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          <ModuleCardSkeleton />
          <ModuleCardSkeleton />
          <ModuleCardSkeleton />
          <ModuleCardSkeleton />
          <ModuleCardSkeleton />
          <ModuleCardSkeleton />
        </div>
      </section>
    </div>
  );
};

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardPageContent />
    </Suspense>
  );
} 
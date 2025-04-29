"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { useAuth0 } from "@auth0/auth0-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface DashboardMetrics {
  cotizaciones: number;
  ingresos: number;
  egresos: number;
}

export default function DashboardPage() {
  const { isAuthenticated, isLoading: isAuthLoading, user } = useAuth0();
  const router = useRouter();
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);

  // Log authentication state for debugging
  console.log("[Dashboard] Auth state:", { isAuthenticated, isAuthLoading, user });

  // Run only once on component mount to check authentication
  useEffect(() => {
    if (!isAuthLoading) {
      if (isAuthenticated) {
        console.log("[Dashboard] User is authenticated with Auth0, showing dashboard");
        setIsAuthorized(true);
      } else {
        console.log("[Dashboard] User is not authenticated, redirecting to login");
        router.push('/');
      }
    }
  }, [isAuthenticated, isAuthLoading, router]);
  
  // Fetch dashboard data when authentication is confirmed
  useEffect(() => {
    if (isAuthorized) {
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
  }, [isAuthorized]);
  
  // Combined loading state for initial auth check
  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
        <div className="flex flex-col items-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="mt-4 text-sm text-muted-foreground">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  // If not authorized and not loading auth, don't render anything (will redirect)
  if (!isAuthorized) {
    return null;
  }

  const handleNavigate = (path: string) => {
    router.push(path);
  };

  // Skeleton components slightly adjusted for new design
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
                   className="w-full border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-900/30"
                   size="sm" 
                   onClick={() => handleNavigate('/dashboard/cotizaciones')}
                 >
                   Ir a Cotizaciones
                 </Button>
               </CardFooter>
             </Card>
             
             <Card className="group flex flex-col h-full shadow-sm transition-shadow hover:shadow-md p-5">
                <CardHeader className="flex flex-col items-center p-0 pb-3">
                  <div className="bg-emerald-100 dark:bg-emerald-900/30 rounded-lg p-2 mb-2">
                    <DollarSign className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <CardTitle className="text-base font-semibold text-center">Finanzas</CardTitle>
                  <CardDescription className="text-center text-xs mt-1">Gestión de pagos</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 p-0 mb-4">
                  <p className="text-xs text-muted-foreground text-center">
                    Administra pagos, anticipos y el estado financiero de las cotizaciones.
                  </p>
                </CardContent>
                <CardFooter className="p-0">
                  <Button 
                    variant="outline"
                    className="w-full border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-900/30"
                    size="sm" 
                    onClick={() => handleNavigate('/dashboard/finanzas')}
                  >
                    Ir a Finanzas
                  </Button>
                </CardFooter>
              </Card>

              <Card className={cn(
                  "flex flex-col h-full shadow-sm p-5",
                  "bg-gray-50 dark:bg-gray-900 opacity-70 cursor-not-allowed"
               )}>
                <CardHeader className="flex flex-col items-center p-0 pb-3">
                  <div className="bg-gray-200 dark:bg-gray-700 rounded-lg p-2 mb-2">
                    <ShoppingBag className="h-6 w-6 text-gray-500 dark:text-gray-400" />
                  </div>
                  <CardTitle className="text-base font-semibold text-center">Productos</CardTitle>
                  <CardDescription className="text-center text-xs mt-1">Administra tu catálogo</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 p-0 mb-4">
                  <p className="text-xs text-muted-foreground text-center">
                    Agrega, edita y organiza tus productos. Controla precios, inventario y categorías.
                  </p>
                </CardContent>
                <CardFooter className="p-0">
                  <Button variant="secondary" className="w-full text-muted-foreground" size="sm" disabled>
                    Próximamente
                  </Button>
                </CardFooter>
              </Card>
              
              <Card className={cn(
                  "flex flex-col h-full shadow-sm p-5",
                  "bg-gray-50 dark:bg-gray-900 opacity-70 cursor-not-allowed"
               )}>
                <CardHeader className="flex flex-col items-center p-0 pb-3">
                  <div className="bg-gray-200 dark:bg-gray-700 rounded-lg p-2 mb-2">
                    <Users className="h-6 w-6 text-gray-500 dark:text-gray-400" />
                  </div>
                  <CardTitle className="text-base font-semibold text-center">Clientes</CardTitle>
                  <CardDescription className="text-center text-xs mt-1">Gestiona tus clientes</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 p-0 mb-4">
                  <p className="text-xs text-muted-foreground text-center">
                    Administra información de clientes, historial de pedidos y datos de contacto.
                  </p>
                </CardContent>
                <CardFooter className="p-0">
                  <Button variant="secondary" className="w-full text-muted-foreground" size="sm" disabled>
                    Próximamente
                  </Button>
                </CardFooter>
              </Card>
              
              <Card className="group flex flex-col h-full shadow-sm transition-shadow hover:shadow-md p-5">
                <CardHeader className="flex flex-col items-center p-0 pb-3">
                  <div className="bg-emerald-100 dark:bg-emerald-900/30 rounded-lg p-2 mb-2">
                    <TrendingUp className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <CardTitle className="text-base font-semibold text-center">Reportes</CardTitle>
                  <CardDescription className="text-center text-xs mt-1">Analiza el rendimiento</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 p-0 mb-4">
                  <p className="text-xs text-muted-foreground text-center">
                    Visualiza reportes de ventas, productos más vendidos y estadísticas de clientes.
                  </p>
                </CardContent>
                <CardFooter className="p-0">
                   <Button 
                    variant="outline"
                    className="w-full border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-900/30"
                    size="sm" 
                    onClick={() => handleNavigate('/dashboard/reportes')}
                   >
                     Ir a Reportes
                   </Button>
                </CardFooter>
              </Card>
              
              <Card className="group flex flex-col h-full shadow-sm transition-shadow hover:shadow-md p-5">
                <CardHeader className="flex flex-col items-center p-0 pb-3">
                  <div className="bg-emerald-100 dark:bg-emerald-900/30 rounded-lg p-2 mb-2">
                    <ClipboardList className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <CardTitle className="text-base font-semibold text-center">Nueva Cotización</CardTitle>
                  <CardDescription className="text-center text-xs mt-1">Crea una nueva</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 p-0 mb-4">
                  <p className="text-xs text-muted-foreground text-center">
                    Acceso directo para crear una nueva cotización para tus clientes.
                  </p>
                </CardContent>
                <CardFooter className="p-0">
                  <Button 
                    variant="outline"
                    className="w-full border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-900/30"
                    size="sm" 
                    onClick={() => handleNavigate('/nueva-cotizacion')}
                  >
                    Nueva Cotización
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
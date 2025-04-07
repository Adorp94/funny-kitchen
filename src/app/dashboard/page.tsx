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

interface DashboardMetrics {
  cotizaciones: number;
  ingresos: number;
  egresos: number;
}

export default function DashboardPage() {
  const { isAuthenticated, isLoading, user } = useAuth0();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    cotizaciones: 0,
    ingresos: 0,
    egresos: 0,
  });

  // Log authentication state for debugging
  console.log("[Dashboard] Auth state:", { isAuthenticated, isLoading, user });

  // Run only once on component mount to check authentication
  useEffect(() => {
    // Simple authentication check based only on Auth0
    if (!isLoading) {
      if (isAuthenticated) {
        console.log("[Dashboard] User is authenticated with Auth0, showing dashboard");
        setIsAuthorized(true);
      } else {
        console.log("[Dashboard] User is not authenticated, redirecting to login");
        router.push('/');
      }
    }
  }, [isAuthenticated, isLoading, router]);
  
  // Fetch dashboard data when authentication is confirmed
  useEffect(() => {
    if (isAuthorized) {
      console.log("[Dashboard] User is authorized, fetching dashboard data");
      
      const fetchDashboardData = async () => {
        try {
          setLoading(true);
          
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
          // If we can't fetch real data, reset to zeros
          setMetrics({
            cotizaciones: 0,
            ingresos: 0,
            egresos: 0,
          });
        } finally {
          setLoading(false);
        }
      };
      
      fetchDashboardData();
    }
  }, [isAuthorized]);
  
  // Show loading state
  if (isLoading || loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center">
          <Loader2 className="h-12 w-12 animate-spin text-emerald-600" />
          <p className="mt-4 text-gray-600">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  // If not authorized and not loading, don't render anything (will redirect)
  if (!isAuthorized) {
    return null;
  }

  const handleNavigate = (path: string) => {
    router.push(path);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
      
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Cotizaciones</CardTitle>
            <CardDescription>Total de cotizaciones</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{metrics.cotizaciones}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Ingresos</CardTitle>
            <CardDescription>Total de ingresos</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">${metrics.ingresos.toLocaleString()}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Egresos</CardTitle>
            <CardDescription>Total de egresos</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">${metrics.egresos.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Modules grid */}
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Módulos</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="rounded-full bg-emerald-50 w-10 h-10 flex items-center justify-center mb-3">
              <FileText className="h-5 w-5 text-emerald-600" />
            </div>
            <CardTitle className="text-lg">Cotizaciones</CardTitle>
            <CardDescription>Gestiona tus cotizaciones y pedidos</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">
              Crea, edita y administra tus cotizaciones. Revisa el estado de las cotizaciones pendientes.
            </p>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={() => handleNavigate('/dashboard/cotizaciones')}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Ir a Cotizaciones
            </Button>
          </CardFooter>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="rounded-full bg-emerald-50 w-10 h-10 flex items-center justify-center mb-3">
              <DollarSign className="h-5 w-5 text-emerald-600" />
            </div>
            <CardTitle className="text-lg">Finanzas</CardTitle>
            <CardDescription>Gestión de pagos y anticipos</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">
              Administra pagos, anticipos y el estado financiero de las cotizaciones.
            </p>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={() => handleNavigate('/dashboard/finanzas')}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Ir a Finanzas
            </Button>
          </CardFooter>
        </Card>

        {/* Productos card disabled - uncomment when module is complete */}
        <Card className="hover:shadow-md transition-shadow opacity-60">
          <CardHeader>
            <div className="rounded-full bg-emerald-50 w-10 h-10 flex items-center justify-center mb-3">
              <ShoppingBag className="h-5 w-5 text-emerald-600" />
            </div>
            <CardTitle className="text-lg">Productos</CardTitle>
            <CardDescription>Administra tu catálogo de productos</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">
              Agrega, edita y organiza tus productos. Controla precios, inventario y categorías.
            </p>
          </CardContent>
          <CardFooter>
            <Button 
              disabled
              className="w-full bg-gray-300 text-gray-600 cursor-not-allowed"
            >
              Próximamente
            </Button>
          </CardFooter>
        </Card>

        {/* Clientes card disabled - uncomment when module is complete */}
        <Card className="hover:shadow-md transition-shadow opacity-60">
          <CardHeader>
            <div className="rounded-full bg-emerald-50 w-10 h-10 flex items-center justify-center mb-3">
              <Users className="h-5 w-5 text-emerald-600" />
            </div>
            <CardTitle className="text-lg">Clientes</CardTitle>
            <CardDescription>Gestiona tu base de clientes</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">
              Administra información de clientes, historial de pedidos y datos de contacto.
            </p>
          </CardContent>
          <CardFooter>
            <Button 
              disabled
              className="w-full bg-gray-300 text-gray-600 cursor-not-allowed"
            >
              Próximamente
            </Button>
          </CardFooter>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="rounded-full bg-emerald-50 w-10 h-10 flex items-center justify-center mb-3">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
            </div>
            <CardTitle className="text-lg">Reportes</CardTitle>
            <CardDescription>Analiza el rendimiento del negocio</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">
              Visualiza reportes de ventas, productos más vendidos y estadísticas de clientes.
            </p>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={() => handleNavigate('/dashboard/reportes')}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Ir a Reportes
            </Button>
          </CardFooter>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="rounded-full bg-emerald-50 w-10 h-10 flex items-center justify-center mb-3">
              <ClipboardList className="h-5 w-5 text-emerald-600" />
            </div>
            <CardTitle className="text-lg">Nueva Cotización</CardTitle>
            <CardDescription>Crea una nueva cotización rápidamente</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">
              Acceso directo para crear una nueva cotización para tus clientes.
            </p>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={() => handleNavigate('/nueva-cotizacion')}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Nueva Cotización
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
} 
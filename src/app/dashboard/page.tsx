"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, ShoppingBag, Users, TrendingUp, ClipboardList, DollarSign } from "lucide-react";
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
  cotizaciones: {
    total: number;
    pendientes: number;
  };
  clientes: {
    total: number;
  };
  productos: {
    total: number;
  };
}

export default function DashboardPage() {
  const { isAuthenticated, isLoading, user } = useAuth0();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    cotizaciones: {
      total: 0,
      pendientes: 0
    },
    clientes: {
      total: 0
    },
    productos: {
      total: 0
    }
  });

  // Log authentication state for debugging
  console.log("Dashboard auth state:", { isAuthenticated, isLoading, user });
  
  useEffect(() => {
    // If not loading and not authenticated, redirect to login
    if (!isLoading && !isAuthenticated) {
      console.log("Not authenticated, redirecting to login");
      router.push("/");
    }
  }, [isLoading, isAuthenticated, router]);
  
  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }
  
  // Render dashboard only if authenticated
  if (!isAuthenticated) {
    return null; // Don't render anything while redirecting
  }

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true);
        
        // Fetch cotizaciones count
        const cotizacionesResponse = await fetch("/api/cotizaciones");
        const cotizacionesData = await cotizacionesResponse.json();
        
        // For now, we'll just count the items
        // In a real app, you would have proper API endpoints for these metrics
        const cotizacionesTotal = cotizacionesData?.cotizaciones?.length || 0;
        const cotizacionesPendientes = cotizacionesData?.cotizaciones?.filter(
          (c: any) => c.estado === 'pendiente'
        )?.length || 0;
        
        // Set metrics data
        setMetrics({
          cotizaciones: {
            total: cotizacionesTotal,
            pendientes: cotizacionesPendientes
          },
          clientes: {
            total: 0 // This would come from a real API
          },
          productos: {
            total: 0 // This would come from a real API
          }
        });
      } catch (error) {
        console.error("Error fetching dashboard metrics:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchMetrics();
  }, []);

  const handleNavigate = (path: string) => {
    router.push(path);
  };

  return (
    <div className="py-8 px-6 sm:px-10 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-2">Bienvenido al sistema de administración</p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Cotizaciones</CardDescription>
            <CardTitle className="text-2xl">{metrics.cotizaciones.total}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-sm text-gray-500">
              {metrics.cotizaciones.pendientes} pendientes
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Clientes</CardDescription>
            <CardTitle className="text-2xl">{metrics.clientes.total}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-sm text-gray-500">
              Clientes registrados
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Productos</CardDescription>
            <CardTitle className="text-2xl">{metrics.productos.total}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-sm text-gray-500">
              Productos en catálogo
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Ventas</CardDescription>
            <CardTitle className="text-2xl">$0.00</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-sm text-gray-500">
              Este mes
            </div>
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
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

  // Run only once on component mount to check cookie and API auth
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // First check for the presence of appSession cookie
        const hasCookie = document.cookie.split(';').some(item => item.trim().startsWith('appSession='));
        console.log("[Dashboard] Session cookie present:", hasCookie);
        
        // Try to get user data from the backend API if cookie exists
        if (hasCookie) {
          try {
            console.log("[Dashboard] Cookie found, verifying with API...");
            const response = await fetch('/api/auth/me', {
              credentials: 'include',
              cache: 'no-store'
            });
            
            if (response.ok) {
              const userData = await response.json();
              console.log("[Dashboard] API verified user:", userData.email);
              setIsAuthorized(true);
            } else {
              console.log("[Dashboard] API could not verify user, cookie may be invalid");
              setIsAuthorized(false);
            }
          } catch (error) {
            console.error("[Dashboard] Error verifying auth with API:", error);
            // If API verification fails, but cookie exists, still allow access (graceful degradation)
            setIsAuthorized(hasCookie);
          }
        } else {
          console.log("[Dashboard] No session cookie found");
          setIsAuthorized(false);
        }
        
        // If user is authenticated via Auth0 SDK, consider them authorized
        if (isAuthenticated && !isLoading) {
          console.log("[Dashboard] User authenticated via Auth0 SDK");
          setIsAuthorized(true);
        }
      } catch (error) {
        console.error("[Dashboard] Error checking auth:", error);
        setIsAuthorized(false);
      }
    };

    // Only run if Auth0 has loaded or we're in SSR
    if (!isLoading) {
      checkAuth();
    } else {
      console.log("[Dashboard] Auth0 still loading, will check auth when ready");
    }
  }, [isAuthenticated, isLoading]);
  
  // Fetch dashboard data when authentication is confirmed
  useEffect(() => {
    if (isAuthorized) {
      console.log("[Dashboard] User is authorized, fetching dashboard data");
      
      const fetchDashboardData = async () => {
        try {
          // Fetch dashboard metrics (simplified version for now)
          setMetrics({
            cotizaciones: 12,
            ingresos: 45000,
            egresos: 32000,
          });
          setLoading(false);
        } catch (error) {
          console.error("[Dashboard] Error fetching dashboard data:", error);
          setLoading(false);
        }
      };
      
      fetchDashboardData();
    } else if (!isLoading && !isAuthorized) {
      // Redirect to login if Auth0 has finished loading and user is not authorized
      console.log("[Dashboard] User not authorized, redirecting to login");
      window.location.href = '/';
    }
  }, [isAuthorized, isLoading]);
  
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
      
      {/* Quick Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Cotizaciones</CardTitle>
            <CardDescription>Gestiona tus cotizaciones</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Button 
              className="w-full" 
              onClick={() => router.push('/dashboard/cotizaciones')}
            >
              Ver cotizaciones
            </Button>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => router.push('/dashboard/cotizaciones/nueva')}
            >
              Nueva cotización
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Finanzas</CardTitle>
            <CardDescription>Gestiona tus finanzas</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full" 
              onClick={() => router.push('/dashboard/finanzas')}
            >
              Ver finanzas
            </Button>
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
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft } from "lucide-react";
import { PDFCotizacion } from "@/components/cotizacion/pdf-cotizacion";
import { ProductosProvider } from "@/contexts/productos-context";
import { ProtectedRoute } from "@/components/protected-route";

interface Cliente {
  cliente_id?: number;
  nombre: string;
  celular: string;
  correo: string | null;
  tipo_cliente: string | null;
  atencion: string | null;
  razon_social?: string | null;
  rfc?: string | null;
  direccion_envio?: string | null;
  recibe?: string | null;
}

interface Cotizacion {
  id: string;
  folio: string;
  moneda: 'MXN' | 'USD';
  subtotal: number;
  subtotal_mxn: number;
  descuento_global: number;
  iva: boolean;
  monto_iva: number;
  incluye_envio: boolean;
  costo_envio: number;
  costo_envio_mxn: number;
  total: number;
  total_mxn: number;
  tipo_cambio: number;
  fecha_creacion: string;
  cliente: Cliente;
  productos: any[];
}

function VerCotizacionPageContent() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [cotizacion, setCotizacion] = useState<Cotizacion | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCotizacion = async () => {
      try {
        setLoading(true);
        const cotizacionId = sessionStorage.getItem('cotizacion_id');
        
        if (!cotizacionId) {
          setError("No se encontró ID de cotización");
          setLoading(false);
          return;
        }
        
        const response = await fetch(`/api/cotizaciones/${cotizacionId}`);
        
        if (!response.ok) {
          throw new Error(`Error al obtener la cotización: ${response.statusText}`);
        }
        
        const data = await response.json();
        if (!data.cotizacion) {
          throw new Error("Formato de respuesta inválido");
        }
        
        setCotizacion(data.cotizacion);
      } catch (error) {
        console.error("Error loading quotation:", error);
        setError("Error al cargar la cotización. Por favor intente nuevamente.");
        toast.error("Error al cargar la cotización");
      } finally {
        setLoading(false);
      }
    };
    
    fetchCotizacion();
  }, []);

  const handleBack = () => {
    router.push("/dashboard/cotizaciones");
  };

  if (loading) {
    return (
      <ProductosProvider>
        <div className="container mx-auto py-10 flex flex-col items-center justify-center min-h-[70vh]">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mb-4" />
          <p className="text-gray-500">Cargando cotización...</p>
        </div>
      </ProductosProvider>
    );
  }

  if (error || !cotizacion) {
    return (
      <ProductosProvider>
        <div className="container mx-auto py-10 flex flex-col items-center justify-center min-h-[70vh]">
          <div className="text-center max-w-md mx-auto">
            <h1 className="text-2xl font-bold text-red-600 mb-2">Error</h1>
            <p className="text-gray-600 mb-6">{error || "No se pudo cargar la cotización"}</p>
            <Button onClick={handleBack} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <span className="whitespace-nowrap">Volver al Dashboard</span>
            </Button>
          </div>
        </div>
      </ProductosProvider>
    );
  }

  return (
    <ProductosProvider>
      <div className="container mx-auto py-6 max-w-6xl">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
          <h1 className="text-2xl font-bold">Cotización {cotizacion.folio}</h1>
          <Button onClick={handleBack} variant="outline" className="w-full sm:w-auto border-emerald-200 text-emerald-700 hover:bg-emerald-50">
            <ArrowLeft className="mr-2 h-4 w-4" />
            <span className="whitespace-nowrap">Volver al Dashboard</span>
          </Button>
        </div>
        
        <PDFCotizacion 
          cliente={cotizacion.cliente} 
          cotizacion={cotizacion}
        />
      </div>
    </ProductosProvider>
  );
}

export default function VerCotizacionPage() {
  return (
    <ProtectedRoute requiredModule="cotizaciones">
      <VerCotizacionPageContent />
    </ProtectedRoute>
  );
} 
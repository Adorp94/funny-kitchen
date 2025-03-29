"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PDFCotizacion } from "@/components/cotizacion/pdf-cotizacion";
import { useProductos } from "@/contexts/productos-context";

interface Cliente {
  cliente_id: number;
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

interface CotizacionData {
  cotizacion_id: number;
  folio: string;
  fecha_creacion: string;
  estado: string;
  moneda: string;
  subtotal: number;
  descuento_global: number;
  iva: boolean;
  monto_iva: number;
  incluye_envio: boolean;
  costo_envio: number;
  total: number;
  fecha_expiracion: string | null;
  tipo_cambio: number | null;
  cliente: Cliente;
  productos: any[];
}

export default function VerCotizacionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [cotizacion, setCotizacion] = useState<CotizacionData | null>(null);
  const { setProductos, setMoneda, setGlobalDiscount, setHasIva, setShippingCost } = useProductos();
  
  useEffect(() => {
    const fetchCotizacion = async () => {
      try {
        // Get cotizacion_id from sessionStorage
        const cotizacionId = sessionStorage.getItem('cotizacion_id');
        
        if (!cotizacionId) {
          // If cotizacion_id is not in sessionStorage, use products and client from context
          const savedCliente = sessionStorage.getItem('cotizacion_cliente');
          if (savedCliente) {
            try {
              const parsedCliente = JSON.parse(savedCliente);
              setCotizacion({
                cotizacion_id: 0,
                folio: sessionStorage.getItem('cotizacion_folio') || `FK-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000)}`,
                fecha_creacion: new Date().toISOString(),
                estado: 'pendiente',
                moneda: sessionStorage.getItem('cotizacion_moneda') || 'MXN',
                subtotal: 0,
                descuento_global: 0,
                iva: false,
                monto_iva: 0,
                incluye_envio: false,
                costo_envio: 0,
                total: 0,
                fecha_expiracion: null,
                tipo_cambio: null,
                cliente: parsedCliente,
                productos: []
              });
              setLoading(false);
            } catch (e) {
              console.error("Error parsing saved client data:", e);
              toast.error("No se pudo cargar la información del cliente");
              router.push('/');
            }
          } else {
            toast.error("No hay información de cotización disponible");
            router.push('/');
          }
          return;
        }
        
        // Fetch cotizacion from API
        const response = await fetch(`/api/cotizaciones/${cotizacionId}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Error al obtener la cotización');
        }
        
        const data = await response.json();
        setCotizacion(data.cotizacion);
        
        // Update context with cotizacion data
        if (data.cotizacion && Array.isArray(data.cotizacion.productos)) {
          setProductos(data.cotizacion.productos);
          setMoneda(data.cotizacion.moneda);
          setGlobalDiscount(data.cotizacion.descuento_global);
          setHasIva(data.cotizacion.iva);
          setShippingCost(data.cotizacion.costo_envio || 0);
          
          // Save client data to sessionStorage
          sessionStorage.setItem('cotizacion_cliente', JSON.stringify(data.cotizacion.cliente));
        } else {
          console.error("Quotation data is missing productos array:", data);
          toast.error("La cotización no contiene productos");
        }
      } catch (error) {
        console.error("Error fetching quotation:", error);
        toast.error(error instanceof Error ? error.message : "Error al cargar la cotización");
      } finally {
        setLoading(false);
      }
    };
    
    fetchCotizacion();
  }, [router, setProductos, setMoneda, setGlobalDiscount, setHasIva, setShippingCost]);
  
  if (loading) {
    return (
      <div className="p-8 text-center">
        <p>Cargando información de la cotización...</p>
      </div>
    );
  }
  
  if (!cotizacion) {
    return (
      <div className="p-8 text-center">
        <p>No se pudo cargar la información de la cotización</p>
        <Button
          variant="outline"
          onClick={() => router.push('/')}
          className="mt-4"
        >
          Volver al inicio
        </Button>
      </div>
    );
  }
  
  return (
    <div className="py-8 px-4 sm:px-6 max-w-7xl mx-auto">
      <div className="mb-6 flex justify-between items-center">
        <Button
          variant="outline"
          onClick={() => router.push('/nueva-cotizacion')}
          className="flex items-center"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Nueva Cotización
        </Button>
        
        <Button
          variant="ghost"
          onClick={() => router.push('/')}
          className="flex items-center"
        >
          <Home className="mr-2 h-4 w-4" />
          Inicio
        </Button>
      </div>
      
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-center mb-2">Vista Previa de Cotización</h1>
        <p className="text-center text-gray-500">
          Cotización {cotizacion.folio} - {new Date(cotizacion.fecha_creacion).toLocaleDateString()}
        </p>
      </div>
      
      <PDFCotizacion 
        cliente={cotizacion.cliente} 
        folio={cotizacion.folio} 
      />
    </div>
  );
} 
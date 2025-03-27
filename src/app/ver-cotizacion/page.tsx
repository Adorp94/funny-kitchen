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
  razon_social: string | null;
  rfc: string | null;
  tipo_cliente: string | null;
  lead: string | null;
  direccion_envio: string | null;
  recibe: string | null;
  atencion: string | null;
}

export default function VerCotizacionPage() {
  const router = useRouter();
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const { productos } = useProductos();
  
  useEffect(() => {
    // Retrieve client data from sessionStorage
    const savedCliente = sessionStorage.getItem('cotizacion_cliente');
    if (savedCliente) {
      try {
        const parsedCliente = JSON.parse(savedCliente);
        setCliente(parsedCliente);
      } catch (e) {
        console.error("Error parsing saved client data:", e);
        toast.error("No se pudo cargar la información del cliente");
        router.push('/');
      }
    } else {
      toast.error("No hay información de cotización disponible");
      router.push('/');
    }
    
    // Check if we have products
    if (productos.length === 0) {
      toast.error("No hay productos en la cotización");
      router.push('/');
    }
  }, [router, productos.length]);
  
  if (!cliente) {
    return (
      <div className="p-8 text-center">
        <p>Cargando información de la cotización...</p>
      </div>
    );
  }
  
  return (
    <div className="py-8 px-4 sm:px-6 max-w-7xl mx-auto">
      <div className="mb-6 flex justify-between items-center">
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="flex items-center"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Regresar
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
          Desde aquí puedes imprimir o descargar tu cotización en formato PDF
        </p>
      </div>
      
      <PDFCotizacion 
        cliente={cliente} 
        folio={`FK-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000)}`} 
      />
    </div>
  );
} 
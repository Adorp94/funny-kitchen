"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import PDFWrapper from "@/components/cotizacion/pdf-wrapper";

export default function PDFViewPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const cotizacionId = params.id as string;
  const shouldDownload = searchParams.get('download') === 'true';
  const [loading, setLoading] = useState(true);
  const [cotizacion, setCotizacion] = useState<any>(null);
  const [cliente, setCliente] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCotizacion() {
      try {
        const response = await fetch(`/api/cotizaciones?id=${cotizacionId}`);
        
        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data.cotizacion) {
          throw new Error("Cotización no encontrada");
        }
        
        setCotizacion(data.cotizacion);
        setCliente(data.cotizacion.cliente);
      } catch (error) {
        console.error("Error fetching cotizacion:", error);
        setError(error instanceof Error ? error.message : "Error al cargar la cotización");
      } finally {
        setLoading(false);
      }
    }
    
    if (cotizacionId) {
      fetchCotizacion();
    }
  }, [cotizacionId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-emerald-500" />
          <p className="text-gray-500">Cargando cotización...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-500 mb-2">{error}</p>
          <p className="text-gray-500">Intente nuevamente más tarde</p>
        </div>
      </div>
    );
  }

  if (!cotizacion || !cliente) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-500 mb-2">Cotización no encontrada</p>
          <p className="text-gray-500">Verifique el ID de la cotización</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="mb-6 flex justify-end">
        <PDFWrapper
          cliente={cliente}
          folio={cotizacion.folio}
          cotizacion={cotizacion}
          autoDownload={shouldDownload}
        />
      </div>
      
      <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-gray-800">Vista previa de la cotización</h1>
          <p className="text-gray-600 mt-2">
            Utilice el botón "Descargar PDF" para generar y descargar la cotización como un PDF.
          </p>
          <p className="text-gray-600">
            El PDF generado incluirá texto seleccionable y enlaces funcionales.
          </p>
        </div>
        
        <div className="flex flex-col items-center justify-center">
          <div className="bg-gray-100 p-6 rounded-lg border border-gray-300 w-full max-w-md">
            <div className="text-center mb-4">
              <h2 className="text-lg font-medium text-gray-800">Información de la cotización</h2>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Folio:</span>
                <span className="font-medium">{cotizacion.folio}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Cliente:</span>
                <span className="font-medium">{cliente.nombre}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Moneda:</span>
                <span className="font-medium">{cotizacion.moneda}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total:</span>
                <span className="font-medium">
                  {new Intl.NumberFormat(cotizacion.moneda === 'MXN' ? 'es-MX' : 'en-US', { 
                    style: 'currency', 
                    currency: cotizacion.moneda || 'MXN' 
                  }).format(cotizacion.total || 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Número de productos:</span>
                <span className="font-medium">{cotizacion.productos?.length || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
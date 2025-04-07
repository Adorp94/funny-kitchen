"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { PDFCotizacion } from "@/components/cotizacion/pdf-cotizacion";
import { Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PDFService } from "@/services/pdf-service";
import { ProductosProvider } from "@/contexts/productos-context";

export default function PDFViewPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const cotizacionId = params.id as string;
  const shouldDownload = searchParams.get('download') === 'true';
  const [loading, setLoading] = useState(true);
  const [cotizacion, setCotizacion] = useState<any>(null);
  const [cliente, setCliente] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const pdfContentRef = useRef<HTMLDivElement>(null);

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

  // Auto-download when shouldDownload is true and data is loaded
  useEffect(() => {
    if (shouldDownload && !loading && !error && cotizacion && cliente && pdfContentRef.current) {
      handleDownloadPDF();
    }
  }, [shouldDownload, loading, error, cotizacion, cliente]);

  // Function to download the PDF
  const handleDownloadPDF = async () => {
    if (!pdfContentRef.current) return;
    
    try {
      setDownloading(true);
      const options = {
        filename: `cotizacion-${cotizacion.folio || cotizacionId}-${new Date().toISOString().split('T')[0]}.pdf`,
        format: 'letter',
        orientation: 'portrait',
        download: true // Force download
      };
      
      await PDFService.generatePDFFromElement(pdfContentRef.current, options);
    } catch (error) {
      console.error("Error downloading PDF:", error);
      alert("No se pudo descargar el PDF. Intente nuevamente.");
    } finally {
      setDownloading(false);
    }
  };

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
      {/* Download button above the PDF */}
      <div className="mb-6 flex justify-end">
        <Button 
          onClick={handleDownloadPDF}
          disabled={downloading}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          {downloading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Descargando...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Descargar PDF
            </>
          )}
        </Button>
      </div>
      
      {/* PDF Content */}
      <div ref={pdfContentRef}>
        <ProductosProvider>
          <PDFCotizacion
            cliente={cliente}
            folio={cotizacion.folio}
            cotizacion={cotizacion}
          />
        </ProductosProvider>
      </div>
    </div>
  );
} 
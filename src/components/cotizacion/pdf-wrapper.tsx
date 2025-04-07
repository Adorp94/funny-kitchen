"use client";

import React, { useState } from 'react';
import { PDFDownloadLink, pdf } from '@react-pdf/renderer';
import ReactPDFDocument from './react-pdf-document';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';

interface Cliente {
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

interface Producto {
  id: string;
  nombre: string;
  cantidad: number;
  precio: number;
  precio_mxn?: number;
  descuento: number;
  subtotal: number;
  subtotal_mxn?: number;
  sku?: string;
  descripcion?: string;
  colores?: string[];
}

interface Cotizacion {
  id?: string;
  folio?: string;
  moneda?: 'MXN' | 'USD';
  subtotal?: number;
  subtotal_mxn?: number;
  descuento_global?: number;
  iva?: boolean;
  monto_iva?: number;
  incluye_envio?: boolean;
  costo_envio?: number;
  costo_envio_mxn?: number;
  total?: number;
  total_mxn?: number;
  tipo_cambio?: number;
  productos?: Producto[];
}

interface PDFWrapperProps {
  cliente: Cliente;
  folio?: string;
  cotizacion: Cotizacion;
  autoDownload?: boolean;
}

const PDFWrapper: React.FC<PDFWrapperProps> = ({ cliente, folio, cotizacion, autoDownload = false }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // Check if we're in client-side environment after component mounts
  React.useEffect(() => {
    setIsClient(true);
    if (autoDownload) {
      handleDirectDownload();
    }
  }, [autoDownload]);

  const handleDirectDownload = async () => {
    try {
      setIsGenerating(true);
      // Generate PDF blob
      const blob = await pdf(
        <ReactPDFDocument 
          cliente={cliente} 
          folio={folio} 
          cotizacion={cotizacion} 
        />
      ).toBlob();
      
      // Create a URL for the blob
      const url = URL.createObjectURL(blob);
      
      // Create a temporary link to trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = `cotizacion-${cotizacion.folio || folio || new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isClient) {
    // Show loading state or placeholder during server-side rendering
    return (
      <Button disabled className="bg-emerald-600 hover:bg-emerald-700 text-white">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Preparando PDF...
      </Button>
    );
  }

  return (
    <div>
      {autoDownload ? (
        <Button 
          onClick={handleDirectDownload}
          disabled={isGenerating}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generando...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Descargar PDF
            </>
          )}
        </Button>
      ) : (
        <PDFDownloadLink
          document={
            <ReactPDFDocument 
              cliente={cliente} 
              folio={folio} 
              cotizacion={cotizacion} 
            />
          }
          fileName={`cotizacion-${cotizacion.folio || folio || new Date().toISOString().split('T')[0]}.pdf`}
          className="inline-block"
        >
          {({ loading, error }) => (
            <Button 
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Descargar PDF
                </>
              )}
            </Button>
          )}
        </PDFDownloadLink>
      )}
    </div>
  );
};

export default PDFWrapper; 
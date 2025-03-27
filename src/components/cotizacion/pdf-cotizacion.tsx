"use client";

import { useRef } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Download, Printer } from "lucide-react";
import { PDFService } from "@/services/pdf-service";
import { useProductos } from "@/contexts/productos-context";

interface Cliente {
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

interface PDFCotizacionProps {
  cliente: Cliente;
  folio?: string;
}

export function PDFCotizacion({ cliente, folio = "TEMP-001" }: PDFCotizacionProps) {
  const pdfRef = useRef<HTMLDivElement>(null);
  const { productos, total, moneda } = useProductos();

  // Get current date formatted
  const fechaActual = format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: es });
  
  // Format currency
  const formatCurrency = (amount: number): string => {
    return moneda === 'MXN' 
      ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount)
      : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  // Handle PDF generation
  const handleGeneratePDF = async () => {
    if (!pdfRef.current) return;
    
    try {
      await PDFService.generatePDFFromElement(pdfRef.current, {
        filename: `cotizacion-${folio}-${format(new Date(), 'dd-MM-yyyy')}.pdf`,
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
    }
  };

  // Handle print
  const handlePrint = () => {
    window.print();
  };

  return (
    <div>
      {/* PDF Controls - these won't be included in the PDF */}
      <div className="mb-4 flex gap-2 print:hidden">
        <Button 
          onClick={handleGeneratePDF} 
          variant="default" 
          className="bg-teal-600 hover:bg-teal-700"
        >
          <Download className="mr-2 h-4 w-4" />
          Descargar PDF
        </Button>
        <Button 
          onClick={handlePrint} 
          variant="outline"
        >
          <Printer className="mr-2 h-4 w-4" />
          Imprimir
        </Button>
      </div>
      
      {/* PDF Content */}
      <div 
        ref={pdfRef} 
        className="bg-white p-8 rounded-lg border border-gray-200 shadow-sm max-w-4xl mx-auto"
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-8 border-b pb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">COTIZACIÓN</h1>
            <p className="text-gray-600">Folio: {folio}</p>
            <p className="text-gray-600">Fecha: {fechaActual}</p>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-bold text-teal-600">Funny Kitchen</h2>
            <p className="text-gray-600">Tel: (123) 456-7890</p>
            <p className="text-gray-600">info@funnykitchen.com</p>
            <p className="text-gray-600">www.funnykitchen.com</p>
          </div>
        </div>
        
        {/* Client Information */}
        <div className="mb-8">
          <h2 className="text-lg font-bold mb-2 text-gray-800">Información del Cliente</h2>
          <div className="bg-gray-50 p-4 rounded-md">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <p><span className="font-semibold">Cliente:</span> {cliente.nombre}</p>
                <p><span className="font-semibold">Teléfono:</span> {cliente.celular}</p>
                {cliente.correo && <p><span className="font-semibold">Correo:</span> {cliente.correo}</p>}
                {cliente.tipo_cliente && <p><span className="font-semibold">Tipo:</span> {cliente.tipo_cliente}</p>}
              </div>
              <div>
                {cliente.razon_social && <p><span className="font-semibold">Razón Social:</span> {cliente.razon_social}</p>}
                {cliente.rfc && <p><span className="font-semibold">RFC:</span> {cliente.rfc}</p>}
                {cliente.atencion && <p><span className="font-semibold">Atención:</span> {cliente.atencion}</p>}
              </div>
            </div>
            {cliente.direccion_envio && (
              <div className="mt-2 pt-2 border-t border-gray-200">
                <p><span className="font-semibold">Dirección de envío:</span> {cliente.direccion_envio}</p>
                {cliente.recibe && <p><span className="font-semibold">Recibe:</span> {cliente.recibe}</p>}
              </div>
            )}
          </div>
        </div>
        
        {/* Products */}
        <div className="mb-8">
          <h2 className="text-lg font-bold mb-2 text-gray-800">Productos</h2>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-200 px-4 py-2 text-left">Descripción</th>
                <th className="border border-gray-200 px-4 py-2 text-center">Cantidad</th>
                <th className="border border-gray-200 px-4 py-2 text-right">Precio Unitario</th>
                <th className="border border-gray-200 px-4 py-2 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {productos.map((producto) => (
                <tr key={producto.id} className="border-b border-gray-200">
                  <td className="border border-gray-200 px-4 py-2">{producto.nombre}</td>
                  <td className="border border-gray-200 px-4 py-2 text-center">{producto.cantidad}</td>
                  <td className="border border-gray-200 px-4 py-2 text-right">{formatCurrency(producto.precio)}</td>
                  <td className="border border-gray-200 px-4 py-2 text-right">{formatCurrency(producto.subtotal)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50">
                <td colSpan={3} className="border border-gray-200 px-4 py-2 text-right font-bold">Total:</td>
                <td className="border border-gray-200 px-4 py-2 text-right font-bold">{formatCurrency(total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        
        {/* Notes */}
        <div className="mb-8">
          <h2 className="text-lg font-bold mb-2 text-gray-800">Notas</h2>
          <div className="bg-gray-50 p-4 rounded-md text-sm text-gray-600">
            <ul className="list-disc pl-5 space-y-1">
              <li>Esta cotización tiene una validez de 30 días a partir de la fecha de emisión.</li>
              <li>Los precios están expresados en {moneda === 'MXN' ? 'Pesos Mexicanos' : 'Dólares Americanos'}.</li>
              <li>Tiempo de entrega: 15-20 días hábiles después de confirmado el pedido.</li>
              <li>Se requiere un 50% de anticipo para iniciar el proyecto.</li>
            </ul>
          </div>
        </div>
        
        {/* Footer */}
        <div className="text-center text-gray-500 text-sm mt-12 pt-6 border-t">
          <p>Gracias por su preferencia</p>
          <p className="mt-1">Funny Kitchen © {new Date().getFullYear()}</p>
        </div>
      </div>
    </div>
  );
} 
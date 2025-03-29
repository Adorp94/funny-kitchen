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
  tipo_cliente: string | null;
  atencion: string | null;
  razon_social?: string | null;
  rfc?: string | null;
  direccion_envio?: string | null;
  recibe?: string | null;
}

interface PDFCotizacionProps {
  cliente: Cliente;
  folio: string;
}

export function PDFCotizacion({ cliente, folio }: PDFCotizacionProps) {
  const pdfRef = useRef<HTMLDivElement>(null);
  const { 
    productos, 
    moneda, 
    subtotal, 
    hasIva, 
    ivaAmount, 
    globalDiscount, 
    total, 
    hasShipping, 
    shippingCost,
    tipoCambio
  } = useProductos();

  // Get current date formatted
  const fechaActual = format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: es });
  
  // Format currency with proper symbol and formatting based on the currency
  const formatCurrency = (amount: number): string => {
    if (moneda === 'MXN') {
      return new Intl.NumberFormat('es-MX', { 
        style: 'currency', 
        currency: 'MXN',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount);
    } else {
      return new Intl.NumberFormat('en-US', { 
        style: 'currency', 
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount);
    }
  };

  // Calculate total discounts from products
  const totalProductDiscounts = productos.reduce((sum, producto) => {
    if (producto.descuento && producto.descuento > 0) {
      const discountAmount = producto.precio * producto.cantidad * (producto.descuento / 100);
      return sum + discountAmount;
    }
    return sum;
  }, 0);

  // Subtotal after product discounts
  const subtotalAfterProductDiscounts = subtotal - totalProductDiscounts;

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
            {tipoCambio && moneda === 'USD' && (
              <p className="text-gray-600">Tipo de cambio: ${tipoCambio} MXN/USD</p>
            )}
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
            <p><span className="font-semibold">Cliente:</span> {cliente.nombre}</p>
            {cliente.razon_social && <p><span className="font-semibold">Razón Social:</span> {cliente.razon_social}</p>}
            {cliente.rfc && <p><span className="font-semibold">RFC:</span> {cliente.rfc}</p>}
            <p><span className="font-semibold">Teléfono:</span> {cliente.celular}</p>
            {cliente.correo && <p><span className="font-semibold">Correo:</span> {cliente.correo}</p>}
            {cliente.atencion && <p><span className="font-semibold">Atención:</span> {cliente.atencion}</p>}
            {cliente.direccion_envio && <p><span className="font-semibold">Dirección de envío:</span> {cliente.direccion_envio}</p>}
            {cliente.recibe && <p><span className="font-semibold">Recibe:</span> {cliente.recibe}</p>}
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
                {productos.some(p => p.descuento && p.descuento > 0) && (
                  <th className="border border-gray-200 px-4 py-2 text-right">Descuento</th>
                )}
                <th className="border border-gray-200 px-4 py-2 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {productos.map((producto) => (
                <tr key={producto.id} className="border-b border-gray-200">
                  <td className="border border-gray-200 px-4 py-2">
                    <div>
                      <div className="font-medium">{producto.nombre}</div>
                      {producto.descripcion && <div className="text-sm text-gray-600">{producto.descripcion}</div>}
                      {producto.sku && <div className="text-xs text-gray-500">SKU: {producto.sku}</div>}
                    </div>
                  </td>
                  <td className="border border-gray-200 px-4 py-2 text-center">{producto.cantidad}</td>
                  <td className="border border-gray-200 px-4 py-2 text-right">{formatCurrency(producto.precio)}</td>
                  {productos.some(p => p.descuento && p.descuento > 0) && (
                    <td className="border border-gray-200 px-4 py-2 text-right">
                      {producto.descuento ? `${producto.descuento}%` : '-'}
                    </td>
                  )}
                  <td className="border border-gray-200 px-4 py-2 text-right">
                    {producto.descuento && producto.descuento > 0 
                      ? <div>
                          <span className="line-through text-gray-500 text-sm mr-2">
                            {formatCurrency(producto.cantidad * producto.precio)}
                          </span>
                          <span>
                            {formatCurrency(producto.cantidad * producto.precio * (1 - producto.descuento/100))}
                          </span>
                        </div>
                      : formatCurrency(producto.cantidad * producto.precio)
                    }
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50">
                <td colSpan={productos.some(p => p.descuento && p.descuento > 0) ? 4 : 3} className="border border-gray-200 px-4 py-2 text-right font-semibold">Subtotal:</td>
                <td className="border border-gray-200 px-4 py-2 text-right">{formatCurrency(subtotal)}</td>
              </tr>
              
              {totalProductDiscounts > 0 && (
                <tr className="bg-gray-50">
                  <td colSpan={productos.some(p => p.descuento && p.descuento > 0) ? 4 : 3} className="border border-gray-200 px-4 py-2 text-right font-semibold">Descuentos por producto:</td>
                  <td className="border border-gray-200 px-4 py-2 text-right text-red-600">-{formatCurrency(totalProductDiscounts)}</td>
                </tr>
              )}
              
              {globalDiscount > 0 && (
                <tr className="bg-gray-50">
                  <td colSpan={productos.some(p => p.descuento && p.descuento > 0) ? 4 : 3} className="border border-gray-200 px-4 py-2 text-right font-semibold">Descuento global ({globalDiscount}%):</td>
                  <td className="border border-gray-200 px-4 py-2 text-right text-red-600">-{formatCurrency((subtotalAfterProductDiscounts) * (globalDiscount / 100))}</td>
                </tr>
              )}
              
              {hasIva && (
                <tr className="bg-gray-50">
                  <td colSpan={productos.some(p => p.descuento && p.descuento > 0) ? 4 : 3} className="border border-gray-200 px-4 py-2 text-right font-semibold">IVA (16%):</td>
                  <td className="border border-gray-200 px-4 py-2 text-right">{formatCurrency(ivaAmount)}</td>
                </tr>
              )}
              
              {hasShipping && shippingCost > 0 && (
                <tr className="bg-gray-50">
                  <td colSpan={productos.some(p => p.descuento && p.descuento > 0) ? 4 : 3} className="border border-gray-200 px-4 py-2 text-right font-semibold">Costo de envío:</td>
                  <td className="border border-gray-200 px-4 py-2 text-right">{formatCurrency(shippingCost)}</td>
                </tr>
              )}
              
              <tr className="bg-gray-100">
                <td colSpan={productos.some(p => p.descuento && p.descuento > 0) ? 4 : 3} className="border border-gray-200 px-4 py-2 text-right font-bold">Total:</td>
                <td className="border border-gray-200 px-4 py-2 text-right font-bold text-lg">{formatCurrency(total)}</td>
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
              {hasIva && <li>Precios incluyen IVA del 16%.</li>}
              {!hasIva && <li>Precios no incluyen IVA.</li>}
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
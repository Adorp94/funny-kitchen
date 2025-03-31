"use client";

import { useRef } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Download, Printer } from "lucide-react";
import { PDFService } from "@/services/pdf-service";
import { useProductos } from "@/contexts/productos-context";
import Image from "next/image";

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

interface PDFCotizacionProps {
  cliente: Cliente;
  folio?: string;
  cotizacion?: Cotizacion;
}

export function PDFCotizacion({ cliente, folio, cotizacion }: PDFCotizacionProps) {
  const pdfRef = useRef<HTMLDivElement>(null);
  const { 
    productos: contextProductos, 
    moneda: contextMoneda, 
    subtotal: contextSubtotal, 
    hasIva: contextHasIva, 
    ivaAmount: contextIvaAmount, 
    globalDiscount: contextGlobalDiscount, 
    total: contextTotal, 
    hasShipping: contextHasShipping, 
    shippingCost: contextShippingCost,
    tipoCambio: contextTipoCambio
  } = useProductos();

  // Use either the passed cotizacion data or context data
  const productos = (cotizacion?.productos || contextProductos) as Producto[];
  const moneda = cotizacion?.moneda || contextMoneda;
  const subtotal = cotizacion?.subtotal || contextSubtotal;
  const hasIva = cotizacion?.iva !== undefined ? cotizacion.iva : contextHasIva;
  const ivaAmount = cotizacion?.monto_iva || contextIvaAmount;
  const globalDiscount = cotizacion?.descuento_global || contextGlobalDiscount;
  const total = cotizacion?.total || contextTotal;
  const hasShipping = cotizacion?.incluye_envio !== undefined ? cotizacion.incluye_envio : contextHasShipping;
  const shippingCost = cotizacion?.costo_envio || contextShippingCost;
  const tipoCambio = cotizacion?.tipo_cambio || contextTipoCambio;
  const displayFolio = cotizacion?.folio || folio;

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
        filename: `cotizacion-${displayFolio}-${format(new Date(), 'dd-MM-yyyy')}.pdf`,
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
        className="bg-white p-8 rounded-lg max-w-4xl mx-auto font-sans text-sm"
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-6 pb-6 border-b border-gray-100">
          <div className="flex-shrink-0">
            <img
              src="/logo.png"
              alt="Funny Kitchen Logo"
              className="h-12 object-contain"
            />
          </div>
          <div className="text-right">
            <h1 className="text-xl font-semibold text-gray-800 mb-1">COTIZACIÓN</h1>
            <p className="text-gray-600">Folio: <span className="font-medium">{displayFolio}</span></p>
            <p className="text-gray-600">Fecha: {fechaActual}</p>
            <p className="text-gray-600">Divisa: <span className="font-medium">{moneda}</span></p>
          </div>
        </div>
        
        {/* Client and Company Information */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Client Information */}
          <div>
            <h2 className="text-xs font-semibold uppercase text-gray-500 mb-2">Cliente</h2>
            <div className="space-y-1 text-sm">
              <p className="font-medium text-gray-900">{cliente.nombre}</p>
              {cliente.razon_social && <p className="text-gray-700">{cliente.razon_social}</p>}
              {cliente.rfc && <p className="text-gray-700">RFC: {cliente.rfc}</p>}
              <p className="text-gray-700">{cliente.celular}</p>
              {cliente.correo && <p className="text-gray-700">{cliente.correo}</p>}
              {cliente.atencion && <p className="text-gray-700">Atención: {cliente.atencion}</p>}
              {cliente.direccion_envio && <p className="text-gray-700">{cliente.direccion_envio}</p>}
              {cliente.recibe && <p className="text-gray-700">Recibe: {cliente.recibe}</p>}
            </div>
          </div>
          
          {/* Company Information */}
          <div className="text-right">
            <h2 className="text-xs font-semibold uppercase text-gray-500 mb-2">Emisor</h2>
            <div className="space-y-1 text-sm">
              <p className="font-medium text-gray-900">Funny Kitchen S.A. de C.V.</p>
              <p className="text-gray-700">AZUCENAS #439 LOS GIRASOLES</p>
              <p className="text-gray-700">ZAPOPAN, JALISCO 45138</p>
              <p className="text-gray-700">(33) 1055 6554</p>
              <p className="text-gray-700">hola@funnykitchen.mx</p>
            </div>
          </div>
        </div>
        
        {/* Products */}
        <div className="mb-6">
          <h2 className="text-xs font-semibold uppercase text-gray-500 mb-2">Productos</h2>
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="py-2 px-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
                <th className="py-2 px-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Cant.</th>
                <th className="py-2 px-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">P. Unitario</th>
                {productos.some(p => p.descuento && p.descuento > 0) && (
                  <th className="py-2 px-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Desc.</th>
                )}
                <th className="py-2 px-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Subtotal</th>
              </tr>
            </thead>
            <tbody className="text-xs">
              {productos.map((producto) => (
                <tr key={producto.id} className="border-b border-gray-100">
                  <td className="py-2 px-2">
                    <div>
                      <p className="font-medium text-gray-800">{producto.nombre}</p>
                      {typeof producto.descripcion === 'string' && producto.descripcion && (
                        <p className="text-xs text-gray-600">{producto.descripcion}</p>
                      )}
                      {typeof producto.sku === 'string' && producto.sku && (
                        <p className="text-xs text-gray-500">SKU: {producto.sku}</p>
                      )}
                    </div>
                  </td>
                  <td className="py-2 px-2 text-center text-gray-800">{producto.cantidad}</td>
                  <td className="py-2 px-2 text-right text-gray-800">{formatCurrency(producto.precio)}</td>
                  {productos.some(p => p.descuento && p.descuento > 0) && (
                    <td className="py-2 px-2 text-right text-gray-800">
                      {producto.descuento ? `${producto.descuento}%` : '-'}
                    </td>
                  )}
                  <td className="py-2 px-2 text-right text-gray-800">
                    {producto.descuento && producto.descuento > 0 
                      ? formatCurrency(producto.cantidad * producto.precio * (1 - producto.descuento/100))
                      : formatCurrency(producto.cantidad * producto.precio)
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Totals */}
        <div className="mb-6 pl-0 pr-0 md:pl-auto md:pr-0 lg:w-1/2 ml-auto">
          <div className="space-y-1 text-right">
            <div className="flex justify-between py-1 text-gray-700">
              <span>Subtotal:</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            
            {totalProductDiscounts > 0 && (
              <div className="flex justify-between py-1 text-gray-700">
                <span>Descuentos por producto:</span>
                <span className="text-red-600">-{formatCurrency(totalProductDiscounts)}</span>
              </div>
            )}
            
            {globalDiscount > 0 && (
              <div className="flex justify-between py-1 text-gray-700">
                <span>Descuento global ({globalDiscount}%):</span>
                <span className="text-red-600">-{formatCurrency((subtotalAfterProductDiscounts) * (globalDiscount / 100))}</span>
              </div>
            )}
            
            {hasIva && (
              <div className="flex justify-between py-1 text-gray-700">
                <span>IVA (16%):</span>
                <span>{formatCurrency(ivaAmount)}</span>
              </div>
            )}
            
            {hasShipping && shippingCost > 0 && (
              <div className="flex justify-between py-1 text-gray-700">
                <span>Costo de envío:</span>
                <span>{formatCurrency(shippingCost)}</span>
              </div>
            )}
            
            <div className="flex justify-between py-2 font-medium text-gray-900 border-t border-gray-200">
              <span>Total:</span>
              <span className="text-base">{formatCurrency(total)}</span>
            </div>
          </div>
        </div>
        
        {/* Notes */}
        <div className="mb-6">
          <h2 className="text-xs font-semibold uppercase text-gray-500 mb-2">Notas</h2>
          <div className="bg-gray-50 p-3 rounded-md text-gray-700 text-xs">
            <ul className="space-y-1 list-none">
              <li>A) Precios sujetos a cambio sin previo aviso.</li>
              <li>B) El servicio será pagado en {moneda === 'MXN' ? 'pesos mexicanos' : 'dólares americanos'}.</li>
              <li>C) Fecha de la cotización: 18/03/2025</li>
              <li>D) Tiempo de Envío estimado: 6 semanas</li>
            </ul>
          </div>
        </div>
        
        {/* Terms and Payment Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Terms */}
          <div>
            <h2 className="text-xs font-semibold uppercase text-gray-500 mb-2">Términos y cuidados</h2>
            <div className="text-xs text-gray-700 space-y-1">
              <p>Términos completos: <a href="https://funnykitchen.mx/pages/terminos-y-condiciones" className="text-teal-600 hover:underline">funnykitchen.mx/pages/terminos-y-condiciones</a></p>
              <div className="bg-gray-50 p-3 rounded-md mt-2">
                <p className="font-medium mb-1">CUIDADOS:</p>
                <p>TODAS LAS PIEZAS SON A PRUEBA DE MICROONDAS Y LAVAVAJILLA. NO APILAR PIEZAS MOJADAS, PODRÍAN DAÑAR ESMALTE.</p>
                <p className="mt-1">TODAS LAS PIEZAS SON ARTESANALES, POR LO TANTO NO EXISTE NINGUNA PIEZA IDÉNTICA Y TODAS ELLAS PUEDEN TENER VARIACIÓN DE TAMAÑO, FORMA Y COLOR.</p>
              </div>
            </div>
          </div>
          
          {/* Payment Info */}
          <div>
            <h2 className="text-xs font-semibold uppercase text-gray-500 mb-2 text-right">Datos bancarios</h2>
            <div className="text-xs text-gray-700 bg-gray-50 p-3 rounded-md">
              {moneda === 'MXN' ? (
                <div className="space-y-1">
                  <p className="font-medium">BBVA</p>
                  <p>FUNNY KITCHEN S.A. DE C.V</p>
                  <p>CUENTA: 012 244 0415</p>
                  <p>CLABE: 012 320 00122440415 9</p>
                  <p className="mt-1 font-medium">ACEPTAMOS TODAS LAS TARJETAS DE CRÉDITO.</p>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="font-medium">LEAD BANK</p>
                  <p>PABLO ANAYA</p>
                  <p>210319511130</p>
                  <p>ABA 101019644</p>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Signature */}
        <div className="border-t border-gray-100 pt-4">
          <div className="text-xs text-gray-700">
            <p className="font-medium mb-1">ATENTAMENTE:</p>
            <div className="flex justify-between">
              <div>
                <p>PABLO ANAYA - DIRECTOR GENERAL</p>
                <p>pablo@funnykitchen.mx</p>
                <p>(33) 1055 6554</p>
              </div>
              <div className="text-right">
                <p>HTTPS://FUNNYKITCHEN.MX</p>
                <p>AZUCENAS #439 LOS GIRASOLES.</p>
                <p>ZAPOPAN, JALISCO 45138</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
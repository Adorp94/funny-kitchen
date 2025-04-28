"use client";

import { useRef } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Printer } from "lucide-react";
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
  tiempo_estimado?: number;
  productos?: Producto[];
}

interface PDFCotizacionProps {
  cliente: Cliente;
  folio?: string;
  cotizacion?: Cotizacion;
}

// Add function to detect mobile devices
const isMobileDevice = () => {
  return (
    typeof window !== 'undefined' && 
    (window.innerWidth <= 768 || 
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent))
  );
};

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

  // Handle print
  const handlePrint = () => {
    window.print();
  };

  return (
    <div>
      {/* PDF Content */}
      <div 
        ref={pdfRef} 
        className="bg-white p-6 sm:p-8 rounded-lg max-w-[215.9mm] mx-auto font-sans text-sm shadow-xs border border-gray-200 print:shadow-none print:border-0 print:p-4 print:max-w-full flex flex-col"
        style={{ 
          minHeight: '279.4mm',
          /* Fix for Firefox's print handling */
          printColorAdjust: 'exact',
          WebkitPrintColorAdjust: 'exact'
        }}
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-4 pb-4 border-b border-gray-200">
          <div className="shrink-0">
            <img
              src="/logo.png"
              alt="Funny Kitchen Logo"
              className="h-14 object-contain"
            />
          </div>
          <div className="text-right leading-none">
            <h1 className="text-xl font-semibold text-gray-800">COTIZACIÓN</h1>
            <p className="text-gray-600 mt-0.5">Folio: <span className="font-medium">{displayFolio}</span></p>
            <p className="text-gray-600">Fecha: {fechaActual}</p>
            <p className="text-gray-600">Divisa: <span className="font-medium">{moneda}</span></p>
          </div>
        </div>
        
        {/* Client and Company Information */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Client Information */}
          <div>
            <h2 className="text-xs font-semibold uppercase text-gray-500 mb-1">Cliente</h2>
            <div className="leading-tight">
              <p className="font-medium text-gray-900">{cliente.nombre}</p>
              {cliente.razon_social && <p className="text-gray-700 text-xs">{cliente.razon_social}</p>}
              {cliente.rfc && <p className="text-gray-700 text-xs">RFC: {cliente.rfc}</p>}
              <p className="text-gray-700 text-xs">{cliente.celular}</p>
              {cliente.correo && <p className="text-gray-700 text-xs">{cliente.correo}</p>}
              {cliente.atencion && <p className="text-gray-700 text-xs">Atención: {cliente.atencion}</p>}
              {cliente.direccion_envio && <p className="text-gray-700 text-xs">{cliente.direccion_envio}</p>}
              {cliente.recibe && <p className="text-gray-700 text-xs">Recibe: {cliente.recibe}</p>}
            </div>
          </div>
          
          {/* Company Information */}
          <div className="text-right">
            <h2 className="text-xs font-semibold uppercase text-gray-500 mb-1">Emisor</h2>
            <div className="leading-tight">
              <p className="font-medium text-gray-900">Funny Kitchen S.A. de C.V.</p>
              <p className="text-gray-700 text-xs">Cmo. al Alemán, 45200 Nextipac, Jal.</p>
              <p className="text-gray-700 text-xs">Int 14, Elite Nextipac I Industrial.</p>
              <p className="text-gray-700 text-xs">(33) 1055 6554</p>
              <p className="text-gray-700 text-xs">hola@funnykitchen.mx</p>
            </div>
          </div>
        </div>
        
        {/* Products */}
        <div className="mb-4">
          <h2 className="text-xs font-semibold uppercase text-gray-500 mb-1">Productos</h2>
          <div className="overflow-x-auto bg-white rounded-lg border border-gray-100">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50">
                  <th className="py-2 px-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-5/12 border-b border-gray-200 pb-2.5">Descripción</th>
                  <th className="py-2 px-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-1/12 border-b border-gray-200 pb-2.5">Cant.</th>
                  <th className="py-2 px-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-2/12 border-b border-gray-200 pb-2.5">P. Unitario</th>
                  {productos.some(p => p.descuento && p.descuento > 0) && (
                    <th className="py-2 px-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-1/12 border-b border-gray-200 pb-2.5">Desc.</th>
                  )}
                  <th className="py-2 px-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-3/12 border-b border-gray-200 pb-2.5">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {productos.map((producto) => (
                  <tr key={producto.id}>
                    <td className="py-1.5 px-2">
                      <div className="leading-tight">
                        <p className="font-medium text-gray-800">{producto.nombre}</p>
                        {typeof producto.descripcion === 'string' && producto.descripcion && (
                          <p className="text-xs text-gray-600">{producto.descripcion}</p>
                        )}
                        {typeof producto.sku === 'string' && producto.sku && (
                          <p className="text-xs text-gray-500">SKU: {producto.sku}</p>
                        )}
                      </div>
                    </td>
                    <td className="py-1.5 px-2 text-center text-gray-800">{producto.cantidad}</td>
                    <td className="py-1.5 px-2 text-right text-gray-800 whitespace-nowrap">{formatCurrency(producto.precio)}</td>
                    {productos.some(p => p.descuento && p.descuento > 0) && (
                      <td className="py-1.5 px-2 text-right text-gray-800">
                        {producto.descuento ? `${producto.descuento}%` : '-'}
                      </td>
                    )}
                    <td className="py-1.5 px-2 text-right text-gray-800 whitespace-nowrap">
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
        </div>
        
        {/* Resumen - Full width */}
        <div className="mb-4">
          <h2 className="text-xs font-semibold uppercase text-gray-500 mb-1 text-right">Resumen</h2>
          <div className="text-right text-xs leading-tight bg-gray-50 p-3 rounded-lg shadow-xs w-1/2 ml-auto">
            <div className="flex justify-between py-0.5 text-gray-700">
              <span>Subtotal:</span>
              <span className="font-medium">{formatCurrency(subtotal)}</span>
            </div>
            
            {totalProductDiscounts > 0 && (
              <div className="flex justify-between py-0.5 text-gray-700">
                <span>Descuentos por producto:</span>
                <span className="font-medium text-red-600">-{formatCurrency(totalProductDiscounts)}</span>
              </div>
            )}
            
            {globalDiscount > 0 && (
              <div className="flex justify-between py-0.5 text-gray-700">
                <span>Descuento global ({globalDiscount}%):</span>
                <span className="font-medium text-red-600">-{formatCurrency((subtotalAfterProductDiscounts) * (globalDiscount / 100))}</span>
              </div>
            )}
            
            {hasIva && (
              <div className="flex justify-between py-0.5 text-gray-700">
                <span>IVA (16%):</span>
                <span className="font-medium">{formatCurrency(ivaAmount)}</span>
              </div>
            )}
            
            {hasShipping && shippingCost > 0 && (
              <div className="flex justify-between py-0.5 text-gray-700">
                <span>Costo de envío:</span>
                <span className="font-medium">{formatCurrency(shippingCost)}</span>
              </div>
            )}
            
            <div className="flex justify-between py-1 text-gray-900 border-t border-gray-200 mt-1">
              <span className="font-medium">Total:</span>
              <span className="font-bold text-base">{formatCurrency(total)}</span>
            </div>
          </div>
        </div>
        
        {/* Datos Bancarios - Full width, moved below Resumen */}
        <div className="mb-4">
          <h2 className="text-xs font-semibold uppercase text-gray-500 mb-1">Datos bancarios</h2>
          <div className="text-xs text-gray-700 bg-gray-50 p-3 rounded-lg leading-tight shadow-xs">
            {moneda === 'MXN' ? (
              <div className="space-y-1">
                <p className="font-medium">BBVA</p>
                <p>FUNNY KITCHEN S.A. DE C.V</p>
                <p>CUENTA: 012 244 0415</p>
                <p>CLABE: 012 320 00122440415 9</p>
                <p className="mt-1.5 font-medium">ACEPTAMOS TODAS LAS TARJETAS DE CRÉDITO.</p>
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
        
        {/* Spacer to push content to bottom */}
        <div className="grow"></div>
        
        {/* Notas y Términos - Combined and positioned at bottom */}
        <div className="mb-4">
          <h2 className="text-xs font-semibold uppercase text-gray-500 mb-1">Notas y términos</h2>
          <div className="bg-gray-50 p-3 rounded-lg text-gray-700 text-xs leading-tight shadow-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <p className="font-medium mb-1">NOTAS:</p>
                <ul className="space-y-0.5 list-none">
                  <li>• Precios sujetos a cambio sin previo aviso.</li>
                  <li>• El servicio será pagado en {moneda === 'MXN' ? 'pesos mexicanos' : 'dólares americanos'}.</li>
                  <li>• Fecha de la cotización: {fechaActual}</li>
                  <li>• Tiempo de Entrega estimado: {cotizacion?.tiempo_estimado || 6} semanas después de la confirmación de pago.</li>
                </ul>
              </div>
              
              <div>
                <p className="font-medium mb-1">TÉRMINOS Y CUIDADOS:</p>
                <p className="mb-0.5">TODAS LAS PIEZAS SON A PRUEBA DE MICROONDAS Y LAVAVAJILLA. NO APILAR PIEZAS MOJADAS, PODRÍAN DAÑAR ESMALTE.</p>
                <p className="mb-1">TODAS LAS PIEZAS SON ARTESANALES, POR LO TANTO NO EXISTE NINGUNA PIEZA IDÉNTICA Y TODAS ELLAS PUEDEN TENER VARIACIÓN DE TAMAÑO, FORMA Y COLOR.</p>
                <p>Términos completos: <a 
                  href="https://funnykitchen.mx/pages/terminos-y-condiciones" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-teal-600 underline font-medium"
                >
                  funnykitchen.mx/terminos-y-condiciones
                </a></p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer with signature */}
        <div className="border-t border-gray-200 pt-3 mt-1 text-xs">
          <div className="text-xs text-gray-700 leading-tight">
            <p className="font-medium mb-1">ATENTAMENTE:</p>
            <div className="flex justify-between">
              <div>
                <p>PABLO ANAYA - DIRECTOR GENERAL</p>
                <p>pablo@funnykitchen.mx</p>
                <p>(33) 1055 6554</p>
              </div>
              <div className="text-right">
                <p>HTTPS://FUNNYKITCHEN.MX</p>
                <p>Cmo. al Alemán, 45200 Nextipac, Jal.</p>
                <p>Int 14, Elite Nextipac I Industrial.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
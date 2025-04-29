"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, FileText, DollarSign } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { formatDate, formatCurrency } from "@/lib/utils";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { Badge } from "@/components/ui/badge";
import { CotizacionStatusModal } from "@/components/cotizacion/cotizacion-status-modal";
import { getCotizacionDetails, updateCotizacionStatus } from "@/app/actions/cotizacion-actions";

interface PaymentFormData {
  monto: number;
  metodo_pago: string;
  porcentaje: number;
  notas: string;
}

export default function CotizacionDetailPage() {
  const params = useParams();
  const router = useRouter();
  
  const [cotizacion, setCotizacion] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const cotizacionId = typeof params.id === "string" ? parseInt(params.id, 10) : 0;
  
  useEffect(() => {
    if (cotizacionId) {
      fetchCotizacion();
    }
  }, [cotizacionId]);
  
  const fetchCotizacion = async () => {
    try {
      setIsLoading(true);
      
      const result = await getCotizacionDetails(cotizacionId);
      
      if (result.success) {
        setCotizacion(result.data);
      } else {
        throw new Error(result.error || "No se pudo cargar la cotización");
      }
    } catch (error) {
      console.error("Error fetching cotizacion:", error);
      toast("No se pudo cargar la cotización", {
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleStatusChange = async (
    cotizacionId: number, 
    newStatus: string, 
    paymentData?: PaymentFormData
  ) => {
    try {
      const result = await updateCotizacionStatus(cotizacionId, newStatus, paymentData);
      
      if (result.success) {
        // Refresh the data
        fetchCotizacion();
        return true;
      } else {
        toast(result.error || "No se pudo actualizar el estado", {
          variant: "destructive",
        });
        return false;
      }
    } catch (error) {
      toast(error instanceof Error ? error.message : "Error al actualizar el estado", {
        variant: "destructive",
      });
      return false;
    }
  };
  
  const getStatusBadge = (estado: string) => {
    switch (estado?.toLowerCase()) {
      case 'pendiente':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Pendiente</Badge>;
      case 'aprobada':
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Aprobada</Badge>;
      case 'rechazada':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Rechazada</Badge>;
      case 'cerrada':
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Cerrada</Badge>;
      case 'vencida':
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Vencida</Badge>;
      default:
        return <Badge variant="outline">{estado ? estado.charAt(0).toUpperCase() + estado.slice(1) : 'No definido'}</Badge>;
    }
  };
  
  if (isLoading) {
    return (
      <div className="container mx-auto py-8 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!cotizacion) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center p-8 bg-gray-50 rounded-lg border border-gray-200">
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">Cotización no encontrada</h2>
          <p className="text-gray-600 mb-4">La cotización que buscas no existe o ha sido eliminada</p>
          <Link href="/dashboard/cotizaciones">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver a cotizaciones
            </Button>
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <div className="py-6 px-4 sm:py-8 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/cotizaciones" className="rounded-full bg-white shadow-sm border border-gray-100 p-2 hover:bg-gray-50 transition-colors shrink-0">
            <ArrowLeft className="h-4 w-4 text-gray-600" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 truncate">{cotizacion.folio || `Cotización #${cotizacion.cotizacion_id}`}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <p className="text-sm text-gray-500">{formatDate(cotizacion.fecha_creacion || cotizacion.fecha_cotizacion)}</p>
              <span className="text-gray-300 hidden sm:inline">•</span>
              {getStatusBadge(cotizacion.estado)}
            </div>
          </div>
        </div>
        
        <Button 
          onClick={() => setIsModalOpen(true)}
          className="bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white border-0 shadow-sm w-full sm:w-auto"
        >
          <FileText className="mr-2 h-4 w-4" />
          Cambiar Estado
        </Button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
        {/* Client information */}
        <div className="bg-white rounded-full border border-gray-100 shadow-sm overflow-hidden">
          <div className="bg-linear-to-r from-gray-50 to-white px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100">
            <h2 className="text-base sm:text-lg font-medium text-gray-900">Información del Cliente</h2>
          </div>
          <div className="p-4 sm:p-6">
            {cotizacion.cliente ? (
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-1">Nombre</p>
                  <p className="font-medium text-gray-800 break-words">{cotizacion.cliente.nombre}</p>
                </div>
                
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-1">Teléfono</p>
                  <p className="font-medium text-gray-800">{cotizacion.cliente.celular}</p>
                </div>
                
                {cotizacion.cliente.correo && (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-1">Correo</p>
                    <p className="font-medium text-gray-800 break-words">{cotizacion.cliente.correo}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500">No se encontró información del cliente</p>
            )}
          </div>
        </div>
        
        {/* Cotizacion details */}
        <div className="bg-white rounded-full border border-gray-100 shadow-sm overflow-hidden">
          <div className="bg-linear-to-r from-gray-50 to-white px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100">
            <h2 className="text-base sm:text-lg font-medium text-gray-900">Detalles de la Cotización</h2>
          </div>
          <div className="p-4 sm:p-6">
            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-1">Fecha</p>
                <p className="font-medium text-gray-800">{formatDate(cotizacion.fecha_creacion || cotizacion.fecha_cotizacion)}</p>
              </div>
              
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-1">Moneda</p>
                <p className="font-medium text-gray-800">{cotizacion.moneda || 'MXN'}</p>
              </div>
              
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-1">Tiempo de Entrega</p>
                <p className="font-medium text-gray-800">{cotizacion.tiempo_estimado || 'No especificado'}</p>
              </div>
              
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-1">Estado de Pago</p>
                <div className="font-medium text-gray-800">
                  {cotizacion.estatus_pago === 'anticipo' ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                      Con anticipo
                    </span>
                  ) : cotizacion.estatus_pago === 'pagado' ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                      Pagado
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700">
                      Pendiente
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Financial summary */}
        <div className="bg-white rounded-full border border-gray-100 shadow-sm overflow-hidden">
          <div className="bg-linear-to-r from-gray-50 to-white px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100">
            <h2 className="text-base sm:text-lg font-medium text-gray-900">Resumen Financiero</h2>
          </div>
          <div className="p-4 sm:p-6">
            <div className="space-y-3 sm:space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium text-gray-800">
                  {formatCurrency(
                    (cotizacion.subtotal || cotizacion.precio_total || 0) - 
                    (cotizacion.monto_iva || cotizacion.iva || 0) - 
                    (cotizacion.costo_envio || cotizacion.envio || 0), 
                    cotizacion.moneda
                  )}
                </span>
              </div>
              
              {(cotizacion.descuento_global || cotizacion.descuento_total) > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Descuento</span>
                  <span className="font-medium text-red-600">
                    -{formatCurrency(cotizacion.descuento_global || cotizacion.descuento_total || 0, cotizacion.moneda)}
                  </span>
                </div>
              )}
              
              {(cotizacion.monto_iva || cotizacion.iva) > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">IVA (16%)</span>
                  <span className="font-medium text-gray-800">
                    {formatCurrency(cotizacion.monto_iva || cotizacion.iva || 0, cotizacion.moneda)}
                  </span>
                </div>
              )}
              
              {(cotizacion.costo_envio || cotizacion.envio) > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Envío</span>
                  <span className="font-medium text-gray-800">
                    {formatCurrency(cotizacion.costo_envio || cotizacion.envio || 0, cotizacion.moneda)}
                  </span>
                </div>
              )}
              
              <div className="border-t border-gray-100 my-2 pt-2"></div>
              
              <div className="flex justify-between items-center font-bold">
                <span className="text-gray-900">Total</span>
                <span className="text-emerald-600">
                  {formatCurrency(cotizacion.total || cotizacion.precio_total || 0, cotizacion.moneda)}
                </span>
              </div>
              
              {/* Show advance payment information if available */}
              {cotizacion.pagos && cotizacion.pagos.length > 0 && (
                <>
                  <div className="border-t border-gray-100 my-2 pt-2"></div>
                  <div>
                    <h3 className="font-medium text-gray-800 mb-3 flex items-center">
                      <DollarSign className="h-4 w-4 mr-1 text-blue-600" />
                      Anticipo Recibido
                    </h3>
                    <div className="bg-blue-50 p-4 rounded-full">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-blue-700 font-medium mb-1">Monto</p>
                          <p className="font-medium text-blue-900">{formatCurrency(cotizacion.pagos[0].monto, cotizacion.pagos[0].moneda)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-blue-700 font-medium mb-1">Fecha</p>
                          <p className="font-medium text-blue-900">{formatDate(cotizacion.pagos[0].fecha_pago)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-blue-700 font-medium mb-1">Método</p>
                          <p className="font-medium text-blue-900 capitalize">{cotizacion.pagos[0].metodo_pago}</p>
                        </div>
                        {cotizacion.pagos[0].porcentaje && (
                          <div>
                            <p className="text-xs text-blue-700 font-medium mb-1">Porcentaje</p>
                            <p className="font-medium text-blue-900">{cotizacion.pagos[0].porcentaje}%</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Products section */}
      <div className="bg-white rounded-full border border-gray-100 shadow-sm overflow-hidden mb-6 sm:mb-8">
        <div className="bg-linear-to-r from-gray-50 to-white px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100">
          <h2 className="text-base sm:text-lg font-medium text-gray-900">Productos</h2>
        </div>
        <div className="overflow-x-auto">
          {cotizacion.productos && cotizacion.productos.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Producto
                  </th>
                  <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cantidad
                  </th>
                  <th scope="col" className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Precio
                  </th>
                  <th scope="col" className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Subtotal
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {cotizacion.productos.map((producto: any, index: number) => (
                  <tr key={producto.id || index} className="hover:bg-gray-50">
                    <td className="px-4 sm:px-6 py-3 text-sm text-gray-900">
                      <div className="font-medium truncate max-w-[150px] sm:max-w-[200px] md:max-w-[300px]">
                        {producto.nombre}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-600 text-center">
                      {producto.cantidad}
                    </td>
                    <td className="px-4 sm:px-6 py-3 text-sm text-gray-600 text-right whitespace-nowrap">
                      {formatCurrency(
                        producto.precio_unitario || 
                        (producto.precio ? producto.precio : 0), 
                        cotizacion.moneda
                      )}
                    </td>
                    <td className="px-4 sm:px-6 py-3 text-sm font-medium text-gray-900 text-right whitespace-nowrap">
                      {formatCurrency(
                        producto.subtotal || 
                        producto.precio_total || 
                        (producto.cantidad * (producto.precio_unitario || (producto.precio ? producto.precio : 0))), 
                        cotizacion.moneda
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-4 sm:p-6 text-center text-gray-500">
              No hay productos registrados para esta cotización
            </div>
          )}
        </div>
      </div>
      
      {/* Payment history */}
      {cotizacion.pagos && cotizacion.pagos.length > 0 && (
        <div className="bg-white rounded-full border border-gray-100 shadow-sm overflow-hidden">
          <div className="bg-linear-to-r from-gray-50 to-white px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100">
            <h2 className="text-base sm:text-lg font-medium text-gray-900">Historial de Pagos</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th scope="col" className="px-4 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Método
                  </th>
                  <th scope="col" className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Monto
                  </th>
                  <th scope="col" className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    % del Total
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {cotizacion.pagos.map((pago: any, index: number) => (
                  <tr key={pago.pago_id || index} className="hover:bg-gray-50">
                    <td className="px-4 sm:px-6 py-3 text-sm text-gray-900 whitespace-nowrap">
                      {formatDate(pago.fecha_pago)}
                    </td>
                    <td className="px-4 sm:px-6 py-3 text-sm text-center">
                      <span className="capitalize inline-flex items-center">
                        {pago.metodo_pago === 'transferencia' ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                            Transferencia
                          </span>
                        ) : pago.metodo_pago === 'efectivo' ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
                            Efectivo
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-50 text-gray-700">
                            {pago.metodo_pago}
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-3 text-sm font-medium text-gray-900 text-right whitespace-nowrap">
                      {formatCurrency(pago.monto, pago.moneda || cotizacion.moneda)}
                    </td>
                    <td className="px-4 sm:px-6 py-3 text-sm font-medium text-gray-900 text-right">
                      {pago.porcentaje ? `${pago.porcentaje}%` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      <CotizacionStatusModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        cotizacion={cotizacion}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
} 